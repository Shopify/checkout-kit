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
# 4 applications + 1 os_version_tag, and 4 * 1 = 4 runs - so it can look
# like a plain YAML-to-JSON copy. The point is the multiplication, not the copy:
# adding a single os_version_tag (e.g. a minimum-supported OS) transparently duplicates
# every application across that OS, turning an additive config change into
# a multiplicative set of runs without hand-writing each one.
#
# Every run executes the whole tests folder. Tags decide what runs inside it, so a new
# test file adds no rows here - it only needs a tag the matrix already includes.
class E2EMatrixToBrowserStackRunPlan
  # Drift between the matrix and the pipeline graph happens in both directions: a stale
  # branch predating a newly added target, or a build workflow deleted while the matrix
  # still selects it. The hint has to name both remedies.
  MISSING_BUILD_WORKFLOW_HINT = "Rebase on main to pick up the latest workflows, " \
    "or update e2e/config/matrix.yml if you're removing this target intentionally."

  SUPPORTED_PLATFORMS = ["ios", "android"].freeze

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
      os_version_tags.map do |os_version_tag|
        build_run(application, os_version_tag)
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

  def application_config(application_id)
    ensure_valid!
    application = applications.find { |candidate| candidate.fetch("id") == application_id }
    raise KeyError, "unknown E2E application #{application_id}" unless application

    {
      "application_id" => application_id,
      "include_tags" => application_tags(application, "include"),
      "exclude_tags" => effective_tags(application)
    }
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

  def missing_build_workflows(available_workflow_names)
    selected_applications.map { |application| "e2e-build-#{application.fetch("id")}" } - available_workflow_names
  end

  def missing_build_workflow_errors(available_workflow_names)
    missing_build_workflows(available_workflow_names).map do |workflow|
      target = workflow.delete_prefix("e2e-build-")
      "Run plan selected '#{target}' but this branch's e2e/bitrise.yml has no '#{workflow}' workflow."
    end
  end

  def validation_errors
    errors = []
    errors << "version must be 1" unless @config.fetch("version", nil) == 1
    validate_collection(errors, "applications", applications)
    validate_collection(errors, "os_version_tags", os_version_tags)
    validate_changed_file_filters(errors)
    validate_tests_path(errors)
    validate_applications(errors)
    validate_os_version_tags(errors)
    validate_default_tags(errors)
    errors
  end

  def ensure_valid!
    errors = validation_errors
    raise "E2E matrix is invalid:\n#{errors.join("\n")}" unless errors.empty?
  end

  private

  def build_run(application, os_version_tag)
    platform = application.fetch("platform")
    os_version_tag_id = os_version_tag_id(os_version_tag)
    application_id = application.fetch("id")
    app_id = application.fetch("app_id")

    {
      "id" => "#{application_id}-#{os_version_tag_id}",
      "application_id" => application_id,
      "target" => application.fetch("target"),
      "platform" => platform,
      "os_version_tag" => os_version_tag_id,
      "device_selector" => device_selector(platform, os_version_tag),
      "app_id" => app_id,
      "control_link" => control_link(app_id),
      "artifact_env" => application.fetch("artifact_env"),
      "execute" => workspace_path,
      "include_tags" => application_tags(application, "include"),
      "exclude_tags" => application_tags(application, "exclude"),
      "ready_marker" => application.fetch("ready_marker"),
      "status_context" => "checkout-kit/e2e/#{application_id}/#{os_version_tag_id}"
    }
  end

  # The control link scheme is the app id on all four targets, so deriving it keeps
  # one source of truth instead of a second copy that drifts.
  def control_link(app_id)
    "#{app_id}://e2e"
  end

  def application_tags(application, kind)
    shared_tags = Array(default_tags.fetch(kind, nil))
    additional_tags = Array(application.fetch("additional_#{kind}_tags", nil))
    (shared_tags + additional_tags).uniq
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

  def tests_path
    @config.fetch("tests_path", "tests")
  end

  # BrowserStack runs Maestro against this path inside the uploaded test suite, and Maestro
  # resolves the `flows:` glob in config.yaml relative to it. scripts/zip_e2e_tests puts
  # config.yaml, tests/, and flows/ side by side at the suite root, so the root is the
  # only path where that glob resolves. The local runners pass the same value.
  def workspace_path
    "."
  end

  def default_tags
    @config.fetch("tags", {}) || {}
  end

  def declared_tags
    @declared_tags ||= Dir.glob("#{tests_path}/**/*.yaml", base: e2e_root).flat_map do |path|
      header = File.read(File.join(e2e_root, path)).split("\n---\n").first
      YAML.safe_load(header)["tags"] || []
    rescue Psych::Exception
      []
    end.uniq
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
      validate_application_tags(errors, application)
      platform = application.fetch("platform", nil)
      if SUPPORTED_PLATFORMS.include?(platform)
        validate_application_tag_overlap(errors, application)
      else
        errors << "application #{id} platform must be ios or android"
      end
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

  def validate_tests_path(errors)
    return if File.directory?(File.join(e2e_root, tests_path))

    errors << "tests_path is not a directory: #{tests_path}"
  end

  # An include tag no test carries produces a green run that tested nothing.
  def validate_default_tags(errors)
    ["include", "exclude"].each do |kind|
      tags = default_tags.fetch(kind, nil)
      next if tags.nil?

      unless tags.is_a?(Array)
        errors << "tags #{kind} must be an array"
        next
      end

      next unless kind == "include"

      errors.concat(unknown_include_tag_errors(tags) { |tag| "tags include '#{tag}' but no test in tests/ carries it" })
    end
  end

  def validate_application_tags(errors, application)
    id = application.fetch("id", "<missing>")

    ["include", "exclude"].each do |kind|
      key = "additional_#{kind}_tags"
      tags = application.fetch(key, nil)
      next if tags.nil?

      unless tags.is_a?(Array)
        errors << "application #{id} #{key} must be an array"
        next
      end

      next unless kind == "include"

      errors.concat(
        unknown_include_tag_errors(tags) do |tag|
          "application #{id} #{key} '#{tag}' but no test in tests/ carries it"
        end
      )
    end
  end

  def unknown_include_tag_errors(tags)
    return [] if declared_tags.empty?

    (tags - declared_tags).map { |tag| yield(tag) }
  end

  # BrowserStack rejects a build when the same tag appears in both lists.
  def validate_application_tag_overlap(errors, application)
    id = application.fetch("id", "<missing>")
    overlap = application_tags(application, "include") & application_tags(application, "exclude")
    return if overlap.empty?

    errors << "application #{id} includes and excludes #{overlap.inspect}"
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
