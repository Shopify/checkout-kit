# frozen_string_literal: true

require "fileutils"
require "json"
require "minitest/autorun"
require "open3"
require "rbconfig"
require "tmpdir"

class ReportResultsTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  GITHUB_STUB = File.expand_path("support/github_http_stub.rb", __dir__)
  PIPELINE_URL = "https://app.bitrise.io/app/app-slug/pipelines/pipeline-slug"
  REPORT_MARKERS = {
    "report_e2e_results" => "<!-- checkout-kit-e2e-report -->",
    "report_ios_ci_results" => "<!-- checkout-kit-ios-ci-report -->"
  }.freeze
  ReportRun = Struct.new(:output, :error, :status, :requests, keyword_init: true)

  def passing_result
    {
      "id" => "swift-ios-latest",
      "application_id" => "swift-ios",
      "target" => "swift",
      "platform" => "ios",
      "os_version_tag" => "latest",
      "include_tags" => ["launch"],
      "resolved_device" => "iPhone",
      "passed" => true
    }
  end

  def failing_result
    passing_result.merge("passed" => false, "failed_tests" => [{"name" => "checkout-guest"}])
  end

  def workflow(name, status: "succeeded", build_slug: "build-slug")
    {"name" => name, "status" => {"Name" => status}, "external_id" => build_slug}
  end

  def successful_workflows
    [workflow("ci-ios-plan"), workflow("ci-ios-swift-package-tests")]
  end

  def failed_workflows
    [workflow("ci-ios-plan"), workflow("ci-ios-swift-package-tests", status: "failed")]
  end

  def comment_body(run)
    run.requests.last.dig("body", "body")
  end

  def test_each_report_creates_only_its_own_sticky_comment
    REPORT_MARKERS.each do |script, marker|
      run = run_report(script)

      assert run.status.success?, run.error
      assert_equal ["GET", "POST"], run.requests.map { |request| request.fetch("method") }
      assert_equal "/repos/example/repository/issues/123/comments", run.requests.last.fetch("path")
      assert_includes comment_body(run), marker
      assert_includes comment_body(run), "[Pipeline build](#{PIPELINE_URL})"
      assert_includes comment_body(run), "✅"
    end
  end

  def test_each_report_updates_only_its_own_comment_after_paginating
    comments = Array.new(100) { |index| {"id" => index, "body" => "Unrelated comment"} }
    comments.concat(REPORT_MARKERS.values.each_with_index.map { |marker, index| {"id" => 200 + index, "body" => "#{marker}\nPrevious report"} })

    REPORT_MARKERS.each_with_index do |(script, marker), index|
      run = run_report(script, comments: comments)

      assert run.status.success?, run.error
      assert_equal ["GET", "GET", "PATCH"], run.requests.map { |request| request.fetch("method") }
      assert_equal "/repos/example/repository/issues/comments/#{200 + index}", run.requests.last.fetch("path")
      assert_includes comment_body(run), marker
      other_marker = (REPORT_MARKERS.values - [marker]).first
      refute_includes comment_body(run), other_marker
      refute_includes comment_body(run), "Previous report"
    end
  end

  def test_e2e_assertion_failures_exit_one_after_publishing_every_result
    other_failure = failing_result.merge(
      "id" => "kotlin-android-latest",
      "application_id" => "kotlin-android",
      "target" => "kotlin",
      "platform" => "android",
      "failed_tests" => [{"name" => "checkout-present-and-close"}]
    )
    run = run_report("report_e2e_results", results: [failing_result, other_failure], expected: 2)

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "checkout-guest"
    assert_includes comment_body(run), "checkout-present-and-close"
    assert_includes comment_body(run), "Install with Tophat"
    assert_includes comment_body(run), "[Pipeline build](#{PIPELINE_URL})"
  end

  def test_e2e_runner_errors_exit_one_after_publishing_the_error
    result = passing_result.merge("passed" => false, "error_class" => "RuntimeError", "error" => "Device resolution failed")
    run = run_report("report_e2e_results", results: [result])

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "RuntimeError"
    assert_includes comment_body(run), "Device resolution failed"
  end

  def test_e2e_missing_results_exit_one_after_publishing_the_shortfall
    run = run_report("report_e2e_results", expected: 2)

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "Expected 2 runs, received 1"
  end

  def test_e2e_blocked_runs_exit_one_after_publishing_the_blocking_stage
    run = run_report("report_e2e_results", results: [], workflows: [workflow("e2e-build-swift-ios", status: "failed")])

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "E2E runs were skipped"
    assert_includes comment_body(run), "e2e-build-swift-ios"
    assert_includes comment_body(run), "[Pipeline build](#{PIPELINE_URL})"
  end

  def test_e2e_no_planned_runs_exit_zero
    run = run_report("report_e2e_results", results: [], expected: 0)

    assert run.status.success?, run.error
    refute_includes comment_body(run), "did not report"
  end

  def test_e2e_no_results_without_an_expected_count_exit_one
    run = run_report("report_e2e_results", results: [], expected: nil)

    assert_equal 1, run.status.exitstatus
    assert_includes run.error, "No E2E result files found"
    assert_empty run.requests
  end

  def test_ios_ci_failed_selected_jobs_exit_one_after_publishing_the_failure
    run = run_report("report_ios_ci_results", workflows: failed_workflows)

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "| ❌ | `swift-package-tests` | failed |"
    assert_includes comment_body(run), "[Pipeline build](#{PIPELINE_URL})"
  end

  def test_ios_ci_missing_selected_jobs_exit_one_after_publishing_the_failure
    run = run_report("report_ios_ci_results", workflows: [workflow("ci-ios-plan")])

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "| ❌ | `swift-package-tests` | did not run |"
  end

  def test_ios_ci_failed_planning_exits_one_even_when_no_job_was_selected
    run = run_report("report_ios_ci_results", selected_jobs: [], workflows: [workflow("ci-ios-plan", status: "failed")])

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "`ci-ios-plan` failed"
  end

  def test_ios_ci_missing_planning_exits_one_even_when_selected_jobs_passed
    run = run_report("report_ios_ci_results", workflows: [workflow("ci-ios-swift-package-tests")])

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "`ci-ios-plan` did not run"
  end

  def test_ios_ci_malformed_stage_roster_exits_one
    run = run_report("report_ios_ci_results", workflows: "not json")

    assert_equal 1, run.status.exitstatus, run.error
    assert_includes comment_body(run), "`ci-ios-plan` did not run"
  end

  def test_ios_ci_intentionally_unselected_jobs_do_not_fail_the_report
    workflows = successful_workflows + [workflow("ci-ios-swift-samples", status: "", build_slug: "")]
    run = run_report("report_ios_ci_results", workflows: workflows)

    assert run.status.success?, run.error
    assert_includes comment_body(run), "| ⏭️ | `swift-samples` | skipped — not needed for this change |"
  end

  def test_ios_ci_successful_planning_with_no_selected_jobs_exits_zero
    run = run_report("report_ios_ci_results", selected_jobs: [], workflows: [workflow("ci-ios-plan")])

    assert run.status.success?, run.error
    assert_includes comment_body(run), "No iOS job ran for this change."
  end

  def test_each_report_evaluates_successful_manual_builds_without_github_credentials
    REPORT_MARKERS.each_key do |script|
      [nil, "", "false", "0"].each do |pr_number|
        run = run_report(script, pr_number: pr_number, token: nil, sha: nil)

        assert run.status.success?, "#{script}: #{run.error}"
        assert_empty run.requests
        assert_includes run.output, "✅"
        assert_includes run.output, "[Pipeline build](#{PIPELINE_URL})"
      end
    end
  end

  def test_each_report_fails_manual_builds_without_posting_to_github
    REPORT_MARKERS.each_key do |script|
      [nil, "", "false", "0"].each do |pr_number|
        run = run_report(script, pr_number: pr_number, token: nil, sha: nil, results: [failing_result], workflows: failed_workflows)

        assert_equal 1, run.status.exitstatus, "#{script}: #{run.error}"
        assert_empty run.requests
        assert_includes run.output, "❌"
      end
    end
  end

  def test_each_report_can_publish_without_a_commit_sha
    REPORT_MARKERS.each do |script, marker|
      run = run_report(script, sha: nil)

      assert run.status.success?, "#{script}: #{run.error}"
      assert_includes comment_body(run), marker
    end
  end

  def test_each_pr_report_requires_a_github_token
    REPORT_MARKERS.each_key do |script|
      run = run_report(script, token: nil)

      assert_equal 1, run.status.exitstatus
      assert_includes run.error, "token is required"
      assert_empty run.requests
    end
  end

  def test_each_report_exits_one_when_comment_publication_fails
    REPORT_MARKERS.each_key do |script|
      run = run_report(script, publish_error: true)

      assert_equal 1, run.status.exitstatus
      assert_includes run.error, "GitHub request failed 503"
      assert_includes run.output, "✅"
    end
  end

  private

  def run_report(script, results: [passing_result], expected: 1, selected_jobs: ["swift-package-tests"], workflows: successful_workflows,
    pr_number: "123", token: "test-token", sha: "abc123", comments: [], publish_error: false)
    Dir.mktmpdir do |directory|
      results_root = File.join(directory, "results")
      FileUtils.mkdir_p(results_root)
      results.each_with_index do |result, index|
        run_directory = File.join(results_root, "run-#{index}")
        FileUtils.mkdir_p(run_directory)
        File.write(File.join(run_directory, "result.json"), JSON.generate(result))
      end
      run_plan_path = File.join(directory, "run-plan.json")
      File.write(run_plan_path, JSON.generate([passing_result]))
      requests_path = File.join(directory, "github-requests.jsonl")
      environment = {
        "GITHUB_REPOSITORY" => "example/repository",
        "BITRISE_GIT_COMMIT" => sha,
        "BITRISE_GIT_BRANCH" => "feature-branch",
        "BITRISE_PULL_REQUEST" => pr_number,
        "OVERRIDE_GITHUB_TOKEN" => token,
        "GIT_HTTP_PASSWORD" => nil,
        "GITHUB_TOKEN" => nil,
        "E2E_BROWSERSTACK_RESULTS_DIR" => results_root,
        "E2E_BROWSERSTACK_RUN_PLAN_COUNT" => expected&.to_s,
        "E2E_BROWSERSTACK_RUN_PLAN_JSON" => run_plan_path,
        "CI_IOS_SELECTED_JOBS" => selected_jobs.join(","),
        "BITRISEIO_FINISHED_WORKFLOWS" => workflows.is_a?(String) ? workflows : JSON.generate(workflows),
        "BITRISEIO_PIPELINE_BUILD_URL" => PIPELINE_URL,
        "TEST_GITHUB_REQUESTS" => requests_path,
        "TEST_GITHUB_COMMENTS" => JSON.generate(comments),
        "TEST_GITHUB_PUBLISH_ERROR" => publish_error.to_s
      }
      output, error, status = Open3.capture3(
        environment,
        RbConfig.ruby,
        "-r", GITHUB_STUB,
        File.join(REPO_ROOT, "e2e", "scripts", script),
        chdir: REPO_ROOT
      )
      requests = File.exist?(requests_path) ? File.readlines(requests_path).map { |line| JSON.parse(line) } : []
      ReportRun.new(output: output, error: error, status: status, requests: requests)
    end
  end
end
