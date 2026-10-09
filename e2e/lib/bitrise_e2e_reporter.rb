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

  def comment_body
    [COMMENT_MARKER, markdown_summary].join("\n\n")
  end

  def markdown_summary
    lines = ["**#{result_heading}**", ""]
    errors = plan_errors + problem_stages.map { |stage| "`#{stage.name}` #{stage_outcome(stage)}." }
    unless errors.empty?
      lines.concat(["> [!CAUTION]", *errors.map { |error| "> #{error}" }, ""])
    end
    lines.concat(["| Target | Result | Details | Install from branch |", "|---|---|---|---|"])
    applications_by_outcome.each do |application|
      stage = application_stage(application)
      lines << "| #{application_label(application)} | #{application_outcome(application)} | #{stage_links(stage)} | #{application_install_link(application)} |"
    end
    if plan_errors.empty? && @selected_ids.empty?
      lines.concat(["", "No E2E application was selected for this change."])
    end
    if @applications.any? { |application| application_install_link(application) != "—" }
      lines.concat(["", "To install, open Tophat on your Mac, select a device or simulator, then use the corresponding link."])
    end
    links = pipeline_links
    lines.concat(["", "**Bitrise:** #{links.join(" · ")}"]) unless links.empty?
    lines.join("\n")
  end

  private

  def result_heading
    return "❌ E2E failed · selection unavailable" unless plan_errors.empty?
    if @selected_ids.empty?
      return conclusion == "success" ? "✅ E2E not needed" : "❌ E2E failed · no targets selected"
    end

    passed = @selected_ids.count { |id| stage_outcome(@stages.stage("e2e-maestro-#{id}")) == "passed" }
    count = "#{passed}/#{@selected_ids.length} targets"
    conclusion == "success" ? "✅ E2E passed · #{count}" : "❌ E2E failed · #{count} passed"
  end

  def applications_by_outcome
    @applications.sort_by do |application|
      if !selected?(application)
        2
      elsif stage_outcome(application_stage(application)) == "passed"
        1
      else
        0
      end
    end
  end

  def selected?(application)
    plan_errors.empty? && @selected_ids.include?(application.fetch("id"))
  end

  def application_stage(application)
    @stages.stage("e2e-maestro-#{application.fetch("id")}")
  end

  def application_target(application)
    @targets.find { |target| target.fetch("id") == application.fetch("target") }
  end

  def application_label(application)
    label = application_target(application)&.fetch("label") || application.fetch("target")
    platform = application.fetch("platform")
    platform_label = {"ios" => "iOS", "android" => "Android"}.fetch(platform, platform)
    "#{label} · #{platform_label}"
  end

  def application_outcome(application)
    return "⚠️ Selection unavailable" unless plan_errors.empty?
    return "⏭️ Skipped · not needed for this change" unless selected?(application)

    stage = application_stage(application)
    case stage_outcome(stage)
    when "passed" then "✅ Passed"
    when "did not run" then "❌ Did not run"
    else
      stage.status == "failed" ? "❌ Failed" : "❌ Failed (#{stage.status || "unknown status"})"
    end
  end

  def stage_links(stage)
    return "—" if stage.nil? || blank?(stage.build_url)

    "[Tests](#{stage.build_url}?tab=tests) · [Build](#{stage.build_url})"
  end

  # Tophat starts the retained artifact workflows on demand for this branch.
  def application_install_link(application)
    return "—" unless selected?(application) && !blank?(@branch) && !blank?(@app_slug)

    target = application_target(application)
    return "—" unless target

    recipes = target.fetch("recipes").select { |recipe| recipe.fetch("platform") == application.fetch("platform") }
    return "—" if recipes.empty?

    "[Tophat](#{tophat_install_url(target.merge("recipes" => recipes))})"
  end

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
end
