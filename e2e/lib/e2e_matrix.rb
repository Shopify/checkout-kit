# frozen_string_literal: true

require "yaml"

# Expands the compact E2E test matrix in config/matrix.yml into one fully-resolved
# run per (application x os_version_tag x suite) combination.
#
# Unlike GitHub Actions, Bitrise has no built-in matrix/strategy support, so we
# do the fan-out ourselves: `expand` produces the JSON list of runs that the
# pipeline consumes, and Bitrise parallelizes over it via `run_at`/`count`.
#
# Today the numbers make the config and the expansion look equivalent -
# 2 applications + 1 os_version_tag + 1 suite, and 2 * 1 * 1 = 2 runs - so it can look
# like a plain YAML-to-JSON copy. The point is the multiplication, not the copy:
# adding a single os_version_tag (e.g. a minimum-supported OS) transparently duplicates
# every application x suite across that OS, turning an additive config change into
# a multiplicative set of runs without hand-writing each one.
class E2EMatrix
  attr_reader :config_path

  def self.load(config_path)
    new(config_path, YAML.safe_load_file(config_path))
  end

  def initialize(config_path, config)
    @config_path = config_path
    @config = config || {}
  end

  def expand
    applications.flat_map do |application|
      os_version_tags.flat_map do |os_version_tag|
        suites.map do |suite|
          build_run(application, os_version_tag, suite)
        end
      end
    end
  end

  def run_at(index)
    runs = expand
    runs.fetch(index)
  end

  def validation_errors
    errors = []
    errors << "version must be 1" unless @config.fetch("version", nil) == 1
    validate_collection(errors, "applications", applications)
    validate_collection(errors, "os_version_tags", os_version_tags)
    validate_collection(errors, "suites", suites)
    validate_applications(errors)
    validate_os_version_tags(errors)
    validate_suites(errors)
    errors
  end

  private

  def build_run(application, os_version_tag, suite)
    platform = application.fetch("platform")
    os_version_tag_id = os_version_tag_id(os_version_tag)
    suite_id = suite.fetch("id")
    application_id = application.fetch("id")

    {
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

  def os_version_tags
    @config.fetch("os_version_tags", []) || []
  end

  def suites
    @config.fetch("suites", []) || []
  end

  def validate_collection(errors, name, collection)
    errors << "#{name} must be a non-empty array" unless collection.is_a?(Array) && !collection.empty?
  end

  def validate_applications(errors)
    return unless applications.is_a?(Array)

    validate_unique_ids(errors, "application", applications)
    applications.each do |application|
      id = application.fetch("id", "<missing>")
      required_application_keys.each do |key|
        errors << "application #{id} missing #{key}" if application.fetch(key, "").to_s.empty?
      end
      platform = application.fetch("platform", nil)
      errors << "application #{id} platform must be ios or android" unless ["ios", "android"].include?(platform)
    end
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
      id = suite.fetch("id", "<missing>")
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
