# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "json"
require "open3"
require "tmpdir"
require "yaml"

class PackageSizeWorkflowTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)
  WORKFLOW = YAML.safe_load_file(File.join(ROOT, ".github/workflows/package-size.yml"))
  CHANGES = WORKFLOW.fetch("jobs").fetch("changes")

  def test_measurement_runs_only_when_at_least_one_package_is_selected
    assert_equal "needs.changes.outputs.any == 'true'", WORKFLOW.dig("jobs", "measure", "if")
    assert_equal "${{ steps.selected.outputs.any }}", CHANGES.dig("outputs", "any")
    select = CHANGES.fetch("steps").find { |step| step["id"] == "selected" }

    %w[false true].repeated_permutation(3) do |android, react_native, web|
      Dir.mktmpdir do |directory|
        output_file = File.join(directory, "outputs")
        output, status = Open3.capture2e(
          { "MEASURE_ANDROID" => android, "MEASURE_REACT_NATIVE" => react_native,
            "MEASURE_WEB" => web, "GITHUB_OUTPUT" => output_file },
          "bash", "-e", "-o", "pipefail", "-c", select.fetch("run")
        )
        assert status.success?, output
        selected = File.readlines(output_file, chomp: true).to_h { |line| line.split("=", 2) }
        assert_equal({ "android" => android, "reactNative" => react_native, "web" => web,
                       "any" => [android, react_native, web].include?("true").to_s }, selected)
      end
    end

    %w[android reactNative web].each do |platform|
      assert_equal "${{ steps.selected.outputs.#{platform} }}", CHANGES.dig("outputs", platform)
    end
    %w[Resolve\ current\ PR\ base\ for\ empty\ report Prepare\ empty\ budget\ report Upload\ empty\ report].each do |name|
      step = CHANGES.fetch("steps").find { |candidate| candidate["name"] == name }
      assert_equal "steps.selected.outputs.any == 'false'", step.fetch("if")
    end
  end

  def test_empty_report_satisfies_the_publisher_without_platform_sources_or_build_tools
    with_report_fixture do |directory, step, env|
      output, status = Open3.capture2e(env, "bash", "-e", "-o", "pipefail", "-c", step.fetch("run"), chdir: directory)
      assert status.success?, output
      report = JSON.parse(File.read(File.join(directory, "bundle-size-report/report.json")))
      assert_equal "head", report.fetch("headSha")
      assert_equal "current-base", report.fetch("baseSha")
      assert_empty report.fetch("measuredPlatforms")
      assert_empty report.fetch("base")
      assert_empty report.fetch("head")
      assert File.read(File.join(directory, "bundle-size-report/comment.md")).start_with?("<!-- checkout-kit-package-size -->")

      script = <<~JS
        const assert = require('node:assert/strict');
        const {validateReport} = require('./.github/scripts/publish-bundle-size.cjs');
        const policy = require('./.github/scripts/bundle-size-budgets.cjs');
        const report = require('./bundle-size-report/report.json');
        const pr = {number: 1, head: {sha: 'head'}, base: {sha: 'current-base'}};
        validateReport(report, pr, {head_sha: 'head'});
        assert.equal(policy.conclusion(policy.evaluate(report)), 'success');
        pr.base.sha = 'newer-base';
        assert.throws(() => validateReport(report, pr, {head_sha: 'head'}));
      JS
      output, status = Open3.capture2e("node", "-e", script, chdir: directory)
      assert status.success?, output
    end
  end

  def test_empty_report_still_rejects_invalid_budget_configuration
    with_report_fixture do |directory, step, env|
      File.write(File.join(directory, ".ci/bundle-size-budgets.json"), '{"unknown": {}}')
      output, status = Open3.capture2e(env, "bash", "-e", "-o", "pipefail", "-c", step.fetch("run"), chdir: directory)
      refute status.success?, output
      refute File.exist?(File.join(directory, "bundle-size-report/report.json"))
    end
  end

  private

  def with_report_fixture
    step = CHANGES.fetch("steps").find { |candidate| candidate["name"] == "Prepare empty budget report" }
    assert_equal "${{ steps.base.outputs.sha }}", step.dig("env", "BASE_SHA")
    Dir.mktmpdir do |directory|
      %w[.github/scripts/bundle-size-budgets.cjs .github/scripts/publish-bundle-size.cjs
         .github/scripts/measure-package-size .ci/bundle-size-budgets.json].each do |path|
        FileUtils.mkdir_p(File.dirname(File.join(directory, path)))
        FileUtils.cp(File.join(ROOT, path), File.join(directory, path))
      end
      event_path = File.join(directory, "event.json")
      File.write(event_path, { pull_request: { number: 1, head: { sha: "head" }, base: { sha: "event-base" } } }.to_json)
      env = step.fetch("env").merge("BASE_SHA" => "current-base", "GITHUB_EVENT_PATH" => event_path, "RUNNER_TEMP" => directory)
      yield directory, step, env
    end
  end
end
