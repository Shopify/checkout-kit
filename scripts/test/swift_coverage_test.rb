# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"

class SwiftCoverageTest < Minitest::Test
  SCRIPTS = File.expand_path("../../platforms/swift/Scripts", __dir__)

  def setup
    @directory = Dir.mktmpdir("swift coverage ")
    @scripts = File.join(@directory, "platforms/swift/Scripts")
    @bin = File.join(@directory, "bin")
    @reports = File.join(@directory, ".xcresults/coverage")
    @arguments = File.join(@directory, "xcodebuild-arguments")
    FileUtils.mkdir_p([@scripts, @bin, @reports])
    File.write(File.join(@directory, "Package.swift"), "// test package\n")
    %w[xcode_run test_coverage].each { |name| FileUtils.cp(File.join(SCRIPTS, name), @scripts) }
    executable("xcodebuild", <<~BASH)
      # Reject invocations that could silently change the package pins.
      [[ " $* " == *" -disableAutomaticPackageResolution "* ]] || exit 2
      printf '%s\\n' "$@" > "$COVERAGE_TEST_ARGUMENTS"
      exit "${COVERAGE_TEST_BUILD_STATUS:-0}"
    BASH
    executable("xcbeautify", 'cat')
    executable("xcrun", <<~BASH)
      [ "$1" = xccov ] || exit 1
      [ "${COVERAGE_TEST_EXPORT_STATUS:-0}" = 0 ] || exit "$COVERAGE_TEST_EXPORT_STATUS"
      if [[ " $* " == *" --json "* ]]; then
        printf '%s\\n' '{"targets":[]}'
      else
        printf '%s\\n' 'Swift coverage report'
      fi
    BASH
  end

  def teardown
    FileUtils.remove_entry(@directory)
  end

  def test_coverage_enables_instrumentation_and_exports_reports_locally
    output, error, status = run_script("test_coverage")

    assert status.success?, "#{output}#{error}"
    arguments = File.readlines(@arguments, chomp: true)
    assert_includes arguments, "-disableAutomaticPackageResolution"
    assert_equal "YES", arguments[arguments.index("-enableCodeCoverage") + 1]
    assert_equal File.join(@directory, ".xcresults/ShopifyCheckoutKit-Package-coverage.xcresult"),
      arguments[arguments.index("-resultBundlePath") + 1]
    assert_equal "{\"targets\":[]}\n", File.read(File.join(@reports, "coverage.json"))
    assert_equal "Swift coverage report\n", File.read(File.join(@reports, "coverage.txt"))
  end

  def test_failed_tests_remove_stale_exports_and_fail_the_command
    %w[coverage.json coverage.txt].each { |name| File.write(File.join(@reports, name), "stale") }

    _output, _error, status = run_script("test_coverage", {"COVERAGE_TEST_BUILD_STATUS" => "65"})

    refute status.success?
    assert_empty Dir.children(@reports)
  end

  def test_export_failure_fails_the_command
    _output, _error, status = run_script("test_coverage", {"COVERAGE_TEST_EXPORT_STATUS" => "1"})

    refute status.success?
  end

  def test_regular_local_tests_do_not_enable_coverage_or_request_a_result_bundle
    output, error, status = run_script("xcode_run", {}, "test", "ShopifyCheckoutKit-Package")

    assert status.success?, "#{output}#{error}"
    arguments = File.readlines(@arguments, chomp: true)
    refute_includes arguments, "-enableCodeCoverage"
    refute_includes arguments, "-resultBundlePath"
  end

  private

  def executable(name, body)
    path = File.join(@bin, name)
    File.write(path, "#!/bin/bash\nset -euo pipefail\n#{body}\n")
    FileUtils.chmod(0o755, path)
  end

  def run_script(name, environment = {}, *arguments)
    Open3.capture3(
      {
        "PATH" => "#{@bin}:#{ENV.fetch("PATH")}",
        "CI" => "false",
        "ENABLE_CODE_COVERAGE" => "0",
        "CURRENT_SIMULATOR_UUID" => "test-simulator",
        "COVERAGE_TEST_ARGUMENTS" => @arguments
      }.merge(environment),
      "bash", File.join(@scripts, name), *arguments,
      chdir: @directory
    )
  end
end
