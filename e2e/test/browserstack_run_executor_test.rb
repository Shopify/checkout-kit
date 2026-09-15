# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
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

  class StartBuildClient
    attr_reader :requests

    def initialize
      @requests = []
    end

    def start_build(platform, body)
      @requests << [platform, body]
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

  def test_ios_builds_request_apple_pay
    Dir.mktmpdir do |output_dir|
      client = StartBuildClient.new
      executor = BrowserStackRunExecutor.new({output_dir: output_dir}, client: client)
      run = {
        "id" => "swift-ios-latest",
        "platform" => "ios",
        "app_id" => "com.example.ios",
        "ready_marker" => "ready",
        "control_link" => "com.example.ios://e2e",
        "execute" => ["tests/shared"],
        "include_tags" => ["apple-pay"],
        "exclude_tags" => ["flaky"]
      }

      executor.send(:start_build, run, "bs://app", "bs://suite", "iPhone 15-17")

      _, body = client.requests.fetch(0)
      assert_equal true, body.fetch(:enableApplePay)

      run["platform"] = "android"
      executor.send(:start_build, run, "bs://app", "bs://suite", "Google Pixel 9-16")

      _, body = client.requests.fetch(1)
      refute body.key?(:enableApplePay)
    end
  end
end
