# frozen_string_literal: true

require "minitest/autorun"
require "json"
require_relative "../lib/e2e_github_reporter"

class E2EGitHubReporterTest < Minitest::Test
  TARGETS_PATH = File.expand_path("../../scripts/tophat/targets.json", __dir__)

  def manifest
    @manifest ||= JSON.parse(File.read(TARGETS_PATH))
  end

  def reporter(results = [])
    E2EGitHubReporter.new(
      results,
      repository: "Shopify/checkout-kit",
      sha: "abc123",
      pr_number: 1,
      branch: "feature-branch",
      app_slug: manifest.fetch("app_slug"),
      targets: manifest.fetch("targets")
    )
  end

  def target(id)
    manifest.fetch("targets").find { |candidate| candidate.fetch("id") == id }
  end

  def result(target)
    {"target" => target, "passed" => true, "execute" => "flow.yaml"}
  end

  def test_install_table_lists_every_produced_target
    body = reporter([result("react-native"), result("swift"), result("kotlin")]).comment_body

    assert_includes body, "| React Native | [Install with Tophat]"
    assert_includes body, "| Swift | [Install with Tophat]"
    assert_includes body, "| Kotlin | [Install with Tophat]"
  end

  def test_install_table_omits_targets_without_results
    body = reporter([result("swift")]).comment_body

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
end
