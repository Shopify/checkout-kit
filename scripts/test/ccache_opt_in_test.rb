# frozen_string_literal: true

require "minitest/autorun"

class CcacheOptInTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  PODFILES = [
    "platforms/react-native/sample/ios/Podfile",
    "platforms/react-native/test/rct-integration-app/Podfile"
  ].freeze

  def test_ccache_is_read_from_the_environment_rather_than_hardcoded
    offenders = PODFILES.flat_map do |relative_path|
      path = File.join(REPO_ROOT, relative_path)

      File.readlines(path, chomp: true).each_with_index.filter_map do |line, index|
        next unless line.include?(":ccache_enabled")
        next if line.include?("CCACHE_ENABLED")

        "#{relative_path}:#{index + 1}: #{line.strip}"
      end
    end

    assert_empty(
      offenders,
      "Gate ccache behind CCACHE_ENABLED so a local run cannot silently differ from CI:"
    )
  end

  IOS_BUILD_SCRIPTS = [
    "platforms/react-native/sample/scripts/build_ios",
    "platforms/react-native/sample/scripts/test_ios"
  ].freeze

  # React Native's ccache-clang.sh runs `exec $CCACHE_BINARY clang`. pod install writes
  # CCACHE_BINARY as an Xcode build setting, which never reaches the compiler's
  # environment, so without an export the wrapper execs a bare clang and caches nothing.
  # It still builds and still passes, which is why this needs a test rather than a comment.
  def test_the_ios_build_scripts_export_the_ccache_binary
    missing = IOS_BUILD_SCRIPTS.reject do |relative_path|
      File.read(File.join(REPO_ROOT, relative_path)).match?(/export CCACHE_BINARY/)
    end

    assert_empty(
      missing,
      "These scripts enable ccache without exporting CCACHE_BINARY, so ccache never runs:"
    )
  end

  def test_the_committed_xcode_project_carries_no_compiler_wrapper
    relative_path = "platforms/react-native/sample/ios/CheckoutKitReactNativeDemo.xcodeproj/project.pbxproj"

    offenders = File.readlines(File.join(REPO_ROOT, relative_path), chomp: true)
      .each_with_index
      .filter_map do |line, index|
        next unless line.match?(/CCACHE_BINARY|ccache-clang/)

        "#{relative_path}:#{index + 1}: #{line.strip}"
      end

    assert_empty(
      offenders,
      "A ccache-enabled pod install rewrites this project with an absolute local ccache " \
        "path. Restore it with git checkout before committing:"
    )
  end

  def test_no_script_or_config_turns_ccache_on_by_default
    globs = [".github/workflows/*.{yml,yaml}", "platforms/react-native/**/scripts/*", "dev.yml"]

    offenders = globs.flat_map { |glob| Dir[File.join(REPO_ROOT, glob)] }
      .sort.uniq.reject { |path| File.directory?(path) }
      .flat_map do |path|
        File.readlines(path, chomp: true).each_with_index.filter_map do |line, index|
          next if line.match?(/\A\s*#/)
          next unless line.match?(/CCACHE_ENABLED\s*[=:]\s*["']?1/)

          "#{path.delete_prefix("#{REPO_ROOT}/")}:#{index + 1}: #{line.strip}"
        end
      end

    assert_empty(
      offenders,
      "CCACHE_ENABLED belongs on the Bitrise workflows that opt in, not in a shared default:"
    )
  end
end
