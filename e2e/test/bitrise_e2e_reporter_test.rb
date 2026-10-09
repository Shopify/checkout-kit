# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require_relative "../lib/bitrise_e2e_reporter"

class BitriseE2EReporterTest < Minitest::Test
  def stage(name, status = "succeeded", slug = "build-slug")
    {"name" => name, "status" => {"Name" => status}, "external_id" => slug}
  end

  def targets
    JSON.parse(File.read(File.expand_path("../../scripts/tophat/targets.json", __dir__))).fetch("targets")
  end

  def report(ids: ["swift-ios"], ready: "true", stages: [stage("e2e-plan"), stage("e2e-maestro-swift-ios")],
    applications: [{"id" => "swift-ios", "target" => "swift", "platform" => "ios"}, {"id" => "kotlin-android", "target" => "kotlin", "platform" => "android"}],
    targets: self.targets, branch: "branch", app_slug: "app-slug", client: nil, pipeline_url: "https://example.com/pipeline")
    BitriseE2EReporter.new(
      applications: applications,
      selected_ids: ids, plan_ready: ready,
      repository: "example/repo", sha: "abc123", pr_number: 1,
      stages: BitrisePipelineStages.new(stages, app_slug: "app-slug"),
      targets: targets,
      app_slug: app_slug, branch: branch, pipeline_url: pipeline_url, client: client
    )
  end

  def test_selected_success_passes_and_links_tests_without_browserstack
    reporter = report
    assert_equal "success", reporter.conclusion
    assert_includes reporter.markdown_summary, "build/build-slug?tab=tests"
    assert_includes reporter.markdown_summary, "Skipped · not needed"
    refute_includes reporter.markdown_summary, "BrowserStack"
    assert_includes reporter.comment_body, E2EGitHubReporter::COMMENT_MARKER
    assert_includes reporter.comment_body, "workflow=e2e-build-swift-ios"
    assert_equal "Checkout Kit E2E", reporter.check_run_payload.fetch(:name)
    assert_equal "abc123", reporter.check_run_payload.fetch(:head_sha)
  end

  def test_comment_leads_with_selected_target_results_and_has_one_table_without_a_sha
    body = report.comment_body

    assert_match(/\A#{Regexp.escape(E2EGitHubReporter::COMMENT_MARKER)}\n\n\*\*✅ E2E passed · 1\/1 targets\*\*/, body)
    assert_includes body, "| Target | Result | Details | Install from branch |"
    assert_includes body, "| Swift · iOS | ✅ Passed | [Tests]"
    assert_includes body, "| Kotlin · Android | ⏭️ Skipped · not needed for this change | — | — |"
    assert_equal 1, body.lines.count { |line| line.start_with?("|---") }
    refute_includes body, "abc123"
    refute_includes body, "Install this build"
    refute_includes body, "## Bitrise builds"
    refute_includes body, "Pipeline build"
    assert_equal 1, body.scan("https://example.com/pipeline").length
    assert_match(/\*\*Bitrise:\*\* \[E2E\]\(https:\/\/example.com\/pipeline\)\z/, body)
  end

  def test_failure_and_missing_run_precede_passed_targets
    [stage("e2e-maestro-kotlin-android", "failed"), stage("e2e-maestro-kotlin-android", "", "")].each do |problem|
      reporter = report(ids: ["swift-ios", "kotlin-android"], stages: [stage("e2e-plan"), stage("e2e-maestro-swift-ios"), problem])
      body = reporter.comment_body

      assert_includes body, "**❌ E2E failed · 1/2 targets passed**"
      assert_operator body.index("| Kotlin · Android | ❌"), :<, body.index("| Swift · iOS | ✅ Passed")
      assert_includes body, problem["external_id"].empty? ? "❌ Did not run | —" : "❌ Failed | [Tests]"
    end
  end

  def test_empty_selection_does_not_claim_that_tests_passed_or_offer_installs
    body = report(ids: [], stages: [stage("e2e-plan")]).comment_body

    assert_includes body, "**✅ E2E not needed**"
    assert_includes body, "No E2E application was selected for this change."
    refute_includes body, "E2E passed"
    refute_includes body, "[Tophat]"
    refute_includes body, "To install"
  end

  def test_failed_planner_never_shows_a_successful_heading
    body = report(ids: [], stages: [stage("e2e-plan", "failed")]).comment_body

    assert_includes body, "**❌ E2E failed · no targets selected**"
    assert_includes body, "`e2e-plan` failed (failed)."
    refute_includes body, "✅ E2E"
  end

  def test_invalid_plan_never_renders_success_counts_or_install_links
    [nil, {}, ["unknown"], ["swift-ios", "swift-ios"]].each do |ids|
      body = report(ids: ids).comment_body

      assert_includes body, "**❌ E2E failed · selection unavailable**"
      assert_includes body, "⚠️ Selection unavailable"
      refute_includes body, "[Tophat]"
      refute_includes body, "targets passed"
    end
    refute_includes report(ready: nil).comment_body, "[Tophat]"
  end

  def test_react_native_install_links_only_offer_the_rows_platform
    applications = %w[ios android].map { |platform| {"id" => "react-native-#{platform}", "target" => "react-native", "platform" => platform} }
    manifest_targets = targets
    original_targets = Marshal.load(Marshal.dump(manifest_targets))
    body = report(applications: applications, targets: manifest_targets, ids: applications.map { |app| app.fetch("id") },
      stages: [stage("e2e-plan"), stage("e2e-maestro-react-native-ios"), stage("e2e-maestro-react-native-android")]).comment_body
    ios = body.lines.find { |line| line.start_with?("| React Native · iOS |") }
    android = body.lines.find { |line| line.start_with?("| React Native · Android |") }
    ios_url = URI(ios.match(/\[Tophat\]\(([^)]+)\)/)[1])
    android_url = URI(android.match(/\[Tophat\]\(([^)]+)\)/)[1])
    ios_pairs = URI.decode_www_form(ios_url.query)
    android_pairs = URI.decode_www_form(android_url.query)

    assert_equal ["ios", "ios"], ios_pairs.select { |key, _| key == "platform" }.map(&:last)
    assert_equal ["device", "simulator"], ios_pairs.select { |key, _| key == "destination" }.map(&:last)
    assert_includes ios_pairs, ["artifact_name", "CheckoutKitReactNativeDemo-Provisioned.ipa"]
    assert_includes ios_pairs, ["artifact_name", "CheckoutKitReactNativeDemo-Simulator.zip"]
    assert_equal ["android"], android_pairs.select { |key, _| key == "platform" }.map(&:last)
    assert_includes android_pairs, ["workflow", "e2e-build-react-native-android"]
    assert_includes android_pairs, ["artifact_name", "app-e2e.apk"]
    assert_includes android_pairs, ["branch", "branch"]
    assert_equal original_targets, manifest_targets
  end

  def test_installs_are_omitted_without_branch_app_or_matching_recipe
    [report(branch: nil), report(app_slug: " "), report(targets: []),
      report(targets: [{"id" => "swift", "label" => "Swift", "recipes" => []}])].each do |reporter|
      refute_includes reporter.comment_body, "[Tophat]"
      refute_includes reporter.comment_body, "To install"
      assert_equal "success", reporter.conclusion
    end
  end

  def test_publishing_updates_the_sticky_comment_with_both_pipeline_links_in_the_footer
    client = Minitest::Mock.new
    client.expect(:get, {"check_runs" => [{"id" => 1, "name" => "ci/bitrise/ci-ios/pr", "head_sha" => "abc123",
      "app" => {"slug" => "bitrise"}, "details_url" => "https://example.com/ios"}]},
      ["/repos/example/repo/commits/abc123/check-runs?check_name=ci%2Fbitrise%2Fci-ios%2Fpr&filter=latest&per_page=100"])
    client.expect(:post_json, {}) { |path, payload| path == "/repos/example/repo/check-runs" && payload[:conclusion] == "success" }
    client.expect(:get, [{"id" => 42, "body" => E2EGitHubReporter::COMMENT_MARKER}], ["/repos/example/repo/issues/1/comments?per_page=100&page=1"])
    client.expect(:patch_json, {}) do |path, payload|
      assert_equal "/repos/example/repo/issues/comments/42", path
      assert_match(/\*\*Bitrise:\*\* \[E2E\]\(https:\/\/example.com\/pipeline\) · \[iOS CI\]\(https:\/\/example.com\/ios\)\z/, payload[:body])
      assert_equal 1, payload[:body].scan("https://example.com/pipeline").length
      true
    end

    report(client: client).publish!
    client.verify
  end

  def test_missing_pipeline_urls_omit_the_footer
    refute_includes report(pipeline_url: nil).comment_body, "**Bitrise:**"
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
