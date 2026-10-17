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
  FIRST_SIMULATOR = "11111111-1111-1111-1111-111111111111"
  SECOND_SIMULATOR = "22222222-2222-2222-2222-222222222222"
  WATCH_SIMULATOR = "33333333-3333-3333-3333-333333333333"
  BOOTED_SIMULATORS = <<~TEXT
    == Devices ==
    -- iOS 18.5 --
        iPhone 16 (#{FIRST_SIMULATOR}) (Booted)
        iPhone 16 Pro (#{SECOND_SIMULATOR}) (Booted)
    -- watchOS 11.5 --
        Apple Watch Series 10 (46mm) (#{WATCH_SIMULATOR}) (Booted)
  TEXT
  ADB_DEVICES = <<~TEXT
    List of devices attached
    emulator-5554\tdevice
    emulator-5556\tdevice
    emulator-5558\toffline

  TEXT

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
      'source "$1"; INCLUDE_TAGS=""; EXCLUDE_TAGS=""; HAS_EXPLICIT_TAGS=false; TEST_FILES=(); SELECTOR_COUNT=0; REQUESTED_DEVICE_ID=""; parse_arguments exact-flow --tags launch --exclude-tags flaky; printf "%s\n%s\n%s\n" "$INCLUDE_TAGS" "$EXCLUDE_TAGS" "${TEST_FILES[*]}"',
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
      'source "$1"; INCLUDE_TAGS=""; EXCLUDE_TAGS=""; HAS_EXPLICIT_TAGS=false; TEST_FILES=(); SELECTOR_COUNT=0; REQUESTED_DEVICE_ID=""; parse_arguments --exclude-tags',
      "run-local-e2e-test",
      RUNNER
    )

    refute status.success?
    assert_includes error, "--exclude-tags needs a comma separated tag list"
  end

  def test_device_option_is_not_a_test_selector
    [["--device", "emulator-5556"], ["--device=emulator-5556"]].each do |arguments|
      output, error, status = parsed_arguments(*arguments)

      assert status.success?, error
      assert_equal ["emulator-5556", "0", "false", ""], output.lines.map(&:chomp)
    end
  end

  def test_device_option_keeps_tags_and_files_as_selectors
    output, error, status = parsed_arguments("exact-flow", "--device", "emulator-5556", "--tags", "launch")

    assert status.success?, error
    device, selector_count, explicit_tags, test_files = output.lines.map(&:chomp)
    assert_equal ["emulator-5556", "true", "exact-flow"], [device, explicit_tags, test_files]
    refute_equal "0", selector_count
  end

  def test_device_option_requires_a_value
    _output, error, status = parsed_arguments("--device")

    refute status.success?
    assert_includes error, "--device needs a simulator UDID or an adb serial"
  end

  def test_resolve_device_selects_the_requested_device
    {
      "swift-ios" => SECOND_SIMULATOR,
      "react-native-ios" => SECOND_SIMULATOR,
      "kotlin-android" => "emulator-5556",
      "react-native-android" => "emulator-5556"
    }.each do |target, device|
      output, error, status = resolved_device(target, device)

      assert status.success?, error
      assert_equal device, output.lines.last.chomp, target
    end
  end

  def test_resolve_device_without_a_request_selects_the_first_available_device
    {
      "swift-ios" => FIRST_SIMULATOR,
      "react-native-ios" => FIRST_SIMULATOR,
      "kotlin-android" => "emulator-5554",
      "react-native-android" => "emulator-5554"
    }.each do |target, device|
      output, error, status = resolved_device(target, "")

      assert status.success?, error
      assert_equal device, output.lines.last.chomp, target
    end
  end

  def test_resolve_device_rejects_a_device_that_is_not_available
    {
      "swift-ios" => [WATCH_SIMULATOR, "is not a booted iOS simulator"],
      "react-native-ios" => ["unknown-udid", "is not a booted iOS simulator"],
      "kotlin-android" => ["emulator-5558", "is not listed by adb devices in state device"],
      "react-native-android" => ["emulator-9999", "is not listed by adb devices in state device"]
    }.each do |target, (device, message)|
      output, error, status = resolved_device(target, device)

      refute status.success?, target
      assert_includes error, "#{device} #{message}", target
      refute_includes output, "resolved:", target
    end
  end

  def test_resolve_device_reports_when_no_device_is_available
    output, error, status = resolved_device("swift-ios", "", simulators: "== Devices ==\n-- iOS 18.5 --\n")

    refute status.success?
    assert_includes error, "No booted iOS simulator found."
    refute_includes output, "resolved:"
  end

  def test_matrix_exclusions_remain_separate_from_explicit_exclusions
    output, error, status = Open3.capture3(
      "bash",
      "-c",
      <<~'SH',
        source "$1"
        ruby() { printf '%s\n' '{"include_tags":["presentation"],"exclude_tags":["flaky","wip"]}'; }
        configure_target swift-ios
        INCLUDE_TAGS=""
        EXCLUDE_TAGS="custom"
        HAS_EXPLICIT_TAGS=false
        load_application_tags
        printf '%s\n%s\n' "$MATRIX_EXCLUDE_TAGS" "$EXCLUDE_TAGS"
      SH
      "run-local-e2e-test",
      RUNNER
    )

    assert status.success?, error
    assert_equal ["flaky,wip", "custom"], output.lines.map(&:chomp)
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

  def test_positional_selection_supports_system_bash
    output, error, status = local_selection("completion", shell: "/bin/bash")

    assert status.success?, error
    assert_equal ["tests/shared/completion.yaml"], output.lines.map(&:chomp)
  end

  def test_tag_selection_supports_system_bash
    output, error, status = local_selection("--tags", "smoke", shell: "/bin/bash")

    assert status.success?, error
    assert_equal ["tests/shared/presentation.yaml", "tests/swift/preload.yaml"], output.lines.map(&:chomp)
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

  def test_positional_selection_bypasses_application_coverage
    output, error, status = local_selection("completion")

    assert status.success?, error
    assert_equal ["tests/shared/completion.yaml"], output.lines.map(&:chomp)
  end

  def test_positional_selection_bypasses_matrix_exclusions
    output, error, status = local_selection("quarantined")

    assert status.success?, error
    assert_equal ["tests/shared/quarantined.yaml"], output.lines.map(&:chomp)
  end

  def test_picker_entries_have_compact_selectable_labels
    output, error, status = picker_script("picker_entries")

    assert status.success?, error
    assert_equal(
      [
        "all\tall\tALL       Run all enabled tests",
        "tag\tpresentation\tTAG       presentation",
        "tag\tsmoke\tTAG       smoke",
        "tag\tpreload\tTAG       preload",
        "file\ttests/shared/presentation.yaml\tFILE      tests/shared/presentation.yaml",
        "file\ttests/swift/preload.yaml\tFILE      tests/swift/preload.yaml"
      ],
      output.lines.map(&:chomp)
    )
  end

  def test_picker_translates_tags_and_files_into_selectors
    command = <<~'SH'
      fzf() {
        command cat >/dev/null
        printf 'tag\tpreload\tTAG       preload\n'
        printf 'file\ttests/shared/presentation.yaml\tFILE      tests/shared/presentation.yaml\n'
      }
      run_picker >/dev/null
      printf '%s\n%s\n%s\n' "$HAS_EXPLICIT_TAGS" "$INCLUDE_TAGS" "${TEST_FILES[*]}"
    SH
    output, error, status = picker_script(command)

    assert status.success?, error
    assert_equal ["true", "preload", "tests/shared/presentation.yaml"], output.lines.map(&:chomp)
  end

  def test_picker_reproducible_command_includes_the_requested_device
    command = <<~'SH'
      fzf() {
        command cat >/dev/null
        printf 'tag\tpreload\tTAG       preload\n'
      }
      REQUESTED_DEVICE_ID="emulator-5556"
      run_picker
    SH
    output, error, status = picker_script(command)

    assert status.success?, error
    assert_includes output, "dev swift e2e --tags preload --device emulator-5556"
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

  def test_skip_build_runs_selected_flows_without_building_or_starting_metro
    Dir.mktmpdir do |directory|
      scripts = File.join(directory, "e2e/scripts")
      FileUtils.mkdir_p(scripts)
      File.write(File.join(scripts, "maestro_bin"), "#!/bin/bash\nexit 0\n")
      File.write(File.join(scripts, "run_maestro"), %(#!/bin/bash\nprintf '%s\\n' "$E2E_DEVICE_ID" "$@"\n))
      FileUtils.chmod("+x", Dir.glob("#{scripts}/*"))
      output, error, status = Open3.capture3("bash", "-c", <<~'SH', "skip-build-test", RUNNER, directory)
        source "$1"
        REPO_ROOT="$2"
        load_application_tags() { :; }
        load_eligible_test_files() { :; }
        load_enabled_tags() { :; }
        validate_explicit_tags() { :; }
        select_test_files() { RESOLVED_TEST_FILES=(tests/shared/launch-smoke.yaml); }
        resolve_device() { DEVICE_ID=synthetic-device; }
        prepare_react_native_environment() { echo unexpected-metro >&2; exit 1; }
        build_and_install() { echo unexpected-build >&2; exit 1; }
        main react-native-android --skip-build
      SH
      assert status.success?, error
      assert_equal ["synthetic-device", "android", "com.shopify.checkoutkit.reactnativedemo",
        "checkout-kit-sample-ready", "", "", "react-native", "tests/shared/launch-smoke.yaml"], output.lines.map(&:chomp)
    end
  end

  private

  def picker_script(command)
    Open3.capture3(
      "bash",
      "-c",
      <<~SH,
        source "$1"
        configure_target swift-ios
        MATRIX_INCLUDE_TAGS="presentation,preload"
        ENABLED_TAGS="presentation,smoke,preload"
        ELIGIBLE_TEST_FILES=(tests/shared/presentation.yaml tests/swift/preload.yaml)
        INCLUDE_TAGS=""
        HAS_EXPLICIT_TAGS=false
        TEST_FILES=()
        REQUESTED_DEVICE_ID=""
        #{command}
      SH
      "run-local-e2e-test",
      RUNNER
    )
  end

  def local_selection(*arguments, shell: "bash")
    Open3.capture3(
      shell,
      "-c",
      <<~'SH',
        source "$1"
        shift
        configure_target swift-ios
        INCLUDE_TAGS=""
        EXCLUDE_TAGS=""
        HAS_EXPLICIT_TAGS=false
        TEST_FILES=()
        SELECTOR_COUNT=0
        REQUESTED_DEVICE_ID=""
        CANDIDATE_TEST_FILES=(
          tests/shared/presentation.yaml
          tests/shared/completion.yaml
          tests/shared/quarantined.yaml
          tests/swift/preload.yaml
        )
        ELIGIBLE_TEST_FILES=()
        MATRIX_INCLUDE_TAGS="presentation,preload"
        MATRIX_EXCLUDE_TAGS="flaky,wip,android-only"
        ENABLED_TAGS=""
        RESOLVED_TEST_FILES=()
        load_candidate_test_files() { :; }
        test_file_tags() {
          case "$1" in
            tests/shared/presentation.yaml) printf 'presentation,smoke\n' ;;
            tests/shared/completion.yaml) printf 'completion,full\n' ;;
            tests/shared/quarantined.yaml) printf 'presentation,flaky\n' ;;
            tests/swift/preload.yaml) printf 'preload,smoke\n' ;;
          esac
        }
        parse_arguments "$@"
        load_eligible_test_files
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

  def parsed_arguments(*arguments)
    Open3.capture3(
      "bash",
      "-c",
      <<~'SH',
        source "$1"
        shift
        INCLUDE_TAGS=""
        EXCLUDE_TAGS=""
        HAS_EXPLICIT_TAGS=false
        TEST_FILES=()
        SELECTOR_COUNT=0
        REQUESTED_DEVICE_ID=""
        parse_arguments "$@"
        printf '%s\n%s\n%s\n%s\n' "$REQUESTED_DEVICE_ID" "$SELECTOR_COUNT" "$HAS_EXPLICIT_TAGS" "${TEST_FILES[*]:-}"
      SH
      "run-local-e2e-test",
      RUNNER,
      *arguments
    )
  end

  def resolved_device(target, requested_device, simulators: BOOTED_SIMULATORS, android_devices: ADB_DEVICES)
    Open3.capture3(
      { "STUB_SIMULATORS" => simulators, "STUB_ANDROID_DEVICES" => android_devices },
      "bash",
      "-c",
      <<~'SH',
        source "$1"
        xcrun() { printf '%s' "$STUB_SIMULATORS"; }
        adb() { printf '%s' "$STUB_ANDROID_DEVICES"; }
        configure_target "$2"
        REQUESTED_DEVICE_ID="$3"
        resolve_device
        printf 'resolved:\n%s\n' "$DEVICE_ID"
      SH
      "run-local-e2e-test",
      RUNNER,
      target,
      requested_device
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
