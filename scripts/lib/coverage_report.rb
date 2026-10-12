# frozen_string_literal: true

require "json"
require_relative "json_http_client"

class CoverageReport
  SWIFT_TARGETS = %w[ShopifyCheckoutKit ShopifyAcceleratedCheckouts].freeze
  ANDROID_METRICS = {"LINE" => "Lines", "INSTRUCTION" => "Instructions", "BRANCH" => "Branches", "METHOD" => "Methods"}.freeze
  JAVASCRIPT_METRICS = {"lines" => "Lines", "statements" => "Statements", "branches" => "Branches", "functions" => "Functions"}.freeze
  TITLES = {"swift" => "Swift", "android" => "Android", "web" => "Web", "react-native" => "React Native", "protocol" => "Embedded Checkout Protocol (TypeScript)", "protocol-swift" => "Embedded Checkout Protocol (Swift)", "protocol-kotlin" => "Embedded Checkout Protocol (Kotlin)"}.freeze

  attr_reader :platform, :rows, :groups

  def initialize(platform, contents)
    @platform = platform
    @groups = {}
    @rows = case platform
    when "swift" then swift_rows(contents)
    when "android" then android_rows(contents)
    when "protocol-kotlin" then kotlin_protocol_rows(contents)
    when "protocol-swift" then swift_protocol_rows(contents)
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
    if groups.any?
      lines.concat(["| Scope | #{@rows.map(&:first).join(' | ')} |", "| --- | #{@rows.map { "---" }.join(" | ")} |"])
      groups.merge("Total" => rows).each do |scope, metrics|
        cells = metrics.map { |name, covered, total| metric(covered, total, badge: name == "Lines", report_url: report_url) }
        lines << "| #{scope} | #{cells.join(' | ')} |"
      end
    elsif platform == "swift"
      lines.concat(["| Target | Lines |", "| --- | --- |"])
      @rows.each do |name, covered, total|
        lines << "| #{name} | #{metric(covered, total, badge: true, report_url: report_url)} |"
      end
    else
      lines.concat(["| #{@rows.map(&:first).join(' | ')} |", "| #{@rows.map { "---" }.join(" | ")} |"])
      cells = @rows.map do |name, covered, total|
        metric(covered, total, badge: name == "Lines", report_url: report_url)
      end
      lines << "| #{cells.join(' | ')} |"
    end
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

  def swift_rows(contents)
    targets = JSON.parse(contents).fetch("targets")
    SWIFT_TARGETS.map do |name|
      target = targets.find { |entry| entry.fetch("name") == name }
      raise "Missing Swift coverage target: #{name}" unless target

      row(name, target.fetch("coveredLines"), target.fetch("executableLines"))
    end
  end

  def swift_protocol_rows(contents)
    files = JSON.parse(contents).fetch("data").flat_map { |data| data.fetch("files") }
      .select { |file| file.fetch("filename").include?("/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/") }
    raise "Missing Swift protocol coverage files" if files.empty?
    raise "Duplicate Swift protocol coverage files" unless files.map { |file| file.fetch("filename") }.uniq.length == files.length

    metrics = {"lines" => "Lines", "functions" => "Functions"}
    @groups = {"Runtime" => [], "Generated" => []}
    files.each do |file|
      scope = file.fetch("filename").include?("/EmbeddedCheckoutProtocol/Generated/") ? "Generated" : "Runtime"
      @groups.fetch(scope) << metrics.map do |key, label|
        counts = file.fetch("summary").fetch(key)
        row(label, counts.fetch("covered"), counts.fetch("count"))
      end
    end
    @groups.transform_values! { |entries| sum_rows(entries, metrics.values) }
    sum_rows(groups.values, metrics.values)
  end

  def kotlin_protocol_rows(contents)
    totals = android_rows(contents)
    document = REXML::Document.new(contents)
    files = document.get_elements("report/package/sourcefile")
    raise "Missing Kotlin protocol coverage files" if files.empty?
    paths = files.map { |file| "#{file.parent.attributes['name']}/#{file.attributes['name']}" }
    raise "Duplicate Kotlin protocol coverage files" unless paths.uniq.length == paths.length

    generated = %w[Models.kt EmbeddedCheckoutProtocol.kt].map { |name| "com/shopify/ucp/embedded/checkout/#{name}" }
    @groups = {"Runtime" => [], "Generated" => []}
    files.zip(paths).each do |file, path|
      scope = generated.include?(path) ? "Generated" : "Runtime"
      @groups.fetch(scope) << android_counters(file, allow_missing: true)
    end
    @groups.transform_values! { |entries| sum_rows(entries, ANDROID_METRICS.values) }
    raise "Kotlin coverage scopes do not match report totals" unless sum_rows(groups.values, ANDROID_METRICS.values) == totals

    totals
  end

  def sum_rows(entries, labels)
    labels.each_with_index.map do |label, index|
      row(label, entries.sum { |entry| entry.fetch(index)[1] }, entries.sum { |entry| entry.fetch(index)[2] })
    end
  end

  def android_rows(contents)
    # Bitrise's Swift runner only needs JSON and does not install the XML gem.
    require "rexml/document"

    document = REXML::Document.new(contents)
    # Nested package/class counters duplicate the report totals.
    android_counters(document.elements["report"])
  end

  def android_counters(element, allow_missing: false)
    ANDROID_METRICS.map do |type, label|
      counter = element&.elements&.[]("counter[@type='#{type}']")
      # JaCoCo omits source-level counters when a file has no such instructions.
      next row(label, 0, 0) if !counter && allow_missing
      raise "Missing Android coverage counter: #{type}" unless counter

      covered = Integer(counter.attributes["covered"])
      missed = Integer(counter.attributes["missed"])
      raise "Invalid Android coverage counter: #{type}" if missed.negative?

      row(label, covered, covered + missed)
    end
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

  def publish(platform:, state:, report: nil, report_url: nil, preserve_existing: false, revision: "head", base_sha: nil)
    raise ArgumentError, "Unknown coverage revision" unless %w[head base].include?(revision)
    raise ArgumentError, "Base coverage requires a base commit" if revision == "base" && base_sha.to_s.empty?

    pr = @client.get("/repos/#{@repository}/pulls/#{@pr_number}")
    return "Skipped coverage result: pull request is closed or this build is superseded." unless pr["state"] == "open" && pr.dig("head", "sha") == @sha
    return "Skipped coverage result: fork pull request." unless pr.dig("head", "repo", "full_name") == @repository
    return "Skipped coverage result: pull request base changed." if revision == "base" && pr.dig("base", "sha") != base_sha

    checks = check_runs
    if @source.fetch("provider") == "bitrise"
      pipeline = checks.select do |check|
        check.dig("app", "slug") == "bitrise" && check["name"] == "ci/bitrise/ci-ios/pr" &&
          check["details_url"] == @source.fetch("pipelineUrl")
      end.max_by { |check| check.fetch("id") }
      raise "Could not identify the Bitrise pipeline check" unless pipeline

      @source["runId"] = pipeline.fetch("id")
      @source["runAttempt"] = pipeline.fetch("external_id", 1)
    end
    prefix = revision == "base" ? "coverage-base" : "coverage"
    external_id = "#{prefix}:#{platform}:#{@source.fetch('runId')}:#{@source.fetch('runAttempt', 1)}"
    existing = checks.find { |check| check["external_id"] == external_id && check.dig("app", "slug") == @source.fetch("provider") }
    unless existing && preserve_existing
      result = {version: 1, platform: platform, pr: @pr_number.to_i, headSha: @sha, baseSha: base_sha, revision: revision, source: @source, state: state, rows: report&.rows || [], reportUrl: report_url}
      result[:groups] = report.groups if report && report.groups.any?
      payload = {
        name: "Coverage#{revision == 'base' ? ' base' : ''} — #{CoverageReport::TITLES.fetch(platform)}",
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
    # Persist before notifying. The serialized publisher reloads all results, so
    # coalesced notifications cannot lose a platform that finished concurrently.
    if @source.fetch("provider") == "bitrise"
      @client.post_json("/repos/#{@repository}/dispatches", {event_type: "coverage-updated", client_payload: {pr: @pr_number.to_i, sha: @sha}})
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
