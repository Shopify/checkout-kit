# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "tmpdir"
require_relative "../lib/coverage_report"

class CoverageReportTest < Minitest::Test
  def javascript_json(covered: 7, total: 10)
    JSON.generate("total" => CoverageReport::JAVASCRIPT_METRICS.keys.to_h do |key|
      [key, {"covered" => covered, "total" => total}]
    end)
  end

  def test_empty_metrics_are_not_reported_as_full_coverage
    report = CoverageReport.new("web", javascript_json(covered: 0, total: 0))
    assert_includes report.markdown, "| N/A | N/A&nbsp;(0/0) |"
    refute_includes report.markdown, "100%"
  end

  def test_missing_or_impossible_counts_fail
    assert_raises(KeyError) { CoverageReport.new("web", '{"total":{}}') }
    assert_raises(RuntimeError) { CoverageReport.new("web", javascript_json(covered: 11)) }
    assert_raises(RuntimeError) { CoverageReport.new("web", javascript_json(covered: -1)) }
  end

  def swift_json
    JSON.generate("targets" => [
      {"name" => "ShopifyCheckoutKitTests", "coveredLines" => 1000, "executableLines" => 1000},
      {"name" => "ShopifyCheckoutKit", "coveredLines" => 9, "executableLines" => 10},
      {"name" => "ShopifyAcceleratedCheckouts", "coveredLines" => 2, "executableLines" => 3},
      {"name" => "EmbeddedCheckoutProtocol", "coveredLines" => 0, "executableLines" => 0}
    ])
  end

  def android_xml
    <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">
      <report name="lib">
        <package name="com/shopify/checkoutkit">
          <counter type="LINE" covered="90" missed="10"/>
        </package>
        <counter type="LINE" covered="4" missed="1"/>
        <counter type="BRANCH" covered="0" missed="0"/>
        <counter type="METHOD" covered="1" missed="3"/>
        <counter type="INSTRUCTION" covered="9" missed="1"/>
      </report>
    XML
  end

  def test_swift_reports_sdk_targets_only_even_below_85_percent
    markdown = CoverageReport.new("swift", swift_json).markdown

    assert_includes markdown, "# Swift — Coverage Report"
    assert_includes markdown, "| Target | Lines |"
    assert_includes markdown, "| ShopifyCheckoutKit | ![Coverage: 90%](https://img.shields.io/badge/Coverage-90%25-brightgreen.svg) |"
    assert_includes markdown, "| ShopifyAcceleratedCheckouts | ![Coverage: 66.67%](https://img.shields.io/badge/Coverage-66.67%25-yellow.svg) |"
    refute_includes markdown, "ShopifyCheckoutKitTests"
    refute_includes markdown, "EmbeddedCheckoutProtocol"
  end

  def test_android_uses_report_totals_and_handles_no_executable_branches
    markdown = CoverageReport.new("android", android_xml).markdown

    assert_includes markdown, "# Android — Coverage Report"
    assert_includes markdown, "| Lines | Instructions | Branches | Methods |"
    assert_includes markdown, "| ![Coverage: 80%](https://img.shields.io/badge/Coverage-80%25-green.svg) | 90%&nbsp;(9/10) | N/A&nbsp;(0/0) | 25%&nbsp;(1/4) |"
  end

  def test_swift_protocol_uses_only_library_files_and_includes_generated_wire_models
    files = [
      ["/package/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/Client.swift", 8, 10],
      ["/package/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/Generated/Models.swift", 3, 5],
      ["/package/Tests/EmbeddedCheckoutProtocolTests/ClientTests.swift", 100, 100],
      ["/package/.build/runner.swift", 100, 100]
    ].map do |filename, covered, total|
      {"filename" => filename, "summary" => {"lines" => {"covered" => covered, "count" => total}, "functions" => {"covered" => 1, "count" => 2}}}
    end
    report = CoverageReport.new("protocol-swift", JSON.generate("data" => [{"files" => files}]))
    assert_equal [["Lines", 11, 15], ["Functions", 2, 4]], report.rows
    assert_includes report.markdown, "Embedded Checkout Protocol (Swift)"
    assert_includes report.markdown, "| Lines | Functions |"
  end

  def test_swift_protocol_rejects_missing_or_duplicate_files
    assert_raises(RuntimeError) { CoverageReport.new("protocol-swift", '{"data":[{"files":[]}]}') }
    file = {"filename" => "/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/Client.swift"}
    assert_raises(RuntimeError) { CoverageReport.new("protocol-swift", JSON.generate("data" => [{"files" => [file, file]}])) }
  end

  def test_kotlin_protocol_has_its_own_title_and_comment_marker
    report = CoverageReport.new("protocol-kotlin", android_xml)
    assert_equal CoverageReport.new("android", android_xml).rows, report.rows
    assert_includes report.markdown, "Embedded Checkout Protocol (Kotlin)"
    refute_equal CoverageReport.new("android", android_xml).marker, report.marker
  end

  def test_missing_targets_and_counters_fail_instead_of_showing_partial_coverage
    assert_raises(RuntimeError) { CoverageReport.new("swift", '{"targets":[]}') }
    assert_raises(RuntimeError) { CoverageReport.new("android", '<report/>') }
  end

  def test_javascript_reports_share_the_native_format_without_changing_metric_names
    contents = JSON.generate("total" => CoverageReport::JAVASCRIPT_METRICS.keys.to_h { |key| [key, {"covered" => 7, "total" => 10}] })
    %w[web react-native protocol].each do |platform|
      report = CoverageReport.new(platform, contents)
      assert_equal ["Lines", "Statements", "Branches", "Functions"], report.rows.map(&:first)
      assert_includes report.markdown, "70%&nbsp;(7/10)"
      assert_includes report.markdown, "Coverage-70%25-yellow.svg"
    end
  end

  def test_impossible_counts_fail
    invalid = swift_json.sub('"coveredLines":9', '"coveredLines":11')
    assert_raises(RuntimeError) { CoverageReport.new("swift", invalid) }
    assert_raises(RuntimeError) { CoverageReport.new("android", android_xml.sub('missed="1"', 'missed="-1"')) }
  end

  def test_cli_keeps_a_job_summary_without_a_comment_token
    Dir.mktmpdir("coverage report ") do |directory|
      input = File.join(directory, "report.xml")
      summary = File.join(directory, "summary.md")
      File.write(input, android_xml)
      File.write(summary, "Existing summary\n")
      output, error, status = Open3.capture3(
        {"COVERAGE_TOKEN" => "", "COVERAGE_PR" => "123", "COVERAGE_SHA" => "abc123",
         "COVERAGE_REPORT_URL" => "https://example.com/reports", "GITHUB_STEP_SUMMARY" => summary},
        "ruby", File.expand_path("../report_coverage", __dir__), "android", input
      )

      assert status.success?, "#{output}#{error}"
      assert_includes output, "Skipped coverage result"
      markdown = File.read(summary)
      assert markdown.start_with?("Existing summary\n")
      assert_includes markdown, "[![Coverage: 80%](https://img.shields.io/badge/Coverage-80%25-green.svg)](https://example.com/reports)"
      assert_includes markdown, "[Full coverage reports](https://example.com/reports)"
    end
  end

  def test_swift_cli_runs_without_androids_xml_dependency
    Dir.mktmpdir("swift coverage ") do |directory|
      Dir.mkdir(File.join(directory, "rexml"))
      File.write(File.join(directory, "rexml/document.rb"), 'raise LoadError, "XML is unavailable on the Swift runner"')
      input = File.join(directory, "coverage.json")
      File.write(input, swift_json)
      output, error, status = Open3.capture3(
        {"COVERAGE_TOKEN" => "", "GITHUB_STEP_SUMMARY" => ""},
        "ruby", "-I", directory, File.expand_path("../report_coverage", __dir__), "swift", input
      )

      assert status.success?, "#{output}#{error}"
      assert_includes output, "# Swift — Coverage Report"
      assert_includes output, "Coverage: 66.67%"
    end
  end
