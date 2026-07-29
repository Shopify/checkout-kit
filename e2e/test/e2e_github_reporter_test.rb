# frozen_string_literal: true

require "minitest/autorun"
require "json"
require_relative "../lib/bitrise_pipeline_stages"
require_relative "../lib/e2e_github_reporter"

class E2EGitHubReporterTest < Minitest::Test
  TARGETS_PATH = File.expand_path("../../scripts/tophat/targets.json", __dir__)

  def manifest
    @manifest ||= JSON.parse(File.read(TARGETS_PATH))
  end

  def reporter(results: [], run_plan: [], stages: nil, pipeline_url: nil, expected: nil)
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
      expected: expected
    )
  end

  def swift_ios_run
    {
      "id" => "swift-ios-latest-launch-smoke",
      "application_id" => "swift-ios",
      "target" => "swift",
      "platform" => "ios",
      "os_version_tag" => "latest",
      "execute" => "tests/shared/launch-smoke.yaml"
    }
  end

  def react_native_ios_run
    {
      "id" => "react-native-ios-latest-launch-smoke",
      "application_id" => "react-native-ios",
      "target" => "react-native",
      "platform" => "ios",
      "os_version_tag" => "latest",
      "execute" => "tests/shared/launch-smoke.yaml"
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
    {"target" => target, "passed" => true, "execute" => "flow.yaml"}
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
    assert_includes summary, "> - `swift-ios` · launch-smoke (ios)"
    assert_includes summary, "> [Pipeline build](https://app.bitrise.io/app/"
  end

  def test_blocked_report_omits_the_empty_tables
    body = blocked_reporter.comment_body

    refute_includes body, "| Status | Suite |"
    refute_includes body, "## Install this build"
    refute_includes body, "| SDK | Install |"
  end

  def test_blocked_report_names_the_stage_in_the_check_run_title
    assert_equal "Blocked by e2e-build-react-native-ios", blocked_reporter.check_run_payload.dig(:output, :title)
  end

  def test_missing_runs_are_named_without_a_stage_roster
    summary = reporter(results: [], run_plan: [swift_ios_run], expected: 1).markdown_summary

    assert_includes summary, "did not report"
    assert_includes summary, "> - `swift-ios` · launch-smoke (ios)"
    refute_includes summary, "[!CAUTION]"
  end

  def test_partial_report_keeps_the_table_and_names_the_failed_stage
    reported = swift_ios_run.merge("passed" => true, "resolved_device" => "iPhone")
    summary = reporter(
      results: [reported],
      run_plan: [react_native_ios_run, swift_ios_run],
      stages: stage_roster(workflow("e2e-execute-browserstack-run_2", status: "failed")),
      expected: 2
    ).markdown_summary

    assert_includes summary, "| Status | Suite |"
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
end
