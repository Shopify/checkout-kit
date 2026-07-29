# frozen_string_literal: true

require "minitest/autorun"
require "yaml"

class WorkflowTimeoutsTest < Minitest::Test
  WORKFLOW_GLOB = File.expand_path("../../.github/workflows/*.{yml,yaml}", __dir__)

  def test_every_runner_job_declares_a_timeout
    missing = workflow_jobs.filter_map do |path, name, job|
      "#{relative_path(path)}: #{name}" unless reusable_job?(job) || job.key?("timeout-minutes")
    end

    assert_empty missing, "Jobs without timeout-minutes:\n#{missing.join("\n")}"
  end

  private

  def workflow_jobs
    Dir[WORKFLOW_GLOB].sort.flat_map do |path|
      workflow = YAML.safe_load_file(path, aliases: true)
      (workflow.fetch("jobs", {})).map { |name, job| [path, name, job] }
    end
  end

  def reusable_job?(job)
    job.is_a?(Hash) && job.key?("uses")
  end

  def relative_path(path)
    path.delete_prefix("#{File.expand_path("../..", __dir__)}/")
  end
end
