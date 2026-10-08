# frozen_string_literal: true

require "json"
require_relative "json_http_client"

class CoverageReport
  JAVASCRIPT_METRICS = {"lines" => "Lines", "statements" => "Statements", "branches" => "Branches", "functions" => "Functions"}.freeze
  TITLES = {"web" => "Web", "react-native" => "React Native", "protocol" => "Embedded Checkout Protocol (TypeScript)"}.freeze

  attr_reader :platform, :rows

  def initialize(platform, contents)
    @platform = platform
    @rows = case platform
    when "web", "react-native", "protocol" then javascript_rows(contents)
    else raise ArgumentError, "Unknown coverage platform: #{platform}"
    end
  end

  def marker
    "<!-- checkout-kit-coverage:#{platform} -->"
  end

  def markdown(report_url: nil)
    label = TITLES.fetch(platform)
    lines = [marker, "# #{label} — Coverage Report", ""]
    lines.concat(["| #{@rows.map(&:first).join(' | ')} |", "| #{@rows.map { "---" }.join(" | ")} |"])
    cells = @rows.map do |name, covered, total|
      metric(covered, total, badge: name == "Lines", report_url: report_url)
    end
    lines << "| #{cells.join(' | ')} |"
    lines.concat(["", "[Full coverage reports](#{report_url})"]) unless report_url.to_s.empty?
    lines.join("\n") + "\n"
  end

  private

  def javascript_rows(contents)
    totals = JSON.parse(contents).fetch("total")
    JAVASCRIPT_METRICS.map do |key, label|
      counts = totals.fetch(key)
      row(label, counts.fetch("covered"), counts.fetch("total"))
    end
  end

  def metric(covered, total, badge:, report_url:)
    return "N/A" if total.zero? && badge
    return "N/A&nbsp;(0/0)" if total.zero?

    percentage = 100.0 * covered / total
    formatted = format("%.2f", percentage).sub(/\.?0+\z/, "")
    counts = "(#{covered}/#{total})"
    return "#{formatted}%&nbsp;#{counts}" unless badge

    # Match the existing jest-coverage-comment badge palette. Colors describe
    # coverage, independently of whether a platform enforces a threshold.
    color = case percentage
    when 0...40 then "red"
    when 40...60 then "orange"
    when 60...80 then "yellow"
    when 80...90 then "green"
    else "brightgreen"
    end
    image = "![Coverage: #{formatted}%](https://img.shields.io/badge/Coverage-#{formatted}%25-#{color}.svg)"
    image = "[#{image}](#{report_url})" unless report_url.to_s.empty?
    image
  end

  def row(label, covered, total)
    unless covered.is_a?(Integer) && total.is_a?(Integer) && covered >= 0 && total >= covered
      raise "Invalid coverage counts for #{label}"
    end

    [label, covered, total]
  end
end

class CoverageResultPublisher
  def initialize(repository:, pr_number:, sha:, token:, source:, client: nil)
    @repository = repository
    @pr_number = pr_number
    @sha = sha
    @source = source
    @client = client || JsonHttpClient.new(host: "api.github.com", error_label: "GitHub", default_headers: {"Accept" => "application/vnd.github+json"}) do |request|
      request["Authorization"] = "Bearer #{token}"
    end
  end

  def publish(platform:, state:, report: nil, report_url: nil, preserve_existing: false)
    pr = @client.get("/repos/#{@repository}/pulls/#{@pr_number}")
    return "Skipped coverage result: pull request is closed or this build is superseded." unless pr["state"] == "open" && pr.dig("head", "sha") == @sha
    return "Skipped coverage result: fork pull request." unless pr.dig("head", "repo", "full_name") == @repository

    checks = check_runs
    external_id = "coverage:#{platform}:#{@source.fetch('runId')}:#{@source.fetch('runAttempt', 1)}"
    existing = checks.find { |check| check["external_id"] == external_id && check.dig("app", "slug") == @source.fetch("provider") }
    unless existing && preserve_existing
      result = {version: 1, platform: platform, pr: @pr_number.to_i, headSha: @sha, source: @source, state: state, rows: report&.rows || [], reportUrl: report_url}
      payload = {
        name: "Coverage — #{CoverageReport::TITLES.fetch(platform)}",
        external_id: external_id,
        status: "completed",
        conclusion: state == "skipped" ? "skipped" : "neutral",
        output: {
          title: "#{CoverageReport::TITLES.fetch(platform)} coverage",
          summary: report ? report.markdown(report_url: report_url) : "Coverage #{state}.",
          text: JSON.generate(result)
        }
      }
      if existing
        @client.patch_json("/repos/#{@repository}/check-runs/#{existing.fetch('id')}", payload)
      else
        @client.post_json("/repos/#{@repository}/check-runs", payload.merge(head_sha: @sha))
      end
    end
    "Published #{platform} coverage result."
  end

  private

  def check_runs
    results = []
    page = 1
    loop do
      checks = @client.get("/repos/#{@repository}/commits/#{@sha}/check-runs?filter=all&per_page=100&page=#{page}").fetch("check_runs")
      results.concat(checks)
      return results if checks.length < 100

      page += 1
    end
  end
end
