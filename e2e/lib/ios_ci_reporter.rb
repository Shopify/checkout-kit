# frozen_string_literal: true

require_relative "github_sticky_comment"
require_relative "bitrise_pipeline_stages"

class IOSCIReporter
  REPORT_NAME = "Checkout Kit iOS"
  COMMENT_MARKER = "<!-- checkout-kit-ios-ci-report -->"
  PLAN_STAGE_NAME = "ci-ios-plan"
  WORKFLOW_PREFIX = "ci-ios-"

  def initialize(job_ids:, selected_job_ids:, repository:, pr_number:, stages:, token: nil, pipeline_url: nil)
    @job_ids = job_ids
    @selected_job_ids = selected_job_ids
    @repository = repository
    @pr_number = pr_number
    @token = token
    @stages = stages
    @pipeline_url = pipeline_url
  end

  def publish!
    GitHubStickyComment.new(
      repository: @repository,
      pr_number: @pr_number,
      token: @token,
      marker: COMMENT_MARKER
    ).publish!(comment_body)
  end

  def comment_body
    [COMMENT_MARKER, markdown_summary].join("\n\n")
  end

  def conclusion
    problem_stages.empty? ? "success" : "failure"
  end

  def markdown_summary
    lines = ["## #{REPORT_NAME}", ""]
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

  def expected_stage_names
    [PLAN_STAGE_NAME] + @selected_job_ids.map { |id| "#{WORKFLOW_PREFIX}#{id}" }
  end

  def problem_stages
    @problem_stages ||= expected_stage_names.filter_map do |name|
      stage = @stages.stage(name)
      next if stage&.status == "succeeded" && stage.build_slug && !stage.build_slug.to_s.strip.empty?

      stage || BitrisePipelineStages::Stage.new(name: name)
    end
  end

  def problem_stage_names
    @problem_stage_names ||= problem_stages.map(&:name)
  end

  def failed_stage_names
    @failed_stage_names ||= problem_stages.filter_map do |stage|
      stage.name if stage.build_slug && !stage.build_slug.to_s.strip.empty?
    end
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

end
