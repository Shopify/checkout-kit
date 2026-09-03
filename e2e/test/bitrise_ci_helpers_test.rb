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
      assert_includes error, "Rebase on main"
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

  private

  def run_helper(command, environment)
    FileUtils.mkdir_p(environment.fetch("BITRISE_DEPLOY_DIR"))
    Open3.capture3(
      environment,
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
