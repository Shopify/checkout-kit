# frozen_string_literal: true

require "json"
require "uri"
require_relative "browserstack_client"
require_relative "../../scripts/lib/json_http_client"

# Publishes normalized E2E run results back to GitHub as a check run and a
# sticky pull request comment carrying the Tophat install link and run summary.
class E2EGitHubReporter
  COMMENT_MARKER = "<!-- checkout-kit-e2e-report -->"
  TOPHAT_INSTALL_BASE = "http://localhost:29070/install/bitrise-branch"
  EXECUTE_STAGE_NAME = "e2e-execute-browserstack-run"

  def initialize(results, repository:, sha:, pr_number:, branch: nil, token: nil, app_slug: nil, targets: [], expected: nil, run_plan: [], stages: nil, pipeline_url: nil)
    @results = results
    @repository = repository
    @sha = sha
    @pr_number = pr_number
    @branch = branch
    @token = token
    @app_slug = app_slug
    @targets = targets
    @expected = expected
    @run_plan = run_plan || []
    @stages = stages
    @pipeline_url = pipeline_url
  end

  def publish!
    client.post_json("/repos/#{@repository}/check-runs", check_run_payload)
    sync_comment
  end

  def tophat_install_url(target)
    pairs = target.fetch("recipes").flat_map do |recipe|
      [
        ["platform", recipe.fetch("platform")],
        ["destination", recipe.fetch("destination")],
        ["app_slug", @app_slug],
        ["branch", @branch],
        ["workflow", recipe.fetch("workflow")],
        ["artifact_name", recipe.fetch("artifact_name")]
      ]
    end
    "#{TOPHAT_INSTALL_BASE}?#{URI.encode_www_form(pairs)}"
  end

  def comment_body
    [COMMENT_MARKER, tophat_install_markdown, markdown_summary].compact.join("\n\n")
  end

  def markdown_summary
    lines = []
    lines << "## Checkout Kit E2E results"
    lines << ""
    lines.concat(results_table) unless @results.empty?
    unless complete?
      lines << "" unless @results.empty?
      lines.concat(completeness_lines)
    end
    failure_lines = failed_results.flat_map { |result| failure_details(result) }
    unless failure_lines.empty?
      lines << ""
      lines << "## Failures"
      lines << ""
      lines << "> [!CAUTION]"
      lines << "> These E2E checks are not yet required, so they do not block merging — but a failure may still indicate a real issue to resolve before merging."
      lines << "> If you believe an assertion is flaky, please raise a ticket in the #checkout-kit-devs channel so it can be addressed."
      lines << ""
      lines << "> BrowserStack artifacts require BrowserStack access. Sign in to [BrowserStack App Automate](#{BrowserStackClient::DASHBOARD_BASE}) before opening artifact links."
      lines.concat(failure_lines)
    end
    lines.join("\n")
  end

  def check_run_payload
    {
      name: "Checkout Kit E2E",
      head_sha: @sha,
      status: "completed",
      conclusion: conclusion,
      output: {
        title: check_run_title,
        summary: markdown_summary
      }
    }
  end

  private

  def results_table
    lines = []
    lines << "| Status | Suite | Target | Platform | OS version tag | Device |"
    lines << "|---|---|---|---|---|---|"
    @results.each do |result|
      lines << "| #{status_icon(result)} | `#{result["execute"]}` | #{result["target"]} | #{result["platform"]} | #{result["os_version_tag"]} | #{device_cell(result)} |"
    end
    lines
  end

  def completeness_lines
    blocked? ? blocked_lines : shortfall_lines
  end

  def blocked_lines
    lines = []
    lines << "> [!CAUTION]"
    lines << "> E2E runs were skipped — #{blocking_stage_heading}"
    lines.concat(blocking_stage_lines)
    lines << ">"
    lines << "> #{skipped_runs_heading}"
    lines.concat(missing_run_lines)
    lines.concat(pipeline_link_lines)
    lines
  end

  def shortfall_lines
    lines = []
    lines << "> [!WARNING]"
    lines << "> Expected #{@expected} run#{@expected == 1 ? "" : "s"}, received #{@results.length} — #{missing_count} did not report. Missing runs count as failures until every run reports."
    lines.concat(missing_run_lines)
    unless blocking_stages.empty?
      lines << ">"
      lines << "> #{blocking_stage_heading}"
      lines.concat(blocking_stage_lines)
    end
    lines.concat(pipeline_link_lines)
    lines
  end

  def blocked?
    @results.empty? && !blocking_stages.empty?
  end

  def blocking_stages
    @blocking_stages ||= resolve_blocking_stages
  end

  def resolve_blocking_stages
    return [] if @stages.nil?

    failed = @stages.failed
    return failed unless failed.empty?

    @stages.not_executed.select { |stage| expected_stage_names.include?(stage.name) }
  end

  def expected_stage_names
    application_ids = @run_plan.map { |run| run["application_id"] }.compact.uniq
    application_ids.map { |application_id| "e2e-build-#{application_id}" } + [EXECUTE_STAGE_NAME]
  end

  def blocking_stage_heading
    count = blocking_stages.length
    "#{count} pipeline stage#{count == 1 ? "" : "s"} #{blocking_stage_verb}:"
  end

  def blocking_stage_verb
    @stages.failed.empty? ? "did not run" : "failed"
  end

  def blocking_stage_lines
    blocking_stages.map do |stage|
      next "> - `#{stage.name}`" if blank?(stage.build_url)

      "> - `#{stage.name}` — [build log](#{stage.build_url})"
    end
  end

  def skipped_runs_heading
    return "No planned run executed:" if @expected.nil?

    "None of the #{@expected} planned run#{@expected == 1 ? "" : "s"} executed:"
  end

  def missing_run_lines
    missing_runs.map { |run| "> - #{missing_run_label(run)}" }
  end

  def pipeline_link_lines
    return [] if blank?(@pipeline_url)

    [">", "> [Pipeline build](#{@pipeline_url})"]
  end

  def conclusion
    failed_results.empty? && complete? ? "success" : "failure"
  end

  def check_run_title
    return "Blocked by #{blocking_stages.first.name}" if blocked?

    "Checkout Kit E2E #{conclusion}"
  end

  def tophat_install_markdown
    return nil if produced_targets.empty?

    lines = []
    lines << "## Install this build"
    lines << ""
    lines << "Open Tophat, select your target device, then click Install. Links open on the Mac running Tophat."
    lines << ""
    lines << "| SDK | Install |"
    lines << "|---|---|"
    produced_targets.each do |target|
      lines << "| #{target.fetch("label")} | [Install with Tophat](#{tophat_install_url(target)}) |"
    end
    lines.join("\n")
  end

  def produced_targets
    produced_ids = @results.map { |result| result["target"] }.compact.uniq
    @targets.select { |target| produced_ids.include?(target.fetch("id")) }
  end

  def complete?
    @expected.nil? || @results.length >= @expected
  end

  def missing_runs
    reported_ids = @results.map { |result| result["id"] }.compact
    @run_plan.reject { |run| reported_ids.include?(run["id"]) }
  end

  def missing_run_label(run)
    suite = File.basename(run["execute"].to_s, ".*")
    "`#{run["application_id"] || run["target"]}` · #{suite} (#{run["platform"]})"
  end

  def missing_count
    return 0 if @expected.nil?

    [@expected - @results.length, 0].max
  end

  def sync_comment
    body = comment_body
    existing = existing_comment
    if existing
      client.patch_json("/repos/#{@repository}/issues/comments/#{existing.fetch("id")}", {body: body})
    else
      client.post_json("/repos/#{@repository}/issues/#{@pr_number}/comments", {body: body})
    end
  end

  def existing_comment
    issue_comments.find do |comment|
      comment.fetch("body", "").include?(COMMENT_MARKER)
    end
  end

  def failed_results
    @results.reject { |result| result.fetch("passed", false) }
  end

  def blank?(value)
    value.nil? || value.to_s.strip.empty?
  end

  def failure_details(result)
    lines = []
    lines << ""
    lines << "### #{failure_heading(result)}"
    lines << ""
    lines << "| Test | Status | Artifacts |"
    lines << "|---|---|---|"
    tests = result.fetch("failed_tests", [])
    if tests.empty?
      lines << "| — | #{status_icon(result)} | #{artifact_links(nil, result)} |"
      unless blank?(result["error"])
        error = result["error"].to_s.gsub(/\s+/, " ").gsub("`", "'")
        lines << ""
        lines << "> Diagnostic: `#{error}`"
      end
    else
      tests.each do |testcase|
        lines << "| `#{testcase.fetch("name", "unknown")}` | ❌ | #{artifact_links(testcase, result)} |"
      end
    end
    lines
  end

  def failure_heading(result)
    suite = File.basename(result["execute"].to_s, ".*")
    "#{os_label(result["platform"])} — #{suite}"
  end

  def artifact_links(testcase, result)
    links = ["[BrowserStack](#{browserstack_build_url(result)})"]
    if testcase
      link_fields.each do |label, key|
        url = artifact_url(testcase[key])
        links << "[#{label}](#{url})" if url
      end
    end
    links.join(" · ")
  end

  def artifact_url(value)
    case value
    when String then value.empty? ? nil : value
    when Array then value.find { |entry| entry.is_a?(String) && !entry.empty? }
    end
  end

  def link_fields
    {
      "Video" => "video",
      "Screenshot" => "screenshots",
      "Maestro commands" => "maestro_commands",
      "Maestro log" => "maestro_log",
      "Device log" => "device_log",
      "Network log" => "network_log"
    }
  end

  def device_cell(result)
    name = result["resolved_device"]
    version = result["resolved_os_version"]
    version && !version.empty? ? "#{name}<br>#{os_label(result["platform"])} #{version}" : name
  end

  def os_label(platform)
    case platform
    when "ios" then "iOS"
    when "android" then "Android"
    else "Unknown"
    end
  end

  def status_icon(result)
    result.fetch("passed", false) ? "✅" : "❌"
  end

  def browserstack_build_url(result)
    BrowserStackClient.build_url(result["build_id"])
  end

  def issue_comments
    comments = []
    page = 1
    loop do
      batch = client.get("/repos/#{@repository}/issues/#{@pr_number}/comments?per_page=100&page=#{page}")
      break unless batch.is_a?(Array) && !batch.empty?

      comments.concat(batch)
      break if batch.length < 100

      page += 1
    end
    comments
  end

  def client
    @client ||= JsonHttpClient.new(host: "api.github.com", error_label: "GitHub", default_headers: {"Accept" => "application/vnd.github+json"}) do |request|
      raise "GitHub token is required" unless @token

      request["Authorization"] = "Bearer #{@token}"
    end
  end
end
