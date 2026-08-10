# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
load File.expand_path("../scripts/execute_browserstack_run", __dir__)

class BrowserStackRunExecutorTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)

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

  def test_build_request_enables_device_logs_for_passing_testcase_inspection
    body = BrowserStackRunExecutor.build_request_body(
      run: {
        "id" => "swift-ios-latest",
        "execute" => "tests",
        "app_id" => "com.shopify.checkoutkit.swiftdemo",
        "ready_marker" => "checkout-kit-sample-ready"
      },
      app_url: "bs://app",
      test_suite_url: "bs://suite",
      device: "iPhone 15-27",
      env: {
        "E2E_BROWSERSTACK_PROJECT" => "test-project",
        "E2E_MAESTRO_VERSION" => "2.4.0",
        "BITRISE_GIT_COMMIT" => "test-sha"
      }
    )

    assert_equal(
      {
        app: "bs://app",
        testSuite: "bs://suite",
        project: "test-project",
        maestroVersion: "2.4.0",
        buildTag: "test-sha",
        customBuildName: "swift-ios-latest",
        devices: ["iPhone 15-27"],
        execute: ["tests"],
        deviceLogs: true,
        setEnvVariables: {
          E2E_APP_ID: "com.shopify.checkoutkit.swiftdemo",
          E2E_READY_MARKER: "checkout-kit-sample-ready"
        }
      },
      body
    )
  end

  def test_session_details_are_not_ready_until_each_session_has_a_testcase
    refute BrowserStackRunExecutor.sessions_have_testcases?([])
    refute BrowserStackRunExecutor.sessions_have_testcases?([{"testcases" => {"data" => []}}])
    assert BrowserStackRunExecutor.sessions_have_testcases?(sessions_with_device_log)
  end

  def test_preflight_accepts_the_expected_cache_hit_signal
    output, = capture_io do
      BrowserStackRunExecutor.verify_preload_cache_hit_log!(
        run: preflight_run("kotlin"),
        sessions: sessions_with_device_log,
        fetch_log: ->(_) { "Returning cached preloaded WebView." }
      )
    end

    assert_includes output, "Verified kotlin preload cache-hit signal"
  end

  def test_preflight_can_use_an_instrumentation_log_when_device_log_is_unavailable
    output, = capture_io do
      BrowserStackRunExecutor.verify_preload_cache_hit_log!(
        run: preflight_run("kotlin"),
        sessions: sessions_with_device_log(
          device_log: nil,
          instrumentation_log: "https://api.browserstack.com/instrumentation-log"
        ),
        fetch_log: ->(_) { "Returning cached preloaded WebView." }
      )
    end

    assert_includes output, "Verified kotlin preload cache-hit signal"
  end

  def test_swift_preflight_uses_the_in_app_accessibility_assertion_instead
    BrowserStackRunExecutor.verify_preload_cache_hit_log!(
      run: preflight_run("swift"),
      sessions: [],
      fetch_log: ->(_) { flunk "Swift should not fetch BrowserStack log artifacts" }
    )
  end

  def test_preflight_requires_a_log_artifact_from_a_passing_testcase
    error = assert_raises(RuntimeError) do
      BrowserStackRunExecutor.verify_preload_cache_hit_log!(
        run: preflight_run("kotlin"),
        sessions: sessions_with_device_log(device_log: nil),
        fetch_log: ->(_) { "Returning cached preloaded WebView." }
      )
    end

    assert_includes error.message, "did not expose a supported log artifact"
  end

  def test_preflight_requires_the_platform_cache_hit_signal
    error = assert_raises(RuntimeError) do
      BrowserStackRunExecutor.verify_preload_cache_hit_log!(
        run: preflight_run("kotlin"),
        sessions: sessions_with_device_log,
        fetch_log: ->(_) { "unrelated device output" }
      )
    end

    assert_includes error.message, "kotlin preload cache-hit signal"
  end

  def test_ios_preflight_failure_diagnostics_report_steps_and_signals_without_urls
    sessions = [
      {
        "testcases" => {
          "data" => [
            {
              "testcases" => [
                {
                  "status" => "failed",
                  "maestro_log" => "https://api.browserstack.com/maestro-log",
                  "device_log" => "https://api.browserstack.com/device-log"
                }
              ]
            }
          ]
        }
      }
    ]
    logs = {
      "https://api.browserstack.com/maestro-log" => <<~LOG,
        Launch app "https://example.test/secret" ... FAILED
        Assert that id: preload-cache-hit is visible... FAILED
      LOG
      "https://api.browserstack.com/device-log" => "Presenting cached entry"
    }

    error = assert_raises(RuntimeError) do
      BrowserStackRunExecutor.diagnose_ios_preflight_failure!(
        run: preflight_run("swift"),
        sessions: sessions,
        fetch_log: ->(url) { logs.fetch(url) }
      )
    end

    assert_includes error.message, "Assert that id: preload-cache-hit is visible... FAILED"
    assert_includes error.message, "Presenting cached entry=true"
    assert_includes error.message, "Presenting preloaded checkout from cache=false"
    refute_includes error.message, "https://example.test"
  end

  def test_android_preflight_rejects_a_concurrent_fresh_presentation
    error = assert_raises(RuntimeError) do
      BrowserStackRunExecutor.verify_preload_cache_hit_log!(
        run: preflight_run("kotlin"),
        sessions: sessions_with_device_log,
        fetch_log: lambda do |_|
          <<~LOG
            Returning cached preloaded WebView.
            Preloaded WebView is already presented; creating a new WebView.
          LOG
        end
      )
    end

    assert_includes error.message, "concurrent fresh presentation"
  end

  private

  def preflight_run(target)
    {
      "target" => target,
      "execute" => BrowserStackRunExecutor::PRELOAD_LOG_PREFLIGHT_FLOW
    }
  end

  def sessions_with_device_log(
    device_log: "https://api.browserstack.com/device-log",
    instrumentation_log: nil,
    maestro_log: nil
  )
    [
      {
        "testcases" => {
          "data" => [
            {
              "testcases" => [
                {
                  "status" => "passed",
                  "device_log" => device_log,
                  "instrumentation_log" => instrumentation_log,
                  "maestro_log" => maestro_log
                }
              ]
            }
          ]
        }
      }
    ]
  end
end
