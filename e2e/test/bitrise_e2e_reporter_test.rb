# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require_relative "../lib/bitrise_e2e_reporter"

class BitriseE2EReporterTest < Minitest::Test
  def stage(name, status = "succeeded", slug = "build-slug")
    {"name" => name, "status" => {"Name" => status}, "external_id" => slug}
  end

  def report(ids: ["swift-ios"], ready: "true", stages: [stage("e2e-plan"), stage("e2e-maestro-swift-ios")])
    BitriseE2EReporter.new(
      applications: [{"id" => "swift-ios", "target" => "swift"}, {"id" => "kotlin-android", "target" => "kotlin"}],
      selected_ids: ids, plan_ready: ready,
      repository: "example/repo", sha: "abc123", pr_number: 1,
      stages: BitrisePipelineStages.new(stages, app_slug: "app-slug"),
      targets: [{"id" => "swift", "label" => "Swift", "recipes" => [{"platform" => "ios", "destination" => "simulator", "workflow" => "e2e-build-swift-ios", "artifact_name" => "sample.zip"}]}],
      app_slug: "app-slug", branch: "branch", pipeline_url: "https://example.com/pipeline"
    )
  end

  def test_selected_success_passes_and_links_tests_without_browserstack
    reporter = report
    assert_equal "success", reporter.conclusion
    assert_includes reporter.markdown_summary, "build/build-slug?tab=tests"
    assert_includes reporter.markdown_summary, "skipped — not needed"
    refute_includes reporter.markdown_summary, "BrowserStack"
    assert_includes reporter.comment_body, E2EGitHubReporter::COMMENT_MARKER
    assert_includes reporter.comment_body, "workflow=e2e-build-swift-ios"
    assert_equal "Checkout Kit E2E", reporter.check_run_payload.fetch(:name)
    assert_equal "abc123", reporter.check_run_payload.fetch(:head_sha)
  end

  def test_only_an_explicit_empty_successful_plan_passes_without_tests
    assert_equal "success", report(ids: [], stages: [stage("e2e-plan")]).conclusion
    [nil, "", {}, ["unknown"], ["swift-ios", "swift-ios"], [nil]].each do |ids|
      assert_equal "failure", report(ids: ids).conclusion, ids.inspect
    end
    assert_equal "failure", report(ids: [], ready: nil).conclusion
  end

  def test_failed_or_missing_planner_fails_even_with_empty_selection
    assert_equal "failure", report(ids: [], stages: []).conclusion
    assert_equal "failure", report(ids: [], stages: [stage("e2e-plan", "failed")]).conclusion
  end

  def test_every_incomplete_selected_workflow_fails
    ["failed", "running", "on_hold", "succeeded_with_abort", "unknown", nil].each do |status|
      assert_equal "failure", report(stages: [stage("e2e-plan"), stage("e2e-maestro-swift-ios", status)]).conclusion
    end
    assert_equal "failure", report(stages: [stage("e2e-plan")]).conclusion
    assert_equal "failure", report(stages: [stage("e2e-plan"), stage("e2e-maestro-swift-ios", "succeeded", "")]).conclusion
  end

  def test_skipped_unselected_target_and_in_progress_report_are_ignored
    reporter = report(stages: [stage("e2e-plan"), stage("e2e-maestro-swift-ios"), stage("e2e-maestro-kotlin-android", "", ""), stage("e2e-report", "running")])
    assert_equal "success", reporter.conclusion
  end

  def test_manual_cli_fails_for_missing_results_without_needing_a_github_token
    env = {
      "BITRISE_PULL_REQUEST" => nil, "OVERRIDE_GITHUB_TOKEN" => nil,
      "GIT_HTTP_PASSWORD" => nil, "E2E_DIRECT_PLAN_READY" => "true",
      "E2E_DIRECT_SELECTED_APPLICATIONS" => '["swift-ios"]',
      "BITRISEIO_FINISHED_WORKFLOWS" => JSON.generate([stage("e2e-plan")])
    }
    script = File.expand_path("../scripts/report_bitrise_e2e_results", __dir__)
    output, status = Open3.capture2e(env, RbConfig.ruby, script)
    refute status.success?, output
    assert_includes output, "did not run"
    env["E2E_DIRECT_SELECTED_APPLICATIONS"] = "[]"
    output, status = Open3.capture2e(env, RbConfig.ruby, script)
    assert status.success?, output
    env["E2E_DIRECT_SELECTED_APPLICATIONS"] = "malformed"
    output, status = Open3.capture2e(env, RbConfig.ruby, script)
    refute status.success?, output
  end
end
