# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "yaml"

class RunLocalE2ETest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  RUNNER = File.join(REPO_ROOT, "e2e", "scripts", "run_local_e2e")
  REMOVED_RUNNERS = [
    "e2e/scripts/parse_maestro_tag_args",
    "e2e/scripts/run_local_maestro",
    "platforms/android/scripts/e2e_maestro",
    "platforms/react-native/scripts/e2e_maestro_android",
    "platforms/react-native/scripts/e2e_maestro_ios",
    "platforms/swift/Scripts/e2e_maestro"
  ].freeze
  TARGETS = {
    "swift-ios" => ["ios", "com.shopify.checkoutkit.swiftdemo", "platforms/swift"],
    "kotlin-android" => ["android", "com.shopify.checkoutkit.androiddemo", "platforms/android"],
    "react-native-ios" => ["ios", "com.shopify.checkoutkit.reactnativedemo", "platforms/react-native"],
    "react-native-android" => ["android", "com.shopify.checkoutkit.reactnativedemo", "platforms/react-native"]
  }.freeze

  def test_runner_is_executable_bash
    assert File.executable?(RUNNER)

    _output, error, status = Open3.capture3("bash", "-n", RUNNER)

    assert status.success?, error
  end

  def test_every_target_configures_its_platform_app_and_workspace
    TARGETS.each do |target, expected|
      output, error, status = Open3.capture3(
        "bash",
        "-c",
        'source "$1"; configure_target "$2"; printf "%s\n%s\n%s\n" "$PLATFORM" "$APP_ID" "$ROOT_DIR"',
        "run-local-e2e-test",
        RUNNER,
        target
      )

      assert status.success?, error
      platform, app_id, root_dir = output.lines.map(&:chomp)
      assert_equal expected, [platform, app_id, root_dir.delete_prefix("#{REPO_ROOT}/")]
    end
  end

  def test_dev_commands_dispatch_to_the_central_runner
    commands = YAML.safe_load_file(File.join(REPO_ROOT, "dev.yml")).fetch("commands")

    assert_equal './e2e/scripts/run_local_e2e kotlin-android "$@"', commands.dig("android", "subcommands", "e2e", "run")
    assert_equal './e2e/scripts/run_local_e2e swift-ios "$@"', commands.dig("swift", "subcommands", "e2e", "run")
    assert_equal './e2e/scripts/run_local_e2e react-native-ios "$@"', commands.dig("react-native", "subcommands", "e2e", "subcommands", "ios", "run")
    assert_equal './e2e/scripts/run_local_e2e react-native-android "$@"', commands.dig("react-native", "subcommands", "e2e", "subcommands", "android", "run")
  end

  def test_runner_owns_tag_argument_parsing
    output, error, status = Open3.capture3(
      "bash",
      "-c",
      'source "$1"; INCLUDE_TAGS=""; EXCLUDE_TAGS=""; parse_maestro_tag_args --tags smoke,cart --exclude-tags flaky; printf "%s\n%s\n" "$INCLUDE_TAGS" "$EXCLUDE_TAGS"',
      "run-local-e2e-test",
      RUNNER
    )

    assert status.success?, error
    assert_equal ["smoke,cart", "flaky"], output.lines.map(&:chomp)
  end

  def test_target_specific_and_old_named_runners_are_removed
    REMOVED_RUNNERS.each do |path|
      refute_path_exists File.join(REPO_ROOT, path)
    end
  end
end
