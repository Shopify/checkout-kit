# frozen_string_literal: true

require "minitest/autorun"
require "yaml"
require "json"
require "tmpdir"
require "fileutils"
require "open3"

class LintFormatCommandsTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)
  DETEKT_BUILDS = %w[
    platforms/android/build-logic/src/main/groovy/shopify.android-feature.gradle
    platforms/android/samples/CheckoutKitAndroidDemo/app/build.gradle
    protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/kotlin/embedded-checkout-protocol/build.gradle
  ].freeze

  def setup
    @dev = YAML.safe_load_file(File.join(ROOT, "dev.yml"), aliases: true)
  end

  def test_plain_detekt_is_read_only_in_every_build
    DETEKT_BUILDS.each do |path|
      source = File.read(File.join(ROOT, path))
      assert_match(/autoCorrect = false/, source, path)
      refute_match(/autoCorrect = true/, source, path)
    end
  end

  def test_android_and_protocol_formatting_opt_in_to_corrections
    %w[android protocol].each do |platform|
      commands = @dev.fetch("commands").fetch(platform).fetch("subcommands")
      assert_includes commands.fetch("format").fetch("aliases"), "fix"
      assert_includes commands.fetch("format").fetch("run"), "--auto-correct"
      refute_includes commands.fetch("lint").fetch("run"), "--auto-correct"
    end
  end

  def test_swift_format_propagates_either_tools_failure
    manifest = JSON.parse(File.read(File.join(ROOT, "platforms/react-native/package.json")))
    format_command = manifest.fetch("scripts").fetch("format:swift")
    %w[swiftlint swiftformat].each do |failing_tool|
      Dir.mktmpdir("rn-format") do |root|
        platform = File.join(root, "platforms/react-native")
        FileUtils.mkdir_p([File.join(platform, "scripts"), File.join(root, "scripts"), File.join(root, "platforms/swift")])
        script = File.join(platform, "scripts/lint_swift")
        FileUtils.cp(File.join(ROOT, "platforms/react-native/scripts/lint_swift"), script)
        {
          "scripts/check_xcodebuild_package_resolution" => "exit 0",
          "scripts/swift_mint" => "echo \"#{root}/scripts/$2\"",
          "scripts/swiftlint" => "exit #{failing_tool == 'swiftlint' ? 1 : 0}",
          "scripts/swiftformat" => "exit #{failing_tool == 'swiftformat' ? 1 : 0}"
        }.each do |path, body|
          File.write(File.join(root, path), "#!/bin/bash\n#{body}\n")
          File.chmod(0o755, File.join(root, path))
        end

        output, status = Open3.capture2e("bash", "-c", format_command, chdir: platform)
        refute status.success?, "#{failing_tool} failure must fail formatting: #{output}"
        assert_includes output, "fixes could not be completed"
      end
    end
  end

  def test_rn_format_covers_the_same_source_scopes_as_lint
    root = JSON.parse(File.read(File.join(ROOT, "platforms/react-native/package.json")))
    sample = JSON.parse(File.read(File.join(ROOT, "platforms/react-native/sample/package.json")))
    assert_equal "eslint src components internal --fix", root.dig("scripts", "format")
    assert_equal "./scripts/lint_swift fix", root.dig("scripts", "format:swift")
    assert_equal "eslint . --fix", sample.dig("scripts", "format")
    [root, sample].each { |manifest| refute_includes manifest.dig("scripts", "lint"), "--fix" }

    command = @dev.dig("commands", "react-native", "subcommands", "format")
    assert_includes command.fetch("aliases"), "fix"
    assert_includes command.fetch("run"), "pnpm module format"
    assert_includes command.fetch("run"), "pnpm sample format"
    assert_includes command.fetch("run"), "pnpm module format:swift"
    refute_includes command.fetch("run"), "./scripts/lint_swift"
    assert_includes command.fetch("run"), "set -e"
  end
end
