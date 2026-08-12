# frozen_string_literal: true

require "minitest/autorun"

class XcbeautifyUsageTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  SCRIPT_GLOBS = [
    "platforms/swift/Scripts/*",
    "platforms/react-native/sample/scripts/*"
  ].freeze

  def scripts
    SCRIPT_GLOBS
      .flat_map { |glob| Dir[File.join(REPO_ROOT, glob)] }
      .reject { |path| File.directory?(path) }
      .select { |path| File.read(path).include?("xcbeautify") }
      .sort
  end

  def relative(path)
    path.delete_prefix("#{REPO_ROOT}/")
  end

  def test_every_pipe_into_xcbeautify_falls_back_when_it_is_absent
    unguarded = scripts.reject do |path|
      contents = File.read(path)
      !contents.include?("| xcbeautify") || contents.include?("command -v xcbeautify")
    end

    assert_empty unguarded.map { |path| relative(path) },
      "Piping into xcbeautify without a fallback fails on any runner that lacks it:"
  end

  def test_the_github_actions_renderer_is_selected_by_github_actions
    offenders = scripts.flat_map do |path|
      lines = File.readlines(path, chomp: true)
      lines.each_with_index.filter_map do |line, index|
        next unless line.include?("--renderer github-actions")
        next if lines[[index - 1, 0].max].include?("GITHUB_ACTIONS")

        "#{relative(path)}:#{index + 1}: #{lines[[index - 1, 0].max].strip}"
      end
    end

    assert_empty offenders,
      "CI is true on Bitrise too, and its log viewer cannot read GitHub Actions grouping commands:"
  end
end
