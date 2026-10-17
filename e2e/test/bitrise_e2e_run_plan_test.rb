# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "tmpdir"
require_relative "../lib/bitrise_e2e_run_plan"

class BitriseE2ERunPlanTest < Minitest::Test
  MATRIX = File.expand_path("../config/matrix.yml", __dir__)
  PIPELINE = File.expand_path("../bitrise.yml", __dir__)

  def config
    YAML.safe_load_file(PIPELINE, aliases: true)
  end

  def plan(files = nil)
    BitriseE2ERunPlan.load(MATRIX, changed_files: files)
  end

  def test_native_change_selects_only_its_native_target
    env = plan(["platforms/android/lib/src/main/Foo.kt"]).bitrise_env
    assert_equal ["kotlin-android"], JSON.parse(env.fetch("E2E_DIRECT_SELECTED_APPLICATIONS"))
    assert_equal "true", env.fetch("E2E_RUN_KOTLIN_ANDROID")
    assert_equal "false", env.fetch("E2E_RUN_REACT_NATIVE_ANDROID")
  end

  def test_react_native_change_selects_both_react_native_targets
    ids = JSON.parse(plan(["platforms/react-native/src/index.ts"]).bitrise_env.fetch("E2E_DIRECT_SELECTED_APPLICATIONS"))
    assert_equal ["react-native-ios", "react-native-android"], ids
  end

  def test_report_always_runs_after_planner_and_every_target
    graph = config.dig("pipelines", "e2e", "workflows")
    refute graph.fetch("e2e-plan").key?("run_if"), "The planner must run to complete the required pipeline"
    report = graph.fetch("e2e-report")
    refute report.key?("run_if")
    assert_equal "workflow", report.fetch("should_always_run")
    assert_equal (graph.keys - ["e2e-report"]).sort, report.fetch("depends_on").sort
    refute graph.keys.any? { |name| name.include?("browserstack") || name.start_with?("e2e-build-") }
  end

  def test_plan_flags_and_pipeline_conditions_stay_in_sync
    graph = config.dig("pipelines", "e2e", "workflows")
    flags = graph.filter_map do |name, workflow|
      next if ["e2e-plan", "e2e-report"].include?(name)

      assert_equal ["e2e-plan"], workflow.fetch("depends_on")
      workflow.dig("run_if", "expression")[/enveq "(E2E_RUN_[A-Z_]+)" "true"/, 1]
    end
    assert_equal plan.bitrise_env.keys.grep(/^E2E_RUN_/).sort, flags.sort
    plan.ensure_pipeline_coverage!(config)
  end

  def test_each_target_shares_its_own_summary_with_the_reporter
    plan.selected_applications.each do |application|
      id = application.fetch("id")
      steps = config.dig("workflows", "e2e-maestro-#{id}", "steps")
      export = steps.filter_map { |step| step["bundle::export-maestro-results"] }.fetch(0)
      assert_equal "E2E_MAESTRO_#{id.upcase.tr('-', '_')}_RESULT", export.fetch("inputs").fetch(0).fetch("result_variable")
    end
    share = config.dig("step_bundles", "export-maestro-results", "steps").filter_map { |step| step["share-pipeline-variable@1"] }.fetch(0)
    assert_equal true, share.fetch("is_always_run")
    assert_equal '{{getenv "BITRISEIO_PIPELINE_ID" | ne ""}}', share.fetch("run_if"), "Standalone workflow runs must not require pipeline sharing"
    assert_equal "$result_variable", share.fetch("inputs").fetch(0).fetch("variables")
  end

  def test_export_preserves_summary_json_and_handles_failure_before_tests_start
    publish = config.dig("step_bundles", "export-maestro-results", "steps").fetch(0).fetch("script@1")
    assert_equal true, publish.fetch("is_always_run")
    script = publish.fetch("inputs").fetch(0).fetch("content")
    Dir.mktmpdir do |directory|
      report_path = File.join(directory, "junit.xml")
      result = JSON.generate(passed: true, retry_count: 1, max_retries: 2, duration_seconds: 125.5)
      [nil, result].each do |summary|
        File.write("#{report_path}.summary.json", summary) if summary
        env = {"E2E_JUNIT_REPORT" => report_path, "result_variable" => "E2E_MAESTRO_SWIFT_IOS_RESULT"}
        output, status = Open3.capture2e(env, "bash", "-c", "envman() { printf '%s\\n' \"$@\"; }\n#{script}")
        assert status.success?, output
        assert_equal ["add", "--key", "E2E_MAESTRO_SWIFT_IOS_RESULT", "--value", summary || "{}"], output.lines.map(&:chomp)
      end
    end
  end

  def test_unrelated_changes_publish_an_explicit_empty_plan
    [
      [],
      ["platforms/web/src/components/shopify-checkout/shopify-checkout.ts"],
      [".github/workflows/protocol-test.yml", ".github/workflows/rn-test.yml", ".github/workflows/web.yml"],
      ["README.md"],
      ["platforms/react-native/docs/assets/screenshot.png"]
    ].each do |files|
      env = plan(files).bitrise_env
      assert_equal "true", env.fetch("E2E_DIRECT_PLAN_READY")
      assert_equal "[]", env.fetch("E2E_DIRECT_SELECTED_APPLICATIONS")
      assert env.select { |key, _| key.start_with?("E2E_RUN_") }.values.all? { |value| value == "false" }
    end
  end

  def test_missing_selected_graph_or_workflow_definition_fails
    [config.fetch("workflows"), config.dig("pipelines", "e2e", "workflows")].each_with_index do |_, index|
      candidate = config
      container = index.zero? ? candidate.fetch("workflows") : candidate.dig("pipelines", "e2e", "workflows")
      container.delete("e2e-maestro-swift-ios")
      error = assert_raises(RuntimeError) { plan.ensure_pipeline_coverage!(candidate) }
      assert_includes error.message, "e2e-maestro-swift-ios"
    end
    plan([]).ensure_pipeline_coverage!({})
  end

  def test_additional_os_coverage_is_rejected_instead_of_silently_dropped
    matrix = YAML.safe_load_file(MATRIX)
    matrix["os_version_tags"] << "minimum"
    error = assert_raises(RuntimeError) { BitriseE2ERunPlan.new(MATRIX, matrix).bitrise_env }
    assert_includes error.message, "one pinned simulator/emulator"
  end
end
