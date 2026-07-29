# frozen_string_literal: true

require "minitest/autorun"
require "json"
require_relative "../lib/e2e_github_reporter"

class E2EGitHubReporterTest < Minitest::Test
  TARGETS_PATH = File.expand_path("../../scripts/tophat/targets.json", __dir__)

  def manifest
    @manifest ||= JSON.parse(File.read(TARGETS_PATH))
  end

  def reporter(results: [], run_plan: [], build_url: nil, expected: nil)
    E2EGitHubReporter.new(
      results,
      repository: "Shopify/checkout-kit",
      sha: "abc123",
      pr_number: 1,
      branch: "feature-branch",
      app_slug: manifest.fetch("app_slug"),
      targets: manifest.fetch("targets"),
      run_plan: run_plan,
      build_url: build_url,
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

  def test_missing_run_is_named_with_build_link
    summary = reporter(
      results: [],
      run_plan: [swift_ios_run],
      build_url: "https://app.bitrise.io/build/xyz",
      expected: 1
    ).markdown_summary

    assert_includes summary, "swift-ios"
    assert_includes summary, "launch-smoke"
    assert_includes summary, "https://app.bitrise.io/build/xyz"
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
