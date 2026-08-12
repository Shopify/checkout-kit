# frozen_string_literal: true

require "minitest/autorun"

class CocoapodsRepoUpdateTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  WORKFLOW_GLOB = File.join(REPO_ROOT, ".github/workflows/*.{yml,yaml}")
  CI_SCRIPT_GLOB = File.join(REPO_ROOT, "platforms/react-native/sample/scripts/*")

  def test_deployment_mode_pod_install_never_refreshes_the_spec_repo
    offenders = lines_in(WORKFLOW_GLOB).select do |_path, _number, line|
      line.include?("pod install") && line.include?("--deployment") && line.include?("--repo-update")
    end

    assert_empty(
      format_offenders(offenders),
      "--deployment forbids lockfile changes, so --repo-update cannot change the resolved pods:"
    )
  end

  def test_spec_repo_refresh_in_ci_scripts_is_opt_in
    offenders = lines_in(CI_SCRIPT_GLOB).select do |_path, _number, line|
      line.include?("--repo-update") && !line.include?("POD_REPO_UPDATE") && !line.include?("pod update")
    end

    assert_empty(
      format_offenders(offenders),
      "Gate --repo-update behind POD_REPO_UPDATE so CI does not pay for a refresh it cannot use:"
    )
  end

  private

  def lines_in(glob)
    Dir[glob].sort.reject { |path| File.directory?(path) }.flat_map do |path|
      File.readlines(path, chomp: true).each_with_index.map { |line, index| [path, index + 1, line] }
    end
  end

  def format_offenders(offenders)
    offenders.map do |path, number, line|
      "#{path.delete_prefix("#{REPO_ROOT}/")}:#{number}: #{line.strip}"
    end
  end
end
