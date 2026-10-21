# frozen_string_literal: true

require "minitest/autorun"
require "open3"

# Covers the option parsers that several dev command scripts share:
# scripts/lib/device_option (--device ID) and scripts/lib/open_target
# ([lib|demo]). The start script cases stop at argument errors, before any
# simulator, device or build step runs.
class DevCommandOptionsTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  DEVICE_OPTION = File.join(REPO_ROOT, "scripts", "lib", "device_option")
  OPEN_TARGET = File.join(REPO_ROOT, "scripts", "lib", "open_target")
  SWIFT_START = File.join(REPO_ROOT, "platforms", "swift", "Scripts", "start")
  ANDROID_START = File.join(REPO_ROOT, "platforms", "android", "scripts", "start")
  EMPTY_DEVICE_ARGUMENTS = [["--device"], ["--device="], ["--device", ""]].freeze

  def test_device_option_reads_a_separate_or_inline_id
    assert_equal ["0", "emulator-5556", "2"], parsed_device_option("--device", "emulator-5556", "--local")
    assert_equal ["0", "emulator-5556", "1"], parsed_device_option("--device=emulator-5556", "--local")
  end

  def test_device_option_leaves_other_arguments_alone
    assert_equal ["1", "unchanged", ""], parsed_device_option("--local", "--device", "emulator-5556")
    assert_equal ["1", "unchanged", ""], parsed_device_option("--devices=emulator-5556")
  end

  def test_device_option_reports_an_empty_id_and_exits
    EMPTY_DEVICE_ARGUMENTS.each do |arguments|
      output, error, status = device_option_command(arguments, report: 'echo "caller error" >&2')

      assert_equal 1, status.exitstatus, arguments.inspect
      assert_equal "caller error\n", error, arguments.inspect
      assert_empty output, arguments.inspect
    end
  end

  def test_start_scripts_keep_their_own_empty_device_errors
    {
      SWIFT_START => "--device needs a simulator UDID.\n",
      ANDROID_START => "--device needs an adb serial, such as emulator-5556.\n"
    }.each do |script, message|
      EMPTY_DEVICE_ARGUMENTS.each do |arguments|
        output, error, status = Open3.capture3(script, *arguments)

        assert_equal 1, status.exitstatus, "#{script} #{arguments.inspect}"
        assert_equal message, error, "#{script} #{arguments.inspect}"
        assert_empty output, "#{script} #{arguments.inspect}"
      end
    end
  end

  def test_open_target_maps_each_alias
    {
      [] => "demo",
      [""] => "demo",
      ["demo"] => "demo",
      ["sample"] => "demo",
      ["samples"] => "demo",
      ["lib"] => "lib",
      ["library"] => "lib",
      ["package"] => "lib",
      ["module"] => "lib"
    }.each do |arguments, target|
      output, error, status = open_target_command(arguments)

      assert status.success?, "#{arguments.inspect}: #{error}"
      assert_equal "#{target}\n", output, arguments.inspect
    end
  end

  def test_open_target_rejects_unknown_or_extra_targets
    [["bogus"], ["--lib"], ["lib", "demo"]].each do |arguments|
      output, error, status = open_target_command(arguments)

      assert_equal 1, status.exitstatus, arguments.inspect
      assert_equal "Usage: dev example open [lib|demo]\n", error, arguments.inspect
      assert_empty output, arguments.inspect
    end
  end

  private

  # Prints the return status, REQUESTED_DEVICE_ID and DEVICE_OPTION_ARG_COUNT.
  def parsed_device_option(*arguments)
    output, error, status = device_option_command(arguments, report: "exit 99")
    assert status.success?, error
    output.lines.map(&:chomp)
  end

  def device_option_command(arguments, report:)
    Open3.capture3(
      "bash",
      "-c",
      <<~SH,
        set -u
        source "$1"
        shift
        report() { #{report}; }
        REQUESTED_DEVICE_ID=unchanged
        DEVICE_OPTION_ARG_COUNT=""
        parse_device_option report "$@"
        printf '%s\\n%s\\n%s\\n' "$?" "$REQUESTED_DEVICE_ID" "$DEVICE_OPTION_ARG_COUNT"
      SH
      "dev-command-options-test",
      DEVICE_OPTION,
      *arguments
    )
  end

  def open_target_command(arguments)
    Open3.capture3(
      "bash",
      "-c",
      'source "$1"; shift; parse_open_target "dev example open" "$@"; echo "$OPEN_TARGET"',
      "dev-command-options-test",
      OPEN_TARGET,
      *arguments
    )
  end
end
