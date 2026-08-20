# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require_relative "../lib/browserstack_runner_executor"

class BrowserStackRunnerExecutorTest < Minitest::Test
  def setup
    @executor = BrowserStackRunnerExecutor.allocate
  end

  def test_android_capabilities_install_the_uploaded_app_on_the_resolved_device
    capabilities = @executor.send(
      :capabilities,
      {
        "id" => "kotlin-android-latest",
        "application_id" => "kotlin-android",
        "app_id" => "com.shopify.checkoutkit",
        "platform" => "android"
      },
      {
        "resolved_device" => "Google Pixel 9",
        "resolved_os_version" => "15.0"
      },
      "bs://uploaded-app",
      "checkout-kit maestro-runner 123",
      "user",
      "key"
    )

    assert_equal "Android", capabilities.fetch("platformName")
    assert_equal "UiAutomator2", capabilities.fetch("appium:automationName")
    assert_equal "bs://uploaded-app", capabilities.fetch("appium:app")
    assert_equal "Google Pixel 9", capabilities.fetch("appium:deviceName")
    assert_equal "15.0", capabilities.fetch("appium:platformVersion")
    assert_equal "com.shopify.checkoutkit", capabilities.fetch("appium:appPackage")
    assert_equal false, capabilities.fetch("appium:noReset")
    assert_equal true, capabilities.fetch("appium:autoGrantPermissions")

    browserstack = capabilities.fetch("bstack:options")
    assert_equal "user", browserstack.fetch("userName")
    assert_equal "key", browserstack.fetch("accessKey")
    assert_equal "checkout-kit maestro-runner 123", browserstack.fetch("buildName")
    assert_equal "kotlin-android-latest", browserstack.fetch("sessionName")
    refute browserstack.key?("appiumVersion")
    refute browserstack.key?("language")
    refute browserstack.key?("locale")
  end

  def test_ios_capabilities_use_xcuitest_and_the_bundle_identifier
    capabilities = @executor.send(
      :capabilities,
      {
        "id" => "swift-ios-latest",
        "application_id" => "swift-ios",
        "app_id" => "com.shopify.checkoutkit",
        "platform" => "ios"
      },
      {
        "resolved_device" => "iPhone 16",
        "resolved_os_version" => "18"
      },
      "bs://uploaded-app",
      "checkout-kit maestro-runner abc",
      "user",
      "key"
    )

    assert_equal "iOS", capabilities.fetch("platformName")
    assert_equal "XCUITest", capabilities.fetch("appium:automationName")
    assert_equal "com.shopify.checkoutkit", capabilities.fetch("appium:bundleId")
    refute capabilities.key?("appium:autoGrantPermissions")
  end

  def test_command_translates_tags_and_environment_to_repeated_runner_flags
    command = @executor.send(
      :runner_command,
      "/tmp/maestro-runner",
      "/tmp/caps.json",
      "/tmp/results",
      "/tmp/sessions.jsonl",
      {
        "platform" => "ios",
        "target" => "swift",
        "app_id" => "com.shopify.checkoutkit",
        "ready_marker" => "sample-ready",
        "control_link" => "com.shopify.checkoutkit://e2e",
        "include_tags" => ["launch", "checkout"],
        "exclude_tags" => ["android", "local"],
        "env" => {"CART" => "synthetic-cart", "EMPTY" => ""}
      }
    )

    assert_equal [
      "/tmp/maestro-runner",
      "--driver", "appium",
      "--platform", "ios",
      "--appium-url", BrowserStackRunnerExecutor::APPIUM_URL,
      "--caps", "/tmp/caps.json",
      "--appium-session-file", "/tmp/sessions.jsonl",
      "test",
      "--output", "/tmp/results",
      "--flatten",
      "--artifacts", "always",
      "--include-tags", "launch",
      "--include-tags", "checkout",
      "--exclude-tags", "android",
      "--exclude-tags", "local",
      "--env", "E2E_APP_ID=com.shopify.checkoutkit",
      "--env", "E2E_READY_MARKER=sample-ready",
      "--env", "E2E_CONTROL_LINK=com.shopify.checkoutkit://e2e",
      "--env", "CART=synthetic-cart",
      "--env", "EMPTY=",
      "tests/shared"
    ], command
  end

  def test_redaction_removes_browserstack_credentials_from_runner_output
    @executor.instance_variable_set(:@env, {
      "BROWSERSTACK_USERNAME" => "browserstack-user",
      "BROWSERSTACK_ACCESS_KEY" => "browserstack-key"
    })

    redacted = @executor.send(:redact, "user=browserstack-user key=browserstack-key")

    assert_equal "user=[REDACTED] key=[REDACTED]", redacted
  end

  def test_runner_workspace_enables_a_fresh_appium_session_without_changing_the_shared_flow
    Dir.mktmpdir do |source|
      launch_path = File.join(source, "flows/app/launch.yaml")
      FileUtils.mkdir_p(File.dirname(launch_path))
      File.write(launch_path, "- launchApp:\n    clearState: true\n    arguments: {}\n")
      @executor.instance_variable_set(:@workspace, source)

      @executor.send(:with_runner_workspace) do |workspace|
        copied_launch = File.read(File.join(workspace, "flows/app/launch.yaml"))
        assert_includes copied_launch, "clearState: true\n    newSession: true"
      end

      refute_includes File.read(launch_path), "newSession"
    end
  end

  def test_normalized_result_uses_runner_report_for_failures_and_timing
    result = @executor.send(
      :normalized_result,
      {
        "id" => "react-native-ios-latest",
        "target" => "react-native-ios",
        "application_id" => "com.shopify.checkoutkit",
        "platform" => "ios",
        "os_version_tag" => "latest"
      },
      {
        "resolved_device" => "iPhone 16",
        "resolved_os_version" => "18"
      },
      {
        "status" => "failed",
        "startTime" => "2026-03-10T10:00:00Z",
        "endTime" => "2026-03-10T10:01:02.500Z",
        "summary" => {"total" => 2, "passed" => 1, "failed" => 1},
        "flows" => [
          {"name" => "Launch smoke", "status" => "passed", "duration" => 12_000},
          {"name" => "Guest checkout", "sourceFile" => "tests/shared/checkout-guest.yaml", "status" => "failed", "duration" => 50_500, "error" => "Card field timed out"}
        ]
      },
      "build-hash"
    )

    assert_equal false, result.fetch("passed")
    assert_equal 62_500, result.fetch("duration_ms")
    assert_equal({"total" => 2, "passed" => 1, "failed" => 1}, result.fetch("summary"))
    assert_equal [
      {
        "name" => "Guest checkout",
        "source_file" => "tests/shared/checkout-guest.yaml",
        "duration_ms" => 50_500,
        "error" => "Card field timed out"
      }
    ], result.fetch("failed_tests")
    assert_equal "build-hash", result.fetch("build_id")
    assert_equal "maestro-runner", result.fetch("executor")
  end
end
