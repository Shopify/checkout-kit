# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "tmpdir"
require_relative "../lib/e2e_matrix_to_browserstack_run_plan"
load File.expand_path("../scripts/execute_browserstack_run", __dir__)

class BrowserStackRunExecutorTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)

  class CompletedBuildClient
    attr_reader :poll_count

    def initialize
      @poll_count = 0
    end

    def get_build(_build_id)
      @poll_count += 1
      raise "polled after completion" if @poll_count > 1

      {"id" => "build-123", "status" => "completed", "devices" => []}
    end
  end

  def with_version_file(contents)
    Dir.mktmpdir do |dir|
      path = File.join(dir, ".maestro-version")
      File.write(path, contents)
      yield path
    end
  end

  # A constant holding the version would pass an equality check against the real file while
  # still drifting from it. Reading a file that says something else proves the file is the
  # source, not a copy of it.
  def test_the_version_comes_out_of_the_pin_file
    with_version_file("1.2.3\n") do |path|
      assert_equal "1.2.3", BrowserStackRunExecutor.resolve_maestro_version({}, version_file: path)
    end
  end

  # The local CLI resolves through e2e/scripts/maestro_bin, which reads this same file. One
  # file means the version BrowserStack runs and the version a laptop runs cannot diverge.
  def test_the_default_pin_file_is_the_one_the_local_cli_reads
    assert_equal(
      File.read(File.join(E2E_ROOT, ".maestro-version")).strip,
      BrowserStackRunExecutor.resolve_maestro_version({})
    )
  end

  # Probing a second version needs to bypass the pin without editing a tracked file.
  def test_an_override_replaces_the_pinned_version
    with_version_file("2.4.0\n") do |path|
      version = BrowserStackRunExecutor.resolve_maestro_version(
        {"E2E_MAESTRO_VERSION" => "2.0.7"},
        version_file: path
      )

      assert_equal "2.0.7", version
    end
  end

  def test_a_blank_override_falls_back_to_the_pin_file
    with_version_file("2.4.0\n") do |path|
      version = BrowserStackRunExecutor.resolve_maestro_version(
        {"E2E_MAESTRO_VERSION" => "  "},
        version_file: path
      )

      assert_equal "2.4.0", version
    end
  end

  def test_a_completed_build_stops_polling
    Dir.mktmpdir do |output_dir|
      File.open(File::NULL, "w") do |output|
        client = CompletedBuildClient.new
        executor = BrowserStackRunExecutor.new({output_dir: output_dir}, client: client, output: output)

        build, sessions = executor.send(:poll_build, "build-123")

        assert_equal "completed", build.fetch("status")
        assert_empty sessions
        assert_equal 1, client.poll_count
      end
    end
  end

  def test_the_cli_fails_failed_tests_after_writing_the_result
    run_cli(build_status: "failed") do |status, result, output|
      refute status.success?, output
      assert_equal "failed", result.fetch("status")
      assert_equal false, result.fetch("passed")
      assert_equal "swift-ios-latest", result.fetch("id")
    end
  end

  def test_the_cli_succeeds_when_browserstack_passes
    run_cli(build_status: "completed") do |status, result, output|
      assert status.success?, output
      assert_equal true, result.fetch("passed")
    end
  end

  def test_an_api_error_fails_the_cli_and_preserves_diagnostics
    run_cli(build_status: "completed", upload_error: "synthetic upload failure") do |status, result, output|
      refute status.success?, output
      assert_equal false, result.fetch("passed")
      assert_equal "synthetic upload failure", result.fetch("error")
      assert_equal "swift-ios", result.fetch("application_id")
    end
  end

  def test_a_setup_error_fails_the_cli_and_preserves_diagnostics
    Dir.mktmpdir do |dir|
      output, error, status = Open3.capture3({"BROWSERSTACK_USERNAME" => nil, "BROWSERSTACK_ACCESS_KEY" => nil},
        "ruby", File.join(E2E_ROOT, "scripts/execute_browserstack_run"),
        "--index", "0", "--tests-zip", "synthetic-tests.zip", "--run-plan", File.join(dir, "missing.json"), "--output-dir", dir)

      refute status.success?, "#{output}#{error}"
      result = JSON.parse(File.read(File.join(dir, "result.json")))
      assert_equal false, result.fetch("passed")
      assert_equal "error", result.fetch("status")
    end
  end

  private

  # Stub only the external service in a child process; exercise the real CLI,
  # result normalization, persistence, and exit status without network or secrets.
  def run_cli(build_status:, upload_error: nil)
    Dir.mktmpdir do |dir|
      fake_client = File.join(dir, "fake_client.rb")
      File.write(fake_client, <<~RUBY)
        require #{File.join(E2E_ROOT, "lib/browserstack_client").inspect}
        class BrowserStackClient
          def initialize(**); end
          def upload(*)
            raise ENV["TEST_UPLOAD_ERROR"] if ENV["TEST_UPLOAD_ERROR"]
            {"app_url" => "bs://synthetic-app", "test_suite_url" => "bs://synthetic-suite"}
          end
          def start_build(*)
            {"build_id" => "synthetic-build"}
          end
          def get_build(*)
            {"id" => "synthetic-build", "status" => ENV.fetch("TEST_BUILD_STATUS"), "devices" => []}
          end
        end
      RUBY
      plan = File.join(dir, "plan.json")
      rows = E2EMatrixToBrowserStackRunPlan.load(File.join(E2E_ROOT, "config/matrix.yml"), application_id: "swift-ios").expand
      File.write(plan, JSON.generate(rows))
      env = {
        "TEST_BUILD_STATUS" => build_status,
        "TEST_UPLOAD_ERROR" => upload_error,
        "BROWSERSTACK_USERNAME" => "synthetic-user",
        "BROWSERSTACK_ACCESS_KEY" => "synthetic-key",
        "E2E_DEVICE_OVERRIDE" => "Synthetic Phone-17.0",
        "E2E_SWIFT_IOS_APP_PATH" => "synthetic-app.ipa"
      }
      output, error, status = Open3.capture3(env, "ruby", "-r", fake_client, File.join(E2E_ROOT, "scripts/execute_browserstack_run"),
        "--index", "0", "--tests-zip", "synthetic-tests.zip", "--run-plan", plan, "--output-dir", dir)
      yield status, JSON.parse(File.read(File.join(dir, "result.json"))), "#{output}#{error}"
    end
  end
end
