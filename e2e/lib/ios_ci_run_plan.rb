# frozen_string_literal: true

require "pathname"
require "yaml"
require_relative "../../scripts/lib/changed_file_filters"

# Decides which macOS CI jobs a change needs, and publishes that decision to Bitrise as
# one environment flag per job.
#
# GitHub Actions does the same work with `dorny/paths-filter` plus a per-job `if:`.
# Bitrise has no equivalent, so a cheap Linux workflow evaluates the same shared filters
# from .ci/changed-file-filters.yml and shares the flags with the pipeline. Both gates
# therefore read one filter file, and neither can drift into selecting a different set.
class IOSCIRunPlan
  # Drift happens in both directions: a stale branch predating a newly declared job, or a
  # workflow deleted while the config still selects it. The hint has to name both remedies.
  MISSING_WORKFLOW_HINT = "Rebase on main to pick up the latest workflows, " \
    "or update e2e/config/ios_ci.yml if you're removing this job intentionally."

  WORKFLOW_PREFIX = "ci-ios-"

  attr_reader :config_path, :changed_files

  def self.load(config_path, changed_files: nil)
    new(config_path, YAML.safe_load_file(config_path, aliases: true), changed_files: changed_files)
  end

  def initialize(config_path, config, changed_files: nil)
    @config_path = config_path
    @config = config || {}
    @changed_files = changed_files&.map(&:to_s)
  end

  def jobs
    @config.fetch("jobs", []) || []
  end

  def job_ids
    jobs.map { |job| job.fetch("id") }
  end

  def selected_jobs
    return jobs if changed_files.nil?

    jobs.select { |job| job_matches_changed_files?(job) }
  end

  def selected_job_ids
    selected_jobs.map { |job| job.fetch("id") }
  end

  def flag_names
    job_ids.map { |id| flag_name(id) }
  end

  def workflow_names
    job_ids.map { |id| workflow_name(id) }
  end

  def bitrise_env
    ensure_valid!
    selected = selected_job_ids
    env = {
      "CI_IOS_HAS_JOBS" => (!selected.empty?).to_s,
      "CI_IOS_SELECTED_JOBS" => selected.join(",")
    }
    job_ids.each { |id| env[flag_name(id)] = selected.include?(id).to_s }
    env
  end

  def missing_workflows(available_workflow_names)
    selected_job_ids.map { |id| workflow_name(id) } - available_workflow_names
  end

  def missing_workflow_errors(available_workflow_names)
    missing_workflows(available_workflow_names).map do |workflow|
      job = workflow.delete_prefix(WORKFLOW_PREFIX)
      "Run plan selected '#{job}' but this branch's e2e/bitrise.yml has no '#{workflow}' workflow."
    end
  end

  def validation_errors
    errors = []
    errors << "version must be 1" unless @config.fetch("version", nil) == 1
    errors << "jobs must be a non-empty array" unless jobs.is_a?(Array) && !jobs.empty?
    validate_changed_file_filters(errors)
    validate_jobs(errors)
    errors
  end

  def ensure_valid!
    errors = validation_errors
    raise "iOS CI run plan is invalid:\n#{errors.join("\n")}" unless errors.empty?
  end

  private

  def flag_name(job_id)
    "CI_IOS_#{job_id.upcase.gsub(/[^A-Z0-9]+/, "_")}"
  end

  def workflow_name(job_id)
    "#{WORKFLOW_PREFIX}#{job_id}"
  end

  def job_matches_changed_files?(job)
    filter_names = job_filter_names(job)
    return true if filter_names.empty?

    changed_file_filters.match?(filter_names, changed_files)
  end

  def job_filter_names(job)
    job.fetch("changed_files_filters", nil) || []
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

  def e2e_root
    File.expand_path("..", File.dirname(config_path))
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

  def validate_jobs(errors)
    return unless jobs.is_a?(Array)

    ids = jobs.map { |job| job.fetch("id", nil) }
    errors << "job ids must be unique" unless ids.compact.uniq.length == ids.compact.length
    jobs.each { |job| validate_job(errors, job) }
  end

  def validate_job(errors, job)
    id = job.fetch("id", "<missing>")
    errors << "job missing id" if id.to_s.empty? || id == "<missing>"

    filter_names = job.fetch("changed_files_filters", nil)
    if filter_names.nil?
      errors << "job #{id} missing changed_files_filters"
      return
    end

    unless filter_names.is_a?(Array)
      errors << "job #{id} changed_files_filters must be an array"
      return
    end

    return unless changed_file_filters_available?

    filter_names.each do |filter_name|
      next if changed_file_filters.filters.key?(filter_name)

      errors << "job #{id} references unknown changed file filter #{filter_name}"
    end
  end

  def changed_file_filters_available?
    return false if changed_file_filters_path.nil?

    changed_file_filters
    true
  rescue Errno::ENOENT, Psych::Exception
    false
  end
end
