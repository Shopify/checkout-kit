# frozen_string_literal: true

require "minitest/autorun"
require "json"
require "open3"
require "tmpdir"
require "yaml"
require_relative "../lib/e2e_matrix_to_browserstack_run_plan"

class BrowserStackPipelineTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)
  CONFIG_PATH = File.join(ROOT, "e2e/bitrise.yml")
  PLANNER = File.join(ROOT, "e2e/scripts/e2e_matrix_to_browserstack_run_plan")
  REPORTER = File.join(ROOT, "e2e/scripts/report_e2e_results")

  def config
    YAML.safe_load_file(CONFIG_PATH, aliases: true)
  end

  def test_optional_pipeline_has_no_automatic_triggers_and_keeps_required_pipeline_separate
    pipeline = config.fetch("pipelines").fetch("e2e-browserstack")
    refute pipeline.key?("triggers")
    assert_equal "ci/bitrise/<target_id>/<event_type>", pipeline.fetch("status_report_name")
    graph = pipeline.fetch("workflows")
    graph.each do |name, workflow|
      definition = config.fetch("workflows").fetch(name)
      refute definition.key?("triggers")
      Array(workflow["depends_on"]).each { |dependency| assert graph.key?(dependency), dependency }
    end
    refute config.dig("pipelines", "e2e", "workflows").keys.any? { |name| name.include?("browserstack") }

    report = graph.fetch("e2e-browserstack-report")
    refute report.key?("run_if")
    assert_equal "workflow", report.fetch("should_always_run")
    assert_includes report.fetch("depends_on"), "e2e-produce-browserstack-run-plan"
    assert_includes report.fetch("depends_on"), "e2e-execute-browserstack-run"
  end

  def test_manual_plan_builds_every_selected_target_before_parallel_execution
    plan = E2EMatrixToBrowserStackRunPlan.load(File.join(ROOT, "e2e/config/matrix.yml"))
    graph = config.dig("pipelines", "e2e-browserstack", "workflows")
    env = plan.bitrise_env
    builds = plan.selected_applications.map { |app| "e2e-build-#{app.fetch("id")}" }
    builds.each do |name|
      workflow = graph.fetch(name)
      flag = workflow.dig("run_if", "expression")[/enveq "([A-Z0-9_]+)" "true"/, 1]
      assert_equal "true", env.fetch(flag)
      assert_equal ["e2e-produce-browserstack-run-plan"], workflow.fetch("depends_on")
    end
    execute = graph.fetch("e2e-execute-browserstack-run")
    assert_equal (builds + ["e2e-produce-browserstack-run-plan"]).sort, execute.fetch("depends_on").sort
    assert_equal "$E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT", execute.fetch("parallel")
    assert_equal plan.count.to_s, env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
  end

  def test_planner_checks_the_optional_graph_instead_of_the_default_direct_graph
    stdout, stderr, status = Open3.capture3(RbConfig.ruby, PLANNER, "assert-pipeline-coverage",
      "--pipeline", "e2e-browserstack", "--pipeline-config", CONFIG_PATH)
    assert status.success?, stdout + stderr
    _, stderr, status = Open3.capture3(RbConfig.ruby, PLANNER, "assert-pipeline-coverage",
      "--pipeline", "e2e", "--pipeline-config", CONFIG_PATH)
    refute status.success?
    assert_includes stderr, "no 'e2e-build-"
  end

  def test_manual_report_succeeds_without_pr_or_credentials
    stdout, stderr, status = report(results: [{"passed" => true}], expected: "1")
    assert status.success?, stderr
    assert_includes stdout, "Checkout Kit E2E results"
  end

  def test_manual_report_does_not_publish_even_when_associated_with_a_pr
    _, stderr, status = report(results: [{"passed" => true}], expected: "1", pr: "123")
    assert status.success?, stderr
  end

  def test_manual_report_fails_on_failed_or_missing_results
    stdout, _, status = report(results: [{"passed" => false}], expected: "1")
    refute status.success?
    assert_includes stdout, "Failures"
    stdout, _, status = report(results: [], expected: "1")
    refute status.success?
    assert_includes stdout, "Expected 1 run"
  end

  def test_manual_report_requires_a_known_plan_but_accepts_an_explicit_empty_plan
    _, stderr, status = report(results: [], expected: nil)
    refute status.success?
    assert_includes stderr, "Expected BrowserStack run count is required"
    stdout, stderr, status = report(results: [], expected: "0")
    assert status.success?, stderr
    assert_includes stdout, "No native E2E runs were selected"
  end

  private

  def report(results:, expected:, pr: nil)
    Dir.mktmpdir("browserstack-report-test") do |dir|
      results.each_with_index do |result, index|
        payload = {"id" => "example-run-#{index}", "target" => "swift", "platform" => "ios",
          "os_version_tag" => "latest", "build_id" => "example-build"}.merge(result)
        run_dir = File.join(dir, "run-#{index}")
        Dir.mkdir(run_dir)
        File.write(File.join(run_dir, "result.json"), JSON.generate(payload))
      end
      env = {"BITRISE_PULL_REQUEST" => pr, "BITRISE_GIT_COMMIT" => nil,
        "BITRISE_GIT_BRANCH" => nil, "OVERRIDE_GITHUB_TOKEN" => nil, "GIT_HTTP_PASSWORD" => nil,
        "GITHUB_TOKEN" => nil, "E2E_BROWSERSTACK_RUN_PLAN_COUNT" => expected,
        "E2E_BROWSERSTACK_RUN_PLAN_JSON" => nil, "BITRISEIO_FINISHED_WORKFLOWS" => nil,
        "BITRISEIO_PIPELINE_BUILD_URL" => nil}
      Open3.capture3(env, RbConfig.ruby, REPORTER, "--no-publish", "--results-root", dir)
    end
  end
end
