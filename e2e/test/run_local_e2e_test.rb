# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"
require "yaml"

class RunLocalE2ETest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  RUNNER = File.join(REPO_ROOT, "e2e", "scripts", "run_local_e2e")
  MAESTRO_RUNNER = File.join(REPO_ROOT, "e2e", "scripts", "run_maestro")
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

  def test_swift_build_output_uses_xcbeautify
    assert_match(/CODE_SIGNING_ALLOWED=NO \|\s+xcbeautify/, File.read(RUNNER))
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

  def test_exclude_tags_requires_a_value
    _output, error, status = Open3.capture3(
      "bash",
      "-c",
      'source "$1"; INCLUDE_TAGS=""; EXCLUDE_TAGS=""; parse_maestro_tag_args --exclude-tags',
      "run-local-e2e-test",
      RUNNER
    )

    refute status.success?
    assert_includes error, "--exclude-tags needs a comma separated tag list"
  end

  def test_maestro_runs_shared_and_target_specific_test_files
    react_native_arguments = maestro_arguments("react-native")
    swift_arguments = maestro_arguments("swift")
    shared_tests = Dir.glob("e2e/tests/shared/**/*.yaml", base: REPO_ROOT).sort
    react_native_tests = Dir.glob("e2e/tests/react-native/**/*.yaml", base: REPO_ROOT).sort

    shared_tests.each do |path|
      relative_path = path.delete_prefix("e2e/")
      assert_includes react_native_arguments, relative_path
      assert_includes swift_arguments, relative_path
    end

    react_native_tests.each do |path|
      relative_path = path.delete_prefix("e2e/")
      assert_includes react_native_arguments, relative_path
      refute_includes swift_arguments, relative_path
    end

    refute_includes react_native_arguments, "."
    refute_includes swift_arguments, "."
  end

  def selected_profile(target, include_tags, exclude_tags = "")
    output, error, status = Open3.capture3(
      "bash",
      "-c",
      <<~'SH',
        source "$1"
        configure_target "$2"
        INCLUDE_TAGS="$3"
        EXCLUDE_TAGS="$4"
        RUN_PROFILE="normal"
        select_run_profile
        printf '%s\n' "$RUN_PROFILE"
      SH
      "run-local-e2e-test",
      RUNNER,
      target,
      include_tags,
      exclude_tags
    )

    [output.lines.map(&:chomp), error, status]
  end

  def test_swift_apple_pay_selects_its_profile
    selected, error, status = selected_profile("swift-ios", "apple-pay")

    assert status.success?, error
    assert_equal ["swift-apple-pay"], selected
  end

  def test_swift_apple_pay_rejects_mixed_or_excluded_tags
    _selected, error, status = selected_profile("swift-ios", "apple-pay,checkout")
    refute status.success?
    assert_includes error, "must be requested by itself"

    _selected, error, status = selected_profile("swift-ios", "apple-pay", "apple-pay")
    refute status.success?
    assert_includes error, "cannot be both included and excluded"
  end

  def test_non_swift_target_stays_on_the_normal_profile
    selected, error, status = selected_profile("kotlin-android", "apple-pay")

    assert status.success?, error
    assert_equal ["normal"], selected
  end

  def test_apple_pay_config_is_checked_before_the_swift_build
    script = File.read(RUNNER)
    check_index = script.index('"$REPO_ROOT/e2e/scripts/check_swift_apple_pay_config"')
    build_index = script.index("  build_and_install\n", check_index)

    refute_nil check_index
    refute_nil build_index
    assert_operator check_index, :<, build_index
  end

  def test_target_specific_and_old_named_runners_are_removed
    REMOVED_RUNNERS.each do |path|
      refute_path_exists File.join(REPO_ROOT, path)
    end
  end

  private

  def maestro_arguments(test_namespace)
    Dir.mktmpdir do |directory|
      version = File.read(File.join(REPO_ROOT, "e2e", ".maestro-version")).strip
      binary = File.join(directory, version, "bin", "maestro")
      FileUtils.mkdir_p(File.dirname(binary))
      File.write(binary, %(#!/usr/bin/env bash\nprintf '%s\\n' "$@"\n))
      FileUtils.chmod("+x", binary)

      output, error, status = Open3.capture3(
        { "MAESTRO_VERSIONS_ROOT" => directory },
        MAESTRO_RUNNER,
        "ios",
        "com.example.app",
        "ready-marker",
        "",
        "",
        test_namespace
      )

      assert status.success?, error
      output.lines.map(&:chomp)
    end
  end
end
