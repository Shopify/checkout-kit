# frozen_string_literal: true

require "pathname"
require "yaml"
require_relative "../../scripts/lib/changed_file_filters"

# Transforms the compact E2E matrix in config/matrix.yml into the BrowserStack
# run plan consumed by the parallel Bitrise execution workflow.
#
# Unlike GitHub Actions, Bitrise has no built-in matrix/strategy support, so we
# do the fan-out ourselves: `expand` produces the JSON list of runs, and Bitrise
# parallelizes over it via `run_at`/`count`.
#
# Today the numbers make the config and the expansion look equivalent -
# 2 applications + 1 os_version_tag + 1 suite, and 2 * 1 * 1 = 2 runs - so it can look
# like a plain YAML-to-JSON copy. The point is the multiplication, not the copy:
# adding a single os_version_tag (e.g. a minimum-supported OS) transparently duplicates
# every application x suite across that OS, turning an additive config change into
# a multiplicative set of runs without hand-writing each one.
class E2EMatrixToBrowserStackRunPlan
  attr_reader :config_path, :changed_files

  def self.load(config_path, changed_files: nil)
    new(config_path, YAML.safe_load_file(config_path, aliases: true), changed_files: changed_files)
  end

  def initialize(config_path, config, changed_files: nil)
    @config_path = config_path
    @config = config || {}
    @changed_files = changed_files&.map(&:to_s)
  end

  def expand
    ensure_valid!
    selected_applications.flat_map do |application|
      os_version_tags.flat_map do |os_version_tag|
        suites.map do |suite|
          build_run(application, os_version_tag, suite)
        end
      end
    end
  end

  def run_at(index)
    runs = expand
    unless index.is_a?(Integer) && index >= 0 && index < runs.length
      raise IndexError, "index #{index} outside of run range 0...#{runs.length}"
    end

    runs.fetch(index)
  end

  def count
    expand.length
  end

  def selected_applications
    return applications if changed_files.nil?

    applications.select { |application| application_matches_changed_files?(application) }
  end

  def bitrise_env
    ensure_valid!
    selected_ids = selected_applications.map { |application| application.fetch("id") }
    env = {
      "E2E_BROWSERSTACK_RUN_PLAN_COUNT" => count.to_s,
      "E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT" => [count, 1].max.to_s,
      "E2E_HAS_E2E_RUNS" => count.positive?.to_s
    }
    applications.each do |application|
      env[build_env_key(application.fetch("id"))] = selected_ids.include?(application.fetch("id")).to_s
    end
    env
  end

  def validation_errors
    errors = []
    errors << "version must be 1" unless @config.fetch("version", nil) == 1
    validate_collection(errors, "applications", applications)
    validate_collection(errors, "os_version_tags", os_version_tags)
    validate_collection(errors, "suites", suites)
    validate_changed_file_filters(errors)
    validate_applications(errors)
    validate_os_version_tags(errors)
    validate_suites(errors)
    errors
  end

  def ensure_valid!
    errors = validation_errors
    raise "E2E matrix is invalid:\n#{errors.join("\n")}" unless errors.empty?
  end

  private

  def build_run(application, os_version_tag, suite)
    platform = application.fetch("platform")
    os_version_tag_id = os_version_tag_id(os_version_tag)
    suite_id = suite.fetch("id")
    application_id = application.fetch("id")

    run = {
      "id" => "#{application_id}-#{os_version_tag_id}-#{suite_id}",
      "application_id" => application_id,
      "target" => application.fetch("target"),
      "platform" => platform,
      "os_version_tag" => os_version_tag_id,
      "device_selector" => device_selector(platform, os_version_tag),
      "app_id" => application.fetch("app_id"),
      "artifact_env" => application.fetch("artifact_env"),
      "execute" => suite.fetch("execute"),
      "ready_marker" => application.fetch("ready_marker"),
      "status_context" => "checkout-kit/e2e/#{application_id}/#{os_version_tag_id}/#{suite_id}"
    }
    run["network_profile"] = suite.fetch("network_profile") if suite.key?("network_profile")
    if suite.key?("network_profile_after_session_seconds")
      run["network_profile_after_session_seconds"] = suite.fetch("network_profile_after_session_seconds")
    end
    run
  end

  def application_matches_changed_files?(application)
    filter_names = application_changed_file_filter_names(application)
    return true if filter_names.empty?

    changed_file_filters.match?(filter_names, changed_files)
  end

  def application_changed_file_filter_names(application)
    filters = application.fetch("changed_files_filters", nil)
    return filters if filters

    filter = application.fetch("changed_files_filter", "")
    filter.empty? ? [] : [filter]
  end

  def build_env_key(application_id)
    "E2E_BUILD_#{application_id.upcase.gsub(/[^A-Z0-9]+/, "_")}"
  end

  def device_selector(platform, os_version_tag)
    return os_version_tag.fetch("device_selector") if os_version_tag.is_a?(Hash) && os_version_tag.key?("device_selector")

    "#{platform}:phone:#{os_version_tag_id(os_version_tag)}"
  end

  def os_version_tag_id(os_version_tag)
    os_version_tag.is_a?(Hash) ? os_version_tag.fetch("id") : os_version_tag
  end

  def applications
    @config.fetch("applications", []) || []
  end

  def changed_file_filters
    @changed_file_filters ||= ChangedFileFilters.load(changed_file_filters_path)
  end

  def changed_file_filters_path
    path = @config.fetch("changed_file_filters", nil)
    return nil if path.to_s.empty?
    return path if Pathname.new(path).absolute?

    File.expand_path(path, repo_root)
  end

  def repo_root
    File.expand_path("..", e2e_root)
  end

  def os_version_tags
    @config.fetch("os_version_tags", []) || []
  end

  def suites
    @config.fetch("suites", []) || []
  end

  def validate_collection(errors, name, collection)
    errors << "#{name} must be a non-empty array" unless collection.is_a?(Array) && !collection.empty?
  end

  def validate_changed_file_filters(errors)
    if changed_file_filters_path.nil?
      errors << "changed_file_filters must point to a shared filter file"
      return
    end

    unless File.exist?(changed_file_filters_path)
      errors << "changed_file_filters file does not exist: #{changed_file_filters_path}"
      return
    end

    errors.concat(changed_file_filters.validation_errors)
  rescue Psych::Exception => error
    errors << "changed_file_filters could not be parsed: #{error.message}"
  end

  def validate_applications(errors)
    return unless applications.is_a?(Array)

    validate_unique_ids(errors, "application", applications)
    applications.each do |application|
      id = application.fetch("id", "<missing>")
      required_application_keys.each do |key|
        errors << "application #{id} missing #{key}" if application.fetch(key, "").to_s.empty?
      end
      validate_application_changed_files_filters(errors, application)
      platform = application.fetch("platform", nil)
      errors << "application #{id} platform must be ios or android" unless ["ios", "android"].include?(platform)
    end
  end

  def validate_application_changed_files_filters(errors, application)
    id = application.fetch("id", "<missing>")
    filter_names = application_changed_file_filter_names(application)
    if filter_names.empty?
      errors << "application #{id} missing changed_files_filters"
      return
    end

    unless filter_names.is_a?(Array)
      errors << "application #{id} changed_files_filters must be an array"
      return
    end

    return unless changed_file_filters_available?

    filter_names.each do |filter_name|
      next if changed_file_filters.filters.key?(filter_name)

      errors << "application #{id} references unknown changed file filter #{filter_name}"
    end
  end

  def changed_file_filters_available?
    return false if changed_file_filters_path.nil?

    changed_file_filters
    true
  rescue Errno::ENOENT, Psych::Exception
    false
  end

  def validate_os_version_tags(errors)
    return unless os_version_tags.is_a?(Array)

    ids = os_version_tags.map { |os_version_tag| safe_os_version_tag_id(os_version_tag) }
    errors << "os_version_tag ids must be unique" unless ids.compact.uniq.length == ids.compact.length
    os_version_tags.each do |os_version_tag|
      id = safe_os_version_tag_id(os_version_tag)
      errors << "os_version_tag missing id" if id.to_s.empty?
    end
  end

  def safe_os_version_tag_id(os_version_tag)
    os_version_tag_id(os_version_tag)
  rescue KeyError
    nil
  end

  def validate_suites(errors)
    return unless suites.is_a?(Array)

    validate_unique_ids(errors, "suite", suites)
    suites.each do |suite|
      id = suite.fetch("id", "")
      errors << "suite missing id" if id.to_s.empty?
      execute = suite.fetch("execute", "")
      errors << "suite #{id} missing execute" if execute.empty?
      next if execute.empty?

      errors << "suite #{id} execute path does not exist: #{execute}" unless File.exist?(File.join(e2e_root, execute))
    end
  end

  def validate_unique_ids(errors, label, collection)
    ids = collection.map { |item| item.fetch("id", nil) }
    errors << "#{label} ids must be unique" unless ids.compact.uniq.length == ids.compact.length
  end

  def required_application_keys
    ["id", "target", "platform", "app_id", "artifact_env", "ready_marker"]
  end

  def e2e_root
    File.expand_path("..", File.dirname(config_path))
  end
end
