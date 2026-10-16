# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"

class BitriseCIHelpersTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  HELPERS = File.join(REPO_ROOT, "e2e", "scripts", "bitrise_ci_helpers")

  def test_changed_files_are_written_to_a_temporary_file
    Dir.mktmpdir do |directory|
      output, error, status = run_helper(
        "changed_files=\"$(e2e_changed_files_file)\"; printf '%s\\n' \"$changed_files\"; test -f \"$changed_files\"",
        "TMPDIR" => directory,
        "BITRISE_DEPLOY_DIR" => File.join(directory, "deploy"),
        "BITRISE_GIT_BRANCH_DEST" => "HEAD"
      )

      assert status.success?, error
      assert output.chomp.start_with?(directory), output
      refute output.chomp.start_with?(File.join(directory, "deploy")), output
    end
  end

  def test_non_pr_build_treats_every_tracked_file_as_changed
    Dir.mktmpdir do |directory|
      output, error, status = run_helper(
        'changed_files="$(e2e_changed_files_file)"; cat "$changed_files"',
        "TMPDIR" => directory,
        "BITRISE_DEPLOY_DIR" => File.join(directory, "deploy")
      )

      assert status.success?, error
      assert_equal `git ls-files`.lines.sort, output.lines.sort
    end
  end

  def test_false_pull_request_value_treats_every_tracked_file_as_changed
    Dir.mktmpdir do |directory|
      output, error, status = run_helper(
        'changed_files="$(e2e_changed_files_file)"; cat "$changed_files"',
        "TMPDIR" => directory,
        "BITRISE_DEPLOY_DIR" => File.join(directory, "deploy"),
        "BITRISE_PULL_REQUEST" => "false"
      )

      assert status.success?, error
      assert_equal `git ls-files`.lines.sort, output.lines.sort
    end
  end

  def test_non_pr_build_does_not_require_a_github_token
    Dir.mktmpdir do |directory|
      _output, error, status = run_helper(
        "e2e_export_github_token",
        "BITRISE_DEPLOY_DIR" => directory
      )

      assert status.success?, error
    end
  end

  def test_pr_build_fails_when_branch_head_config_cannot_be_read
    Dir.mktmpdir do |directory|
      _output, error, status = run_helper(
        "e2e_branch_bitrise_config",
        "BITRISE_DEPLOY_DIR" => directory,
        "BITRISE_PULL_REQUEST" => "123",
        "BITRISE_GIT_COMMIT" => "missing-commit"
      )

      refute status.success?
      assert_includes error, "Start a fresh build for the current PR head"
    end
  end

  def test_non_pr_build_uses_the_checked_out_config
    Dir.mktmpdir do |directory|
      output, error, status = run_helper(
        "config=\"$(e2e_branch_bitrise_config)\"; cmp e2e/bitrise.yml \"$config\"",
        "BITRISE_DEPLOY_DIR" => directory
      )

      assert status.success?, "#{output}#{error}"
    end
  end

  def test_stale_reruns_stop_planning_and_reporting_even_inside_command_substitution
    %w[e2e_changed_files_file e2e_branch_bitrise_config e2e_export_github_token].each do |helper|
      Dir.mktmpdir do |directory|
        output, error, status = run_helper(
          "result=\"$(#{helper})\"; echo continued",
          "BITRISE_DEPLOY_DIR" => directory,
          "BITRISE_PULL_REQUEST" => "123",
          "BITRISE_GIT_COMMIT" => "a" * 40,
          "GIT_CLONE_COMMIT_HASH" => "b" * 40
        )

        refute status.success?, helper
        refute_includes output, "continued"
        assert_includes error, "Stale PR build"
        assert_includes error, "Start a fresh build"
        refute File.exist?(File.join(directory, "e2e", "branch-bitrise.yml"))
      end
    end
  end

  def test_matching_trigger_and_cloned_head_are_allowed
    Dir.mktmpdir do |directory|
      _output, error, status = run_helper(
        "e2e_assert_pr_checkout",
        "BITRISE_DEPLOY_DIR" => directory,
        "BITRISE_PULL_REQUEST" => "123",
        "BITRISE_GIT_COMMIT" => "a" * 40,
        "GIT_CLONE_COMMIT_HASH" => "a" * 40
      )

      assert status.success?, error
    end
  end

  def test_false_and_zero_pr_values_use_the_checked_out_config
    %w[false 0].each do |value|
      Dir.mktmpdir do |directory|
        output, error, status = run_helper(
          'config="$(e2e_branch_bitrise_config)"; cmp e2e/bitrise.yml "$config"',
          "BITRISE_DEPLOY_DIR" => directory,
          "BITRISE_PULL_REQUEST" => value,
          "BITRISE_GIT_COMMIT" => "old-commit",
          "GIT_CLONE_COMMIT_HASH" => "new-commit"
        )

        assert status.success?, "#{output}#{error}"
      end
    end
  end

  private

  def run_helper(command, environment)
    FileUtils.mkdir_p(environment.fetch("BITRISE_DEPLOY_DIR"))
    Open3.capture3(
      {"BITRISE_PULL_REQUEST" => nil, "BITRISE_GIT_COMMIT" => nil, "GIT_CLONE_COMMIT_HASH" => nil}.merge(environment),
      "bash",
      "-c",
      'source "$1"; eval "$2"',
      "bitrise-ci-helpers-test",
      HELPERS,
      command,
      chdir: REPO_ROOT
    )
  end
end
