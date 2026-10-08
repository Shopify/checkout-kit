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

  def test_javascript_reports_preserve_metric_names_and_summary_format
    %w[web react-native protocol].each do |platform|
      report = CoverageReport.new(platform, javascript_json)
      assert_equal ["Lines", "Statements", "Branches", "Functions"], report.rows.map(&:first)
      assert_includes report.markdown, "70%&nbsp;(7/10)"
      assert_includes report.markdown, "Coverage-70%25-yellow.svg"
    end
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

  def test_cli_keeps_a_job_summary_without_a_comment_token
    Dir.mktmpdir("coverage report ") do |directory|
      input = File.join(directory, "coverage-summary.json")
      summary = File.join(directory, "summary.md")
      File.write(input, javascript_json)
      File.write(summary, "Existing summary\n")
      output, error, status = Open3.capture3(
        {"COVERAGE_TOKEN" => "", "COVERAGE_PR" => "123", "COVERAGE_SHA" => "abc123",
         "COVERAGE_REPORT_URL" => "https://example.com/reports", "GITHUB_STEP_SUMMARY" => summary},
        "ruby", File.expand_path("../report_coverage", __dir__), "web", input
      )

      assert status.success?, "#{output}#{error}"
      assert_includes output, "Skipped coverage result"
      markdown = File.read(summary)
      assert markdown.start_with?("Existing summary\n")
      assert_includes markdown, "[![Coverage: 70%](https://img.shields.io/badge/Coverage-70%25-yellow.svg)](https://example.com/reports)"
      assert_includes markdown, "[Full coverage reports](https://example.com/reports)"
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
    @report = CoverageReport.new("web", JSON.generate("total" => CoverageReport::JAVASCRIPT_METRICS.keys.to_h do |key|
      [key, {"covered" => 1, "total" => 2}]
    end))
    @pr = {"state" => "open", "head" => {"sha" => "abc123", "repo" => {"full_name" => "example/sdk"}}}
    @source = {"provider" => "github-actions", "runId" => 100, "runAttempt" => 2}
  end

  def publish(checks = [], **options)
    @client = FakeClient.new(@pr, checks)
    CoverageResultPublisher.new(repository: "example/sdk", pr_number: 123, sha: "abc123", token: "test-token", source: @source, client: @client)
      .publish(platform: "web", state: "success", report: @report, **options)
  end

  def test_persists_numeric_results_against_the_exact_run_without_a_pr_comment
    assert_includes publish, "Published web"
    method, path, payload = @client.writes.fetch(0)
    assert_equal :post, method
    assert_equal "/repos/example/sdk/check-runs", path
    assert_equal "neutral", payload[:conclusion]
    assert_equal "abc123", payload[:head_sha]
    assert_equal "coverage:web:100:2", payload[:external_id]
    result = JSON.parse(payload[:output][:text])
    assert_equal 123, result.fetch("pr")
    assert_equal @source, result.fetch("source")
    assert_equal [["Lines", 1, 2], ["Statements", 1, 2], ["Branches", 1, 2], ["Functions", 1, 2]], result.fetch("rows")
    assert_equal 1, @client.writes.length
  end

  def test_updates_the_matching_check_without_creating_duplicates
    publish([{"id" => 42, "external_id" => "coverage:web:100:2", "app" => {"slug" => "github-actions"}}])
    assert_equal [:patch, "/repos/example/sdk/check-runs/42"], @client.writes.first.take(2)
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

end
