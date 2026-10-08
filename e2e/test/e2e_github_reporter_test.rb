# frozen_string_literal: true

require "minitest/autorun"
require "json"
require_relative "../lib/bitrise_pipeline_stages"
require_relative "../lib/e2e_github_reporter"

class E2EGitHubReporterTest < Minitest::Test
  E2E_PIPELINE_URL = "https://app.bitrise.io/app/example/pipelines/e2e-build"
  IOS_PIPELINE_URL = "https://app.bitrise.io/app/example/pipelines/ios-build"

  class GitHubClient
    attr_reader :gets, :posts, :patches

    def initialize(check_runs: [], comments: [], lookup_error: nil)
      @check_runs = check_runs
      @comments = comments
      @lookup_error = lookup_error
      @gets = []
      @posts = []
      @patches = []
    end

    def get(path)
      @gets << path
      if path.include?("/check-runs?")
        raise @lookup_error if @lookup_error

        {"check_runs" => @check_runs}
      elsif path == "/repos/Shopify/checkout-kit/issues/1/comments?per_page=100&page=1"
        @comments
      else
        raise "Unexpected GET: #{path}"
      end
    end

    def post_json(path, body)
      @posts << [path, body]
      {}
    end

    def patch_json(path, body)
      @patches << [path, body]
      {}
    end
  end

  TARGETS_PATH = File.expand_path("../../scripts/tophat/targets.json", __dir__)

  def manifest
    @manifest ||= JSON.parse(File.read(TARGETS_PATH))
  end

  def reporter(results: [], run_plan: [], stages: nil, pipeline_url: nil, expected: nil, client: nil)
    E2EGitHubReporter.new(
      results,
      repository: "Shopify/checkout-kit",
      sha: "abc123",
      pr_number: 1,
      branch: "feature-branch",
      app_slug: manifest.fetch("app_slug"),
      targets: manifest.fetch("targets"),
      run_plan: run_plan,
      stages: stages,
      pipeline_url: pipeline_url,
      expected: expected,
      client: client
    )
  end

  def swift_ios_run
    {
      "id" => "swift-ios-latest-launch-smoke",
      "application_id" => "swift-ios",
      "target" => "swift",
      "platform" => "ios",
      "os_version_tag" => "latest",
      "execute" => ".",
      "include_tags" => ["launch"]
    }
  end

  def react_native_ios_run
    {
      "id" => "react-native-ios-latest-launch-smoke",
      "application_id" => "react-native-ios",
      "target" => "react-native",
      "platform" => "ios",
      "os_version_tag" => "latest",
      "execute" => ".",
      "include_tags" => ["launch"]
    }
  end

  def stage_roster(*workflows)
    BitrisePipelineStages.from_json(JSON.generate(workflows), app_slug: manifest.fetch("app_slug"))
  end

  def workflow(name, status:, external_id: "a7111bcd")
    {"name" => name, "status" => status, "external_id" => external_id}
  end

  def failed_react_native_ios_build
    stage_roster(workflow("e2e-build-react-native-ios", status: "failed"))
  end

  def target(id)
    manifest.fetch("targets").find { |candidate| candidate.fetch("id") == id }
  end

  def result(target)
    {"target" => target, "application_id" => target, "passed" => true, "execute" => "."}
  end

  def test_empty_plan_publishes_a_successful_required_check
    client = GitHubClient.new
    report = reporter(expected: 0, client: client)

    report.publish!

    check = client.posts.first.last
    assert_equal "Checkout Kit E2E", check.fetch(:name)
    assert_equal "completed", check.fetch(:status)
    assert_equal "success", check.fetch(:conclusion)
    assert_includes check.dig(:output, :summary), "No native E2E runs were selected for this change."
    refute_includes report.comment_body, "## Install this build"
  end

  def test_missing_expected_results_still_publish_a_failure
    client = GitHubClient.new
    report = reporter(expected: 1, run_plan: [swift_ios_run], client: client)

    report.publish!

    check = client.posts.first.last
    assert_equal "failure", check.fetch(:conclusion)
    assert_includes check.dig(:output, :summary), "Expected 1 run, received 0"
    refute_includes check.dig(:output, :summary), "No native E2E runs were selected"
  end

  def test_install_table_lists_every_produced_target
    body = reporter(results: [result("react-native"), result("swift"), result("kotlin")]).comment_body

    assert_includes body, "| React Native | [Install with Tophat]"
    assert_includes body, "| Swift | [Install with Tophat]"
    assert_includes body, "| Kotlin | [Install with Tophat]"
  end

  def test_install_table_omits_targets_without_results
    body = reporter(results: [result("swift")]).comment_body

    assert_includes body, "| Swift | [Install with Tophat]"
    refute_includes body, "| React Native | [Install with Tophat]"
    refute_includes body, "| Kotlin | [Install with Tophat]"
  end

  def test_swift_install_url_covers_device_and_simulator
    url = reporter.tophat_install_url(target("swift"))

    assert_includes url, "CheckoutKitSwiftDemo-Provisioned.ipa"
    assert_includes url, "CheckoutKitSwiftDemo-Simulator.zip"
    assert_includes url, "destination=device"
    assert_includes url, "destination=simulator"
  end

  def test_kotlin_install_url_targets_android_apk
    url = reporter.tophat_install_url(target("kotlin"))

    assert_includes url, "workflow=e2e-build-kotlin-android"
    assert_includes url, "app-debug.apk"
  end

  def blocked_reporter
    reporter(
      results: [],
      run_plan: [react_native_ios_run, swift_ios_run],
      stages: failed_react_native_ios_build,
      pipeline_url: "https://app.bitrise.io/app/#{manifest.fetch("app_slug")}/pipelines/7ccf403b",
      expected: 2
    )
  end

  def test_blocked_report_names_the_failed_stage_and_lists_the_skipped_runs
    summary = blocked_reporter.markdown_summary

    assert_includes summary, "> [!CAUTION]"
    assert_includes summary, "> E2E runs were skipped — 1 pipeline stage failed:"
    assert_includes summary, "> - `e2e-build-react-native-ios` — [build log]"
    assert_includes summary, "/build/a7111bcd)"
    assert_includes summary, "> None of the 2 planned runs executed:"
    assert_includes summary, "> - `swift-ios` · launch (ios)"
    assert_includes summary, "> [Pipeline build](https://app.bitrise.io/app/"
  end

  def test_blocked_report_omits_the_empty_tables
    body = blocked_reporter.comment_body

    refute_includes body, "| Status | Tags |"
    refute_includes body, "## Install this build"
    refute_includes body, "| SDK | Install |"
  end

  def test_blocked_report_names_the_stage_in_the_check_run_title
    assert_equal "Blocked by e2e-build-react-native-ios", blocked_reporter.check_run_payload.dig(:output, :title)
  end

  def test_missing_runs_are_named_without_a_stage_roster
    summary = reporter(results: [], run_plan: [swift_ios_run], expected: 1).markdown_summary

    assert_includes summary, "did not report"
    assert_includes summary, "> - `swift-ios` · launch (ios)"
    refute_includes summary, "[!CAUTION]"
  end

  def test_results_table_names_the_selected_tags
    reported = swift_ios_run.merge(
      "passed" => true,
      "resolved_device" => "iPhone",
      "include_tags" => %w[cart checkout]
    )
    body = reporter(results: [reported]).comment_body

    assert_includes body, "| Status | Tags | Target | Platform | OS version tag | Device |"
    assert_includes body, "| ✅ | `cart, checkout` |"
  end

  def test_results_table_reads_all_without_selected_tags
    reported = swift_ios_run.merge("passed" => true, "resolved_device" => "iPhone", "include_tags" => [])

    assert_includes reporter(results: [reported]).comment_body, "| ✅ | `all` |"
  end

  def test_partial_report_keeps_the_table_and_names_the_failed_stage
    reported = swift_ios_run.merge("passed" => true, "resolved_device" => "iPhone")
    summary = reporter(
      results: [reported],
      run_plan: [react_native_ios_run, swift_ios_run],
      stages: stage_roster(workflow("e2e-execute-browserstack-run_2", status: "failed")),
      expected: 2
    ).markdown_summary

    assert_includes summary, "| Status | Tags |"
    assert_includes summary, "did not report"
    assert_includes summary, "> 1 pipeline stage failed:"
    assert_includes summary, "> - `e2e-execute-browserstack-run` — [build log]"
    refute_includes summary, "[!CAUTION]"
  end

  def test_stage_that_never_ran_is_reported_when_the_run_plan_expects_it
    summary = reporter(
      results: [],
      run_plan: [swift_ios_run],
      stages: stage_roster(workflow("e2e-execute-browserstack-run", status: "", external_id: "")),
      expected: 1
    ).markdown_summary

    assert_includes summary, "> E2E runs were skipped — 1 pipeline stage did not run:"
    assert_includes summary, "> - `e2e-execute-browserstack-run`"
    refute_includes summary, "[build log]"
  end

  def test_stage_that_never_ran_outside_the_run_plan_is_ignored
    summary = reporter(
      results: [],
      run_plan: [swift_ios_run],
      stages: stage_roster(workflow("e2e-build-react-native-android", status: "", external_id: "")),
      expected: 1
    ).markdown_summary

    refute_includes summary, "e2e-build-react-native-android"
    refute_includes summary, "[!CAUTION]"
    assert_includes summary, "did not report"
  end

  def test_complete_run_has_no_missing_run_lines
    result = swift_ios_run.merge("passed" => true, "resolved_device" => "iPhone")
    summary = reporter(
      results: [result],
      run_plan: [swift_ios_run],
      expected: 1
    ).markdown_summary

    refute_includes summary, "did not report"
  end

  def test_failure_heading_names_the_target
    failed = swift_ios_run.merge("passed" => false, "failed_tests" => [])

    assert_includes reporter(results: [failed]).markdown_summary, "### iOS — swift"
  end

  def test_setup_error_names_the_class_and_message
    failed = swift_ios_run.merge(
      "passed" => false,
      "failed_tests" => [],
      "error_class" => "RuntimeError",
      "error" => "first line\nsecond line"
    )

    assert_includes reporter(results: [failed]).markdown_summary, "> `RuntimeError`: first line second line"
  end

  def pipeline_check(name, url, id: 1, sha: "abc123", app: "bitrise")
    {
      "id" => id,
      "name" => name,
      "head_sha" => sha,
      "app" => {"slug" => app},
      "details_url" => url,
      "status" => "in_progress"
    }
  end

  def test_published_success_and_failure_comments_link_both_pipelines
    [true, false].each do |passed|
      client = GitHubClient.new(check_runs: [pipeline_check("ci/bitrise/ci-ios/pr", IOS_PIPELINE_URL)])
      report = reporter(results: [result("swift").merge("passed" => passed)], pipeline_url: E2E_PIPELINE_URL, client: client)

      report.publish!
      body = client.posts.last.last.fetch(:body)

      assert_includes body, "## Bitrise builds\n\n[E2E](#{E2E_PIPELINE_URL}) · [iOS CI](#{IOS_PIPELINE_URL})"
      assert_includes body, "## Install this build"
      assert_includes body, "## Checkout Kit E2E results"
      assert_equal passed ? "success" : "failure", client.posts.first.last.fetch(:conclusion)
      assert_includes client.gets, "/repos/Shopify/checkout-kit/commits/abc123/check-runs?check_name=ci%2Fbitrise%2Fci-ios%2Fpr&filter=latest&per_page=100"
    end
  end

  def test_links_use_the_latest_matching_bitrise_check_and_keep_the_reporting_pipeline
    checks = [
      pipeline_check("ci/bitrise/ci-ios/pr", IOS_PIPELINE_URL, id: 2),
      pipeline_check("ci/bitrise/ci-ios/pr", "https://example.com/older", id: 1),
      pipeline_check("ci/bitrise/ci-ios/pr", "https://example.com/wrong-app", id: 3, app: "another-app"),
      pipeline_check("ci/bitrise/ci-ios/pr", "https://example.com/wrong-commit", id: 4, sha: "other-sha"),
      pipeline_check("unrelated-check", "https://example.com/wrong-name", id: 5),
      pipeline_check("ci/bitrise/e2e/pr", "https://example.com/other-e2e-run", id: 6)
    ]
    client = GitHubClient.new(check_runs: checks)
    report = reporter(pipeline_url: E2E_PIPELINE_URL, client: client)

    report.publish!
    body = client.posts.last.last.fetch(:body)

    assert_includes body, "[E2E](#{E2E_PIPELINE_URL})"
    assert_includes body, "[iOS CI](#{IOS_PIPELINE_URL})"
    refute_includes body, "https://example.com/"
  end

  def test_pipeline_links_are_added_when_updating_the_existing_sticky_comment
    client = GitHubClient.new(
      check_runs: [pipeline_check("ci/bitrise/ci-ios/pr", IOS_PIPELINE_URL)],
      comments: [{"id" => 42, "body" => "#{E2EGitHubReporter::COMMENT_MARKER}\nold report"}]
    )
    report = reporter(pipeline_url: E2E_PIPELINE_URL, client: client)

    report.publish!

    assert_equal ["/repos/Shopify/checkout-kit/check-runs"], client.posts.map(&:first)
    assert_equal "/repos/Shopify/checkout-kit/issues/comments/42", client.patches.first.first
    body = client.patches.first.last.fetch(:body)
    assert_includes body, "[E2E](#{E2E_PIPELINE_URL})"
    assert_includes body, "[iOS CI](#{IOS_PIPELINE_URL})"
    assert_includes body, E2EGitHubReporter::COMMENT_MARKER
  end

  def test_a_missing_companion_check_keeps_the_known_e2e_link
    client = GitHubClient.new
    report = reporter(pipeline_url: E2E_PIPELINE_URL, client: client)

    report.publish!
    body = client.posts.last.last.fetch(:body)

    assert_includes body, "[E2E](#{E2E_PIPELINE_URL})"
    refute_includes body, "[iOS CI]"
  end

  def test_both_links_can_be_discovered_without_a_pipeline_environment_url
    client = GitHubClient.new(check_runs: [
      pipeline_check("ci/bitrise/e2e/pr", E2E_PIPELINE_URL),
      pipeline_check("ci/bitrise/ci-ios/pr", IOS_PIPELINE_URL)
    ])
    report = reporter(client: client)

    report.publish!
    body = client.posts.last.last.fetch(:body)

    assert_includes body, "[E2E](#{E2E_PIPELINE_URL})"
    assert_includes body, "[iOS CI](#{IOS_PIPELINE_URL})"
  end

  def test_no_links_omits_the_section
    client = GitHubClient.new(check_runs: [pipeline_check("ci/bitrise/ci-ios/pr", " ")])
    report = reporter(client: client)

    report.publish!

    refute_includes client.posts.last.last.fetch(:body), "## Bitrise builds"
  end

  def test_lookup_failure_does_not_prevent_publishing_the_report
    client = GitHubClient.new(lookup_error: "GitHub unavailable")
    report = reporter(results: [result("swift")], pipeline_url: E2E_PIPELINE_URL, client: client)

    _output, warnings = capture_io { report.publish! }

    assert_includes warnings, "Unable to look up ci/bitrise/ci-ios/pr pipeline URL"
    assert_equal 2, client.posts.length
    assert_equal "success", client.posts.first.last.fetch(:conclusion)
    assert_includes client.posts.last.last.fetch(:body), "[E2E](#{E2E_PIPELINE_URL})"
  end

end
