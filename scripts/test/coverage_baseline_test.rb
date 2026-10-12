require "minitest/autorun"
require "yaml"
require "tmpdir"
require "open3"
require "fileutils"

class CoverageBaselineTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)

  def setup
    @workflow = YAML.safe_load_file(File.join(ROOT, ".github/workflows/coverage-baseline.yml"))
    @job = @workflow.fetch("jobs").fetch("test")
    @steps = @job.fetch("steps")
    @ci = YAML.safe_load_file(File.join(ROOT, ".github/workflows/ci.yml"))
  end

  def test_baselines_use_the_exact_pr_base_in_a_separate_checkout_without_persisted_credentials
    checkout = @steps.find { |step| step.dig("with", "path") == ".coverage-base" }
    assert_equal "${{ github.event.pull_request.base.sha }}", checkout.dig("with", "ref")
    @steps.select { |step| step.fetch("uses", "").start_with?("actions/checkout@") }.each do |step|
      assert_equal false, step.dig("with", "persist-credentials")
    end
    assert_equal true, @job.fetch("continue-on-error")
    refute @job.fetch("permissions").key?("pull-requests") && @job.dig("permissions", "pull-requests") == "write"
    assert_equal "${{ github.event.pull_request.base.sha }}", @steps.last.dig("env", "COVERAGE_BASE_SHA")
    assert_equal "base", @steps.last.dig("env", "COVERAGE_REVISION")
  end

  def test_only_affected_pr_packages_get_optional_baselines
    %w[web react-native protocol].zip(%w[web reactNative protocol]).each do |platform, area|
      name = "coverage-base-#{platform}"
      job = @ci.fetch("jobs").fetch(name)
      assert_equal "github.event_name == 'pull_request' && needs.changes.outputs.#{area} == 'true'", job.fetch("if")
      assert_equal platform, job.dig("with", "platform")
      refute_includes @ci.dig("jobs", "ci-required", "needs"), name
    end
  end

  def test_each_baseline_runs_the_same_test_command_as_its_pr_package
    Dir.mktmpdir do |directory|
      stub = File.join(directory, "pnpm")
      File.write(stub, "#!/usr/bin/env ruby\nputs ARGV.inspect\n")
      FileUtils.chmod(0o755, stub)
      baseline = @steps.find { |step| step["id"] == "tests" }.fetch("run")
      {"web" => "web.yml", "react-native" => "rn-test.yml", "protocol" => "protocol-test.yml"}.each do |platform, file|
        workflow = YAML.safe_load_file(File.join(ROOT, ".github/workflows", file))
        head = workflow.fetch("jobs").values.flat_map { |job| job.fetch("steps", []) }.find { |step| step["id"] == "coverage_tests" }.fetch("run")
        env = {"COVERAGE_PLATFORM" => platform, "PATH" => "#{directory}:#{ENV.fetch('PATH')}"}
        expected, head_error, head_status = Open3.capture3(env, "bash", "-c", head)
        actual, base_error, base_status = Open3.capture3(env, "bash", "-c", baseline)
        assert head_status.success?, head_error
        assert base_status.success?, base_error
        assert_equal expected, actual, platform
      end
    end
  end
end
