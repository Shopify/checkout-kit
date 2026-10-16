# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "stringio"
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

  class BuildRequestClient
    attr_reader :platform, :body

    def start_build(platform, body)
      @platform = platform
      @body = body
      {"build_id" => "build-123"}
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

  def test_failed_flows_retry_once_by_default_on_both_platforms
    %w[android ios].each do |platform|
      client = build_request(platform: platform)

      assert_equal platform, client.platform
      assert_equal true, client.body.fetch(:retryTestsOnFailure)
      assert_equal 1, client.body.fetch(:testIterations)
      assert_equal ["tests"], client.body.fetch(:execute)
      assert_equal({includeTags: ["launch"], excludeTags: ["skip"]}, client.body.fetch(:tags))
    end
  end

  def test_retry_count_can_be_increased_to_five
    client = build_request(env: {"E2E_BROWSERSTACK_TEST_RETRIES" => "5"})

    assert_equal true, client.body.fetch(:retryTestsOnFailure)
    assert_equal 5, client.body.fetch(:testIterations)
  end

  def test_zero_disables_retries_without_sending_an_invalid_iteration_count
    client = build_request(env: {"E2E_BROWSERSTACK_TEST_RETRIES" => "0"})

    assert_equal false, client.body.fetch(:retryTestsOnFailure)
    refute client.body.key?(:testIterations)
  end

  def test_invalid_retry_counts_fail_during_configuration
    ["-1", "6", "1.5", "one", "", "1retry"].each do |value|
      error = assert_raises(ArgumentError) do
        BrowserStackRunExecutor.build_options(
          ["--index", "0", "--tests-zip", "tests.zip"],
          env: {"E2E_BROWSERSTACK_TEST_RETRIES" => value}
        )
      end

      assert_includes error.message, "E2E_BROWSERSTACK_TEST_RETRIES must be an integer between 0 and 5"
    end
  end

  def test_executor_persists_a_passing_retry_with_the_original_failure_evidence
    Dir.mktmpdir do |output_dir|
      run = {
        "id" => "sample-android", "status_context" => "e2e/sample",
        "application_id" => "sample", "platform" => "android", "target" => "sample",
        "os_version_tag" => "latest", "execute" => ".", "include_tags" => [], "exclude_tags" => [],
        "device_selector" => "android:phone:latest", "app_id" => "com.example.sample",
        "ready_marker" => "ready", "control_link" => "com.example.sample://e2e", "artifact_env" => "TEST_APP_PATH"
      }
      plan = File.join(output_dir, "plan.json")
      File.write(plan, JSON.generate([run]))
      failed = {"name" => "./tests/checkout", "status" => "failed", "video" => "https://example.com/failed"}
      retry_test = {"name" => "./tests/checkout_bstackretry1", "status" => "passed"}
      session = {
        "id" => "session", "status" => "failed",
        "testcases" => {"count" => 2, "status" => {"passed" => 1, "failed" => 1},
                        "data" => [{"testcases" => [failed]}, {"testcases" => [retry_test]}]}
      }
      build = {"id" => "build", "status" => "failed", "devices" => [{"sessions" => [session]}]}
      client = Object.new
      client.define_singleton_method(:upload) { |*| {"app_url" => "bs://app", "test_suite_url" => "bs://suite"} }
      client.define_singleton_method(:start_build) { |*| {"build_id" => "build"} }
      client.define_singleton_method(:get_build) { |*| build }
      client.define_singleton_method(:get_session) { |*| session }
      output = StringIO.new
      executor = BrowserStackRunExecutor.new(
        {output_dir: output_dir, run_plan_path: plan, run_index: 0, tests_zip: "tests.zip", test_retries: 1},
        client: client, output: output
      )
      previous = ENV.to_h.slice("TEST_APP_PATH", "E2E_DEVICE_OVERRIDE")
      begin
        ENV["TEST_APP_PATH"] = "sample.apk"
        ENV["E2E_DEVICE_OVERRIDE"] = "Sample Device-17.0"
        executor.run
      ensure
        %w[TEST_APP_PATH E2E_DEVICE_OVERRIDE].each { |key| ENV[key] = previous[key] }
      end

      result = JSON.parse(File.read(File.join(output_dir, "result.json")))
      assert result.fetch("passed")
      assert_equal "failed", result.fetch("status")
      assert_empty result.fetch("failed_tests")
      assert_equal [failed, retry_test], result.fetch("retried_tests").first.fetch("attempts")
      assert_equal [session], JSON.parse(File.read(File.join(output_dir, "sessions.json")))
      assert_includes output.string, "BrowserStack build passed"
      assert_includes output.string, "Passed on retry:  1 flow(s)"
    end
  end

  private

  def build_request(platform: "android", env: {})
    Dir.mktmpdir do |output_dir|
      options = BrowserStackRunExecutor.build_options(
        ["--index", "0", "--tests-zip", "tests.zip", "--output-dir", output_dir],
        env: env
      )
      client = BuildRequestClient.new
      executor = BrowserStackRunExecutor.new(options, client: client)
      run = {
        "id" => "sample-launch",
        "platform" => platform,
        "execute" => "tests",
        "include_tags" => ["launch"],
        "exclude_tags" => ["skip"],
        "app_id" => "com.example.sample",
        "ready_marker" => "ready",
        "control_link" => "com.example.sample://e2e"
      }

      executor.send(:start_build, run, "bs://app", "bs://suite", "test-device")
      client
    end
  end
end
