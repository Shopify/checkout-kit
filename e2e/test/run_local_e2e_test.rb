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

  def test_runner_parses_tags_and_positional_test_files
    output, error, status = Open3.capture3(
      "bash",
      "-c",
      'source "$1"; INCLUDE_TAGS=""; EXCLUDE_TAGS=""; HAS_EXPLICIT_TAGS=false; TEST_FILES=(); parse_arguments exact-flow --tags launch --exclude-tags flaky; printf "%s\n%s\n%s\n" "$INCLUDE_TAGS" "$EXCLUDE_TAGS" "${TEST_FILES[*]}"',
      "run-local-e2e-test",
      RUNNER
    )

    assert status.success?, error
    assert_equal ["launch", "flaky", "exact-flow"], output.lines.map(&:chomp)
  end

  def test_exclude_tags_requires_a_value
    _output, error, status = Open3.capture3(
      "bash",
      "-c",
      'source "$1"; INCLUDE_TAGS=""; EXCLUDE_TAGS=""; HAS_EXPLICIT_TAGS=false; TEST_FILES=(); parse_arguments --exclude-tags',
      "run-local-e2e-test",
      RUNNER
    )

    refute status.success?
    assert_includes error, "--exclude-tags needs a comma separated tag list"
  end

  def test_no_selectors_choose_every_eligible_test
    output, error, status = local_selection

    assert status.success?, error
    assert_equal ["tests/shared/presentation.yaml", "tests/swift/preload.yaml"], output.lines.map(&:chomp)
  end

  def test_tag_and_positional_selectors_form_a_union
    output, error, status = local_selection("presentation", "--tags", "preload")

    assert status.success?, error
    assert_equal ["tests/swift/preload.yaml", "tests/shared/presentation.yaml"], output.lines.map(&:chomp)
  end

  def test_secondary_tags_select_matching_eligible_tests
    output, error, status = local_selection("--tags", "smoke")

    assert status.success?, error
    assert_equal ["tests/shared/presentation.yaml", "tests/swift/preload.yaml"], output.lines.map(&:chomp)
  end

  def test_unknown_tag_prints_enabled_tags
    _output, error, status = local_selection("--tags", "unknown")

    refute status.success?
    assert_includes error, "Enabled tags: presentation,smoke,preload"
  end

  def test_unknown_file_prints_known_test_files
    _output, error, status = local_selection("unknown")

    refute status.success?
    assert_includes error, "Known E2E test files:"
    assert_includes error, "tests/shared/presentation.yaml"
    assert_includes error, "tests/shared/completion.yaml"
    assert_includes error, "tests/swift/preload.yaml"
  end

  def test_positional_selection_rejects_a_test_outside_application_coverage
    _output, error, status = local_selection("completion")

    refute status.success?
    assert_includes error, "tests/shared/completion.yaml is not enabled for swift-ios"
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

  def test_maestro_runs_only_explicit_test_files_when_provided
    arguments = maestro_arguments("swift", "tests/synthetic/exact-flow.yaml")

    assert_equal ["tests/synthetic/exact-flow.yaml"], arguments.grep(%r{\Atests/})
  end

  def test_target_specific_and_old_named_runners_are_removed
    REMOVED_RUNNERS.each do |path|
      refute_path_exists File.join(REPO_ROOT, path)
    end
  end

  private

  def local_selection(*arguments)
    Open3.capture3(
      "bash",
      "-c",
      <<~'SH',
        source "$1"
        shift
        configure_target swift-ios
        INCLUDE_TAGS=""
        EXCLUDE_TAGS=""
        HAS_EXPLICIT_TAGS=false
        TEST_FILES=()
        CANDIDATE_TEST_FILES=(
          tests/shared/presentation.yaml
          tests/shared/completion.yaml
          tests/swift/preload.yaml
        )
        ELIGIBLE_TEST_FILES=(
          tests/shared/presentation.yaml
          tests/swift/preload.yaml
        )
        MATRIX_INCLUDE_TAGS="presentation,preload"
        MATRIX_EXCLUDE_TAGS="flaky,wip,android-only"
        ENABLED_TAGS=""
        RESOLVED_TEST_FILES=()
        test_file_tags() {
          case "$1" in
            tests/shared/presentation.yaml) printf 'presentation,smoke\n' ;;
            tests/shared/completion.yaml) printf 'completion,full\n' ;;
            tests/swift/preload.yaml) printf 'preload,smoke\n' ;;
          esac
        }
        parse_arguments "$@"
        load_enabled_tags
        validate_explicit_tags
        select_test_files
        printf '%s\n' "${RESOLVED_TEST_FILES[@]}"
      SH
      "run-local-e2e-test",
      RUNNER,
      *arguments
    )
  end

  def maestro_arguments(test_namespace, *test_files)
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
        test_namespace,
        *test_files
      )

      assert status.success?, error
      output.lines.map(&:chomp)
    end
  end
end
