# frozen_string_literal: true

require "fileutils"
require "json"
require "minitest/autorun"
require "open3"
require "tmpdir"
require "yaml"

class BitriseE2EPipelineTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)
  CONFIG = YAML.safe_load_file(File.join(ROOT, "e2e/bitrise.yml"), aliases: true)
  MATRIX = YAML.safe_load_file(File.join(ROOT, "e2e/config/matrix.yml"))

  def test_each_application_has_an_independent_static_pipeline
    MATRIX.fetch("applications").each do |application|
      id = application.fetch("id")
      pipeline = CONFIG.fetch("pipelines").fetch("e2e-#{id}")
      workflows = pipeline.fetch("workflows")
      planner = "e2e-produce-browserstack-run-plan"
      builder = "e2e-build-#{id}"
      executor = "e2e-execute-browserstack-run"

      assert_equal [planner, builder, executor, "e2e-report"].sort, workflows.keys.sort
      assert_equal [planner], workflows.fetch(builder).fetch("depends_on")
      assert_equal [planner, builder].sort, workflows.fetch(executor).fetch("depends_on").sort
      refute workflows.values.any? { |workflow| workflow.key?("parallel") }, "Dynamic copies prevent partial retries"
      assert_equal "workflow", workflows.fetch("e2e-report").fetch("should_always_run")
      assert_equal [executor], workflows.fetch("e2e-report").fetch("depends_on")
      assert_equal "ci/bitrise/<target_id>/<event_type>", pipeline.fetch("status_report_name")
    end
  end

  def test_failed_tests_still_publish_intermediate_results
    steps = CONFIG.fetch("workflows").fetch("e2e-execute-browserstack-run").fetch("steps")
    deploy = steps.find { |step| step.key?("deploy-to-bitrise-io@2") }.fetch("deploy-to-bitrise-io@2")

    assert_equal true, deploy.fetch("is_always_run")
    assert_includes deploy.fetch("inputs").find { |input| input.key?("pipeline_intermediate_files") }.values.first,
      "$BITRISE_DEPLOY_DIR/e2e/results:E2E_BROWSERSTACK_RESULTS_DIR"
  end

  def test_coverage_checks_the_selected_pipeline_instead_of_neighbouring_apps
    output, error, status = matrix_cli("assert-pipeline-coverage", "--application", "swift-ios",
      "--pipeline-config", File.join(ROOT, "e2e/bitrise.yml"), "--changed-file", "protocol/schemas/ucp.json")

    assert status.success?, "#{output}#{error}"
  end

  def test_a_stale_branch_without_the_application_pipeline_fails_closed
    Dir.mktmpdir do |dir|
      config = File.join(dir, "bitrise.yml")
      File.write(config, YAML.dump("pipelines" => {"e2e" => CONFIG.fetch("pipelines").fetch("e2e-swift-ios")}))
      _output, error, status = matrix_cli("assert-pipeline-coverage", "--application", "swift-ios",
        "--pipeline-config", config, "--changed-file", "README.md")

      refute status.success?
      assert_includes error, "No 'e2e-swift-ios' pipeline"
    end
  end

  # Execute the actual YAML script with a synthetic runner. This catches shell
  # early-exit mistakes which would lose later OS results after a failed first run.
  def test_an_os_failure_keeps_later_results_and_fails_the_workflow
    run_test_workflow(failing_index: "0") do |dir, status, output|
      refute status.success?, output
      assert_equal [false, true], results(dir).map { |result| result.fetch("passed") }
    end
  end

  def test_all_os_runs_passing_succeeds
    run_test_workflow(failing_index: "none") do |dir, status, output|
      assert status.success?, output
      assert_equal [true, true], results(dir).map { |result| result.fetch("passed") }
    end
  end

  private

  def matrix_cli(*args)
    Open3.capture3("ruby", File.join(ROOT, "e2e/scripts/e2e_matrix_to_browserstack_run_plan"), *args, chdir: ROOT)
  end

  def results(dir)
    Dir.glob(File.join(dir, "deploy/e2e/results/**/result.json")).sort.map { |path| JSON.parse(File.read(path)) }
  end

  def run_test_workflow(failing_index:)
    steps = CONFIG.fetch("workflows").fetch("e2e-execute-browserstack-run").fetch("steps")
    script = steps.find { |step| step.key?("script@1") }.fetch("script@1").fetch("inputs").first.fetch("content")
    Dir.mktmpdir do |dir|
      scripts = File.join(dir, "e2e/scripts")
      FileUtils.mkdir_p(scripts)
      FileUtils.cp(File.join(ROOT, "e2e/scripts/bitrise_ci_helpers"), scripts)
      runner = File.join(scripts, "execute_browserstack_run")
      File.write(runner, <<~'RUBY')
        #!/usr/bin/env ruby
        require "fileutils"
        require "json"
        options = ARGV.each_slice(2).to_h
        dir = options.fetch("--output-dir")
        FileUtils.mkdir_p(dir)
        passed = options.fetch("--index") != ENV.fetch("TEST_FAILING_INDEX")
        File.write(File.join(dir, "result.json"), JSON.generate("passed" => passed))
        exit(passed ? 0 : 1)
      RUBY
      FileUtils.chmod(0o755, runner)
      env = {
        "TEST_FAILING_INDEX" => failing_index,
        "BITRISE_DEPLOY_DIR" => File.join(dir, "deploy"),
        "E2E_BROWSERSTACK_RUN_PLAN_COUNT" => "2",
        "E2E_BROWSERSTACK_RUN_PLAN_JSON" => "synthetic-plan.json",
        "E2E_TESTS_ZIP" => "synthetic-tests.zip",
        "BROWSERSTACK_USERNAME" => "synthetic-user",
        "BROWSERSTACK_ACCESS_KEY" => "synthetic-key"
      }
      output, error, status = Open3.capture3(env, "bash", "-c", "envman() { :; }\n#{script}", chdir: dir)
      yield dir, status, "#{output}#{error}"
    end
  end
end
