# frozen_string_literal: true

require_relative "bitrise_pipeline_stages"
require_relative "e2e_github_reporter"

# A selected workflow must finish successfully, including its JUnit export.
# Missing selection metadata or a skipped selected workflow must never pass.
class BitriseE2EReporter < E2EGitHubReporter
  def initialize(applications:, selected_ids:, plan_ready:, **options)
    super([], **options)
    @applications = applications
    @selected_ids = selected_ids
    @plan_ready = plan_ready
  end

  def conclusion
    plan_errors.empty? && problem_stages.empty? ? "success" : "failure"
  end

  def check_run_payload
    {
      name: "Checkout Kit E2E",
      head_sha: @sha,
      status: "completed",
      conclusion: conclusion,
      output: {title: "Checkout Kit E2E #{conclusion}", summary: markdown_summary}
    }
  end

  def markdown_summary
    lines = ["## Checkout Kit E2E results", ""]
    errors = plan_errors + problem_stages.map { |stage| "`#{stage.name}` #{stage_outcome(stage)}." }
    unless errors.empty?
      lines.concat(["> [!CAUTION]", *errors.map { |error| "> #{error}" }, ""])
    end
    lines.concat(["| Target | Outcome | Results |", "|---|---|---|"])
    @applications.each do |application|
      id = application.fetch("id")
      stage = @stages.stage("e2e-maestro-#{id}")
      outcome = if !plan_errors.empty?
        "selection unavailable"
      elsif !@selected_ids.include?(id)
        "skipped — not needed for this change"
      else
        stage_outcome(stage)
      end
      links = if stage && !blank?(stage.build_url)
        "[Tests](#{stage.build_url}?tab=tests) · [Build](#{stage.build_url})"
      else
        "—"
      end
      lines << "| `#{id}` | #{outcome} | #{links} |"
    end
    if plan_errors.empty? && @selected_ids.empty?
      lines.concat(["", "No E2E application was selected for this change."])
    end
    lines.concat(["", "[Pipeline build](#{@pipeline_url})"]) unless blank?(@pipeline_url)
    lines.join("\n")
  end

  private

  def plan_errors
    errors = []
    errors << "The E2E plan did not publish its readiness flag." unless @plan_ready == "true"
    unless @selected_ids.is_a?(Array) && @selected_ids.all? { |id| id.is_a?(String) }
      return errors + ["The E2E application selection is missing or invalid."]
    end
    unknown = @selected_ids - @applications.map { |application| application.fetch("id") }
    errors << "The E2E plan selected unknown applications: #{unknown.join(", ")}." unless unknown.empty?
    errors << "The E2E plan selected duplicate applications." unless @selected_ids.uniq == @selected_ids
    errors
  end

  def problem_stages
    names = ["e2e-plan"]
    names += @selected_ids.map { |id| "e2e-maestro-#{id}" } if plan_errors.empty?
    names.filter_map do |name|
      stage = @stages.stage(name)
      next if stage_outcome(stage) == "passed"

      stage || BitrisePipelineStages::Stage.new(name: name)
    end
  end

  def stage_outcome(stage)
    return "did not run" if stage.nil? || blank?(stage.build_slug)
    return "passed" if stage.status == "succeeded"

    "failed (#{stage.status || "unknown status"})"
  end

  # The retained artifact workflows are started on demand by Tophat.
  def produced_targets
    return [] unless plan_errors.empty?

    ids = @applications.select { |application| @selected_ids.include?(application.fetch("id")) }
      .map { |application| application.fetch("target") }
    @targets.select { |target| ids.include?(target.fetch("id")) }
  end
end
