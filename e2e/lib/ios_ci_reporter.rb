# frozen_string_literal: true

require_relative "../../scripts/lib/json_http_client"

# Publishes the macOS CI pipeline outcome to GitHub as one check run.
#
# Bitrise's own commit status covers the whole pipeline, which is the wrong shape for a
# merge gate: a job the change does not need is skipped, and a skipped Bitrise workflow
# is indistinguishable from one the pipeline never reached. Only the gate's own selection
# separates the two, so the pipeline reports its own check instead.
class IOSCIReporter
  CHECK_NAME = "Checkout Kit iOS"
  PLAN_STAGE_NAME = "ci-ios-plan"
  WORKFLOW_PREFIX = "ci-ios-"

  def initialize(job_ids:, selected_job_ids:, repository:, sha:, token:, stages:, pipeline_url: nil)
    @job_ids = job_ids
    @selected_job_ids = selected_job_ids
    @repository = repository
    @sha = sha
    @token = token
    @stages = stages
    @pipeline_url = pipeline_url
  end

  def publish!
    client.post_json("/repos/#{@repository}/check-runs", check_run_payload)
  end

  def check_run_payload
    {
      name: CHECK_NAME,
      head_sha: @sha,
      status: "completed",
      conclusion: conclusion,
      output: {
        title: "#{CHECK_NAME} #{conclusion}",
        summary: markdown_summary
      }
    }
  end

  def conclusion
    problem_stages.empty? ? "success" : "failure"
  end

  def markdown_summary
    lines = ["## #{CHECK_NAME}", ""]
    lines.concat(plan_failure_lines)
    lines.concat(@job_ids.empty? ? [] : job_table)
    if @selected_job_ids.empty?
      lines << ""
      lines << "No iOS job ran for this change."
    end
    lines.concat(pipeline_link_lines)
    lines.join("\n")
  end

  private

  # ci-ios-report is still running while it writes this check, so its own stage always
  # looks unexecuted. Reasoning only over expected stages leaves it out, along with every
  # job the gate deliberately skipped.
  def expected_stage_names
    [PLAN_STAGE_NAME] + @selected_job_ids.map { |id| "#{WORKFLOW_PREFIX}#{id}" }
  end

  def problem_stages
    @problem_stages ||= (@stages.failed + @stages.not_executed)
      .select { |stage| expected_stage_names.include?(stage.name) }
      .uniq(&:name)
  end

  def problem_stage_names
    @problem_stage_names ||= problem_stages.map(&:name)
  end

  def failed_stage_names
    @failed_stage_names ||= @stages.failed.map(&:name)
  end

  def plan_failure_lines
    return [] unless problem_stage_names.include?(PLAN_STAGE_NAME)

    [
      "> [!CAUTION]",
      "> `#{PLAN_STAGE_NAME}` #{failed_stage_names.include?(PLAN_STAGE_NAME) ? "failed" : "did not run"}, " \
        "so no job flag was published and every iOS job was skipped.",
      ""
    ]
  end

  def job_table
    lines = ["| Status | Job | Outcome |", "|---|---|---|"]
    @job_ids.each do |id|
      icon, outcome = job_status(id)
      lines << "| #{icon} | `#{id}` | #{outcome} |"
    end
    lines
  end

  def job_status(id)
    return ["⏭️", "skipped — not needed for this change"] unless @selected_job_ids.include?(id)

    stage_name = "#{WORKFLOW_PREFIX}#{id}"
    return ["✅", "passed"] unless problem_stage_names.include?(stage_name)
    return ["❌", "failed"] if failed_stage_names.include?(stage_name)

    ["❌", "did not run"]
  end

  def pipeline_link_lines
    return [] if @pipeline_url.nil? || @pipeline_url.to_s.strip.empty?

    ["", "[Pipeline build](#{@pipeline_url})"]
  end

  def client
    @client ||= JsonHttpClient.new(host: "api.github.com", error_label: "GitHub", default_headers: {"Accept" => "application/vnd.github+json"}) do |request|
      raise "GitHub token is required" unless @token

      request["Authorization"] = "Bearer #{@token}"
    end
  end
end
