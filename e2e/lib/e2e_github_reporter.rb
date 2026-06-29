# frozen_string_literal: true

require "json"
require_relative "json_http_client"

# Publishes normalized E2E run results back to GitHub as commit statuses,
# check runs, and a sticky pull request comment for failures.
class E2EGitHubReporter
  COMMENT_MARKER = "<!-- checkout-kit-e2e-report -->"

  def initialize(results, repository:, sha:, pr_number:, token: nil, strict: false)
    @results = results
    @repository = repository
    @sha = sha
    @pr_number = pr_number
    @token = token
    @strict = strict
  end

  def publish!
    commit_status_payloads.each { |payload| client.post_json("/repos/#{@repository}/statuses/#{@sha}", payload) }
    client.post_json("/repos/#{@repository}/check-runs", check_run_payload)
    sync_failure_comment
  end

  def markdown_summary
    lines = []
    lines << "## Checkout Kit E2E results"
    lines << ""
    lines << "| Status | Suite | Target | Platform | OS version tag | Device |"
    lines << "|---|---|---|---|---|---|"
    @results.each do |result|
      lines << "| #{status_icon(result)} | `#{result.fetch("execute")}` | #{result.fetch("target")} | #{result.fetch("platform")} | #{result.fetch("os_version_tag")} | #{device_cell(result)} |"
    end
    failure_lines = failed_results.flat_map { |result| failure_details(result) }
    unless failure_lines.empty?
      lines << ""
      lines << "## Failures"
      lines << ""
      if soft_fail?
        lines << "> [!CAUTION]"
        lines << "> These are currently non-blocking, but failures may indicate an issue you need to resolve before merging."
        lines << "> If you believe there is a flaky assertion, please raise a ticket in the #checkout-kit-devs channel so it can be addressed"
        lines << ""
      end
      lines << "> BrowserStack artifacts require BrowserStack access. Sign in to [BrowserStack App Automate](https://app-automate.browserstack.com/dashboard/v2/builds) before opening artifact links."
      lines.concat(failure_lines)
    end
    lines.join("\n")
  end

  def commit_status_payloads
    @results.map do |result|
      {
        state: result.fetch("passed") ? "success" : "failure",
        context: result.fetch("status_context"),
        description: status_description(result),
        target_url: browserstack_build_url(result)
      }
    end
  end

  def failure_comment_body
    return nil if failed_results.empty?

    [COMMENT_MARKER, markdown_summary].join("\n")
  end

  private

  def check_run_payload
    conclusion = failed_results.empty? ? "success" : "failure"
    {
      name: "Checkout Kit E2E",
      head_sha: @sha,
      status: "completed",
      conclusion: conclusion,
      output: {
        title: "Checkout Kit E2E #{conclusion}",
        summary: markdown_summary
      }
    }
  end

  def sync_failure_comment
    body = failure_comment_body
    existing = existing_failure_comment
    if body
      if existing
        client.patch_json("/repos/#{@repository}/issues/comments/#{existing.fetch("id")}", {body: body})
      else
        client.post_json("/repos/#{@repository}/issues/#{@pr_number}/comments", {body: body})
      end
    elsif existing
      client.patch_json("/repos/#{@repository}/issues/comments/#{existing.fetch("id")}", {body: "#{COMMENT_MARKER}\n✅ Checkout Kit E2E failures resolved."})
    end
  end

  def existing_failure_comment
    issue_comments.find do |comment|
      comment.fetch("body", "").include?(COMMENT_MARKER)
    end
  end

  def failed_results
    @results.reject { |result| result.fetch("passed") }
  end

  def soft_fail?
    !@strict
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
    else
      tests.each do |testcase|
        lines << "| `#{testcase.fetch("name", "unknown")}` | ❌ | #{artifact_links(testcase, result)} |"
      end
    end
    lines
  end

  def failure_heading(result)
    suite = File.basename(result.fetch("execute"), ".*")
    "#{os_label(result.fetch("platform"))} — #{suite}"
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
    name = result.fetch("resolved_device")
    version = result["resolved_os_version"]
    version && !version.empty? ? "#{name}<br>#{os_label(result.fetch("platform"))} #{version}" : name
  end

  def os_label(platform)
    platform == "ios" ? "iOS" : "Android"
  end

  def status_icon(result)
    result.fetch("passed") ? "✅" : "❌"
  end

  def status_description(result)
    description = result.fetch("passed") ? "passed" : "#{result.fetch("status")} on #{result.fetch("resolved_device")}" 
    description[0, 140]
  end

  def browserstack_build_url(result)
    "https://app-automate.browserstack.com/dashboard/v2/builds/#{result.fetch("build_id")}" 
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
