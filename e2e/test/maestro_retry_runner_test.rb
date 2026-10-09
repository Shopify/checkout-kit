# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "rbconfig"
require "tmpdir"
load File.expand_path("../scripts/run_maestro_with_retries", __dir__)

class MaestroRetryRunnerTest < Minitest::Test
  def setup
    @directory = Dir.mktmpdir
    @report = File.join(@directory, "final.xml")
    @files = %w[Guest Launch].map do |name|
      path = File.join(@directory, "#{name}.yaml")
      File.write(path, "appId: com.example.app\nname: #{name}\n---\n- launchApp\n")
      path
    end
    @calls = []
  end

  def teardown
    FileUtils.remove_entry(@directory)
  end

  def test_success_runs_once_and_preserves_raw_report
    assert run_with([{}])
    assert_equal [@files], @calls
    assert_equal "0", suite.attributes["failures"]
    assert_equal 1, Dir.glob(File.join(@directory, "maestro-attempts-*", "*", "junit.xml")).size
  end

  def test_only_failed_flow_retries_and_recovery_is_visible
    assert run_with([{ "Guest" => "failure" }, {}])
    assert_equal [@files, [@files.first]], @calls
    assert_equal "2", suite.attributes["tests"]
    assert_equal "0", suite.attributes["failures"]
    assert_equal ["Guest (passed on retry 1)", "Launch"], suite.get_elements("testcase").map { |test| test.attributes["name"] }
    assert_equal "4.0", suite.get_elements("testcase").first.attributes["time"]
    reports = Dir.glob(File.join(@directory, "maestro-attempts-*", "*", "junit.xml"))
    assert_equal 2, reports.size
    assert_includes File.read(reports.first), "<failure>"
  end

  def test_persistent_failures_stay_failed_after_retry_budget
    refute run_with([{ "Guest" => "failure" }, { "Guest" => "failure" }])
    assert_equal 2, @calls.size
    assert_equal "1", suite.attributes["failures"]
    assert_equal "Guest", suite.get_elements("testcase").first.attributes["name"]
  end

  def test_errors_are_retried_and_counted
    refute run_with([{ "Guest" => "error" }, { "Guest" => "error" }])
    assert_equal "1", suite.attributes["errors"]
  end

  def test_missing_report_does_not_reuse_stale_result
    File.write(@report, "old result")
    error = assert_raises(RuntimeError) { run_with([:missing]) }
    assert_match(/did not produce/, error.message)
    refute_path_exists @report
  end

  def test_missing_retry_report_preserves_original_failure
    assert_raises(RuntimeError) { run_with([{ "Guest" => "failure" }, :missing]) }
    assert_equal "1", suite.attributes["failures"]
  end

  def test_empty_or_incomplete_report_cannot_pass
    assert_raises(RuntimeError) { run_with([:empty]) }
    assert_raises(RuntimeError) { run_with([:incomplete]) }
  end

  def test_nonzero_exit_with_all_passing_tests_is_an_infrastructure_failure
    assert_raises(RuntimeError) { run_with([:bad_exit]) }
    refute_path_exists @report
  end

  def test_skipped_retry_cannot_erase_a_failure
    assert_raises(RuntimeError) { run_with([{ "Guest" => "failure" }, { "Guest" => "skipped" }]) }
    assert_equal "1", suite.attributes["failures"]
  end

  def test_duplicate_flow_names_and_invalid_retry_counts_are_rejected
    File.write(@files.last, File.read(@files.first))
    assert_raises(ArgumentError) { run_with([{}]) }
    %w[0 -1 6 invalid].each do |retries|
      assert_raises(ArgumentError) { MaestroRetryRunner.new(command: [], files: @files, report: @report, retries: retries) }
    end
  end

  def test_shell_runner_opts_in_and_forwards_device_and_environment
    repo = File.expand_path("../..", __dir__)
    version = File.read(File.join(repo, "e2e/.maestro-version")).strip
    binary = File.join(@directory, version, "bin/maestro")
    FileUtils.mkdir_p(File.dirname(binary))
    File.write(binary, <<~RUBY)
      #!#{RbConfig.ruby}
      require "json"
      File.write(#{File.join(@directory, "args.json").inspect}, JSON.generate(ARGV))
      File.write(ARGV.fetch(ARGV.index("--output") + 1), '<testsuites><testsuite><testcase name="Guest"/><testcase name="Launch"/></testsuite></testsuites>')
    RUBY
    FileUtils.chmod("+x", binary)
    output, error, status = Open3.capture3(
      { "MAESTRO_VERSIONS_ROOT" => @directory, "E2E_MAESTRO_TEST_RETRIES" => "1", "E2E_JUNIT_REPORT" => @report, "E2E_DEVICE_ID" => "synthetic-device" },
      File.join(repo, "e2e/scripts/run_maestro"), "ios", "com.example.app", "ready", "", "", "swift", *@files
    )
    assert status.success?, output + error
    require "json"
    arguments = JSON.parse(File.read(File.join(@directory, "args.json")))
    assert_includes arguments, "synthetic-device"
    assert_includes arguments, "E2E_APP_ID=com.example.app"
    assert_equal "2", suite.attributes["tests"]
  end

  private

  def suite
    REXML::Document.new(File.read(@report)).elements["testsuites/testsuite"]
  end

  def run_with(outcomes)
    @calls = []
    execute = lambda do |*arguments|
      selected = arguments & @files
      @calls << selected
      outcome = outcomes.fetch(@calls.size - 1)
      next false if outcome == :missing

      report = arguments.fetch(arguments.index("--output") + 1)
      tests = selected.map do |file|
        name = File.basename(file, ".yaml")
        state = outcome.is_a?(Hash) && outcome[name]
        detail = state ? "<#{state}>synthetic result</#{state}>" : ""
        %(<testcase name="#{name}" time="2.0">#{detail}</testcase>)
      end
      tests = [] if outcome == :empty
      tests = tests.take(1) if outcome == :incomplete
      File.write(report, "<testsuites><testsuite>#{tests.join}</testsuite></testsuites>")
      outcome != :bad_exit && (!outcome.is_a?(Hash) || outcome.values.none? { |state| %w[failure error].include?(state) })
    end
    runner = MaestroRetryRunner.new(command: ["maestro", "test"], files: @files, report: @report, retries: "1", execute: execute)
    result = nil
    capture_io { result = runner.run }
    result
  end
end
