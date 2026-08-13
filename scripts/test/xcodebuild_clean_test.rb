# frozen_string_literal: true

require "minitest/autorun"

class XcodebuildCleanTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  # Scripts CI invokes directly. Developer-only entry points such as
  # platforms/swift/Scripts/build_samples keep `clean`, where a stale local
  # DerivedData tree is a real failure mode and the rebuild costs nobody CI time.
  CI_BUILD_SCRIPTS = [
    "platforms/react-native/sample/scripts/build_ios",
    "platforms/react-native/sample/scripts/test_ios",
    "platforms/swift/Scripts/build_and_test_samples"
  ].freeze

  def test_ci_build_scripts_do_not_clean_before_building
    offenders = CI_BUILD_SCRIPTS.flat_map do |relative_path|
      path = File.join(REPO_ROOT, relative_path)

      File.readlines(path, chomp: true).each_with_index.filter_map do |line, index|
        next unless line.match?(/\bclean\b/) && line.match?(/xcodebuild|xcode_run|run_app/)

        "#{relative_path}:#{index + 1}: #{line.strip}"
      end
    end

    assert_empty(
      offenders,
      "A CI runner starts with no build products, so `clean` only deletes a restored cache:"
    )
  end
end