end

class CoverageResultPublisherTest < Minitest::Test
  class FakeClient
    attr_reader :writes

    def initialize(pr, checks)
      @pr = pr
      @checks = checks
      @writes = []
    end

    def get(path)
      return @pr if path == "/repos/example/sdk/pulls/123"

      {"check_runs" => @checks}
    end

    def post_json(path, body)
      @writes << [:post, path, body]
    end

    def patch_json(path, body)
      @writes << [:patch, path, body]
    end
  end

  def setup
    @report = CoverageReport.new("swift", JSON.generate("targets" => CoverageReport::SWIFT_TARGETS.map do |name|
      {"name" => name, "coveredLines" => 1, "executableLines" => 2}
    end))
    @pr = {"state" => "open", "head" => {"sha" => "abc123", "repo" => {"full_name" => "example/sdk"}}, "base" => {"sha" => "base123"}}
    @source = {"provider" => "github-actions", "runId" => 100, "runAttempt" => 2}
  end

  def publish(checks = [], **options)
    @client = FakeClient.new(@pr, checks)
    CoverageResultPublisher.new(repository: "example/sdk", pr_number: 123, sha: "abc123", token: "test-token", source: @source, client: @client)
      .publish(platform: "swift", state: "success", report: @report, **options)
  end

  def test_persists_numeric_results_against_the_exact_run_without_a_pr_comment
    assert_includes publish, "Published swift"
    method, path, payload = @client.writes.fetch(0)
    assert_equal :post, method
    assert_equal "/repos/example/sdk/check-runs", path
    assert_equal "neutral", payload[:conclusion]
    assert_equal "abc123", payload[:head_sha]
    assert_equal "coverage:swift:100:2", payload[:external_id]
    result = JSON.parse(payload[:output][:text])
    assert_equal 123, result.fetch("pr")
    assert_equal @source, result.fetch("source")
    assert_equal [["ShopifyCheckoutKit", 1, 2], ["ShopifyAcceleratedCheckouts", 1, 2]], result.fetch("rows")
    assert_equal 1, @client.writes.length
  end

  def test_updates_the_matching_check_without_creating_duplicates
    publish([{"id" => 42, "external_id" => "coverage:swift:100:2", "app" => {"slug" => "github-actions"}}])
    assert_equal [:patch, "/repos/example/sdk/check-runs/42"], @client.writes.first.take(2)
  end

  def test_base_results_are_stored_separately_on_the_pr_head
    publish(revision: "base", base_sha: "base123")
    payload = @client.writes.first.last
    assert_equal "abc123", payload[:head_sha]
    assert_equal "coverage-base:#{@report.platform}:100:2", payload[:external_id]
    assert_equal "Coverage base — #{CoverageReport::TITLES.fetch(@report.platform)}", payload[:name]
    result = JSON.parse(payload[:output][:text])
    assert_equal "base", result.fetch("revision")
    assert_equal "base123", result.fetch("baseSha")
    assert_equal @report.rows, result.fetch("rows")
  end

  def test_head_results_record_the_tested_base_without_overwriting_base_results
    publish([{"id" => 42, "external_id" => "coverage-base:#{@report.platform}:100:2", "app" => {"slug" => "github-actions"}}], base_sha: "base123")
    assert_equal :post, @client.writes.first.first
    result = JSON.parse(@client.writes.first.last[:output][:text])
    assert_equal "head", result.fetch("revision")
    assert_equal "base123", result.fetch("baseSha")
  end

  def test_base_results_require_the_current_base_commit
    assert_raises(ArgumentError) { publish(revision: "base") }
    assert_raises(ArgumentError) { publish(revision: "invalid") }
    assert_includes publish(revision: "base", base_sha: "old-base"), "Skipped coverage result"
    assert_empty @client.writes
  end

  def test_superseded_closed_and_fork_prs_are_not_published
    ["stale", "closed", "fork"].each do |scenario|
      setup
      @pr["head"]["sha"] = "new-head" if scenario == "stale"
      @pr["state"] = "closed" if scenario == "closed"
      @pr["head"]["repo"]["full_name"] = "contributor/sdk" if scenario == "fork"
      assert_includes publish, "Skipped coverage result"
      assert_empty @client.writes
    end
  end

  def test_bitrise_persists_before_dispatching_and_finalization_preserves_measurements
    @source = {"provider" => "bitrise", "pipelineUrl" => "https://app.bitrise.io/app/test/pipelines/current"}
    attempt = "apps/example/pipelines/current/attempts/first"
    pipeline = {"id" => 200, "external_id" => attempt, "name" => "ci/bitrise/ci-ios/pr", "app" => {"slug" => "bitrise"}, "details_url" => @source["pipelineUrl"]}
    publish([pipeline])
    assert_equal "/repos/example/sdk/check-runs", @client.writes.first[1]
    assert_equal "/repos/example/sdk/dispatches", @client.writes.last[1]
    assert_equal({event_type: "coverage-updated", client_payload: {pr: 123, sha: "abc123"}}, @client.writes.last[2])
    assert_equal "coverage:swift:200:#{attempt}", @client.writes.first[2][:external_id]

    existing = {"id" => 201, "external_id" => "coverage:swift:200:#{attempt}", "app" => {"slug" => "bitrise"}}
    publish([pipeline, existing], preserve_existing: true)
    assert_equal ["/repos/example/sdk/dispatches"], @client.writes.map { |write| write[1] }
  end

  def test_unknown_bitrise_pipeline_does_not_publish_untraceable_results
    @source = {"provider" => "bitrise", "pipelineUrl" => "https://app.bitrise.io/app/test/pipelines/missing"}
    assert_raises(RuntimeError) { publish }
    assert_empty @client.writes
  end
end
