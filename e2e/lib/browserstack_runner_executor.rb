# frozen_string_literal: true

require "fileutils"
require "json"
require "open3"
require "tempfile"
require "time"
require "tmpdir"
require_relative "browserstack_client"
require_relative "browserstack_device_resolver"

class BrowserStackRunnerExecutor
  APPIUM_URL = "https://hub-cloud.browserstack.com/wd/hub"

  def initialize(client:, run:, app_path:, output_dir:, runner_binary:, env: ENV, workspace: File.expand_path("..", __dir__))
    @client = client
    @run = run
    @app_path = app_path
    @output_dir = output_dir
    @runner_binary = runner_binary
    @env = env
    @workspace = workspace
  end

  def execute!
    validate!
    FileUtils.mkdir_p(@output_dir)

    resolved_device = resolve_device
    app_url = @client.upload_app_automate_app(@app_path, app_custom_id).fetch("app_url")
    build_name = browserstack_build_name
    runner_output = File.join(@output_dir, "maestro-runner")
    sessions_path = File.join(@output_dir, "appium-sessions.jsonl")
    report = nil
    runner_passed = false

    with_runner_workspace do |workspace|
      Tempfile.create(["checkout-kit-appium-capabilities", ".json"]) do |file|
        file.write(JSON.generate(capabilities(@run, resolved_device, app_url, build_name, username, access_key)))
        file.flush
        command = runner_command(@runner_binary, file.path, runner_output, sessions_path, @run)
        runner_passed = run_process(command, File.join(@output_dir, "maestro-runner.log"), workspace)
        report = read_report(runner_output)
      end
    end

    build_id = find_build_id(build_name)
    result = normalized_result(@run, resolved_device, report, build_id)
    result["passed"] &&= runner_passed
    write_result(result)
    result.fetch("passed")
  rescue StandardError => error
    write_result(failure_result(error))
    warn "BrowserStack maestro-runner execution failed: #{error.message}"
    false
  ensure
    redact_artifacts
  end

  private

  def validate!
    raise "BrowserStack username is required" if username.empty?
    raise "BrowserStack access key is required" if access_key.empty?
    raise "application artifact does not exist: #{@app_path}" unless File.file?(@app_path)
    raise "maestro-runner is not executable: #{@runner_binary}" unless File.executable?(@runner_binary)
  end

  def username
    @env.fetch("BROWSERSTACK_USERNAME", "")
  end

  def access_key
    @env.fetch("BROWSERSTACK_ACCESS_KEY", "")
  end

  def resolve_device
    devices = @client.list_devices
    limits = @client.list_device_tier_limits
    BrowserStackDeviceResolver.new(devices, limits).resolve(@run.fetch("device_selector"))
  end

  def app_custom_id
    commit = @env["GIT_COMMIT"] || @env["BITRISE_GIT_COMMIT"] || "local"
    "checkout-kit-#{@run.fetch("target")}-#{@run.fetch("platform")}-#{commit}".gsub(/[^a-zA-Z0-9_.-]/, "-")
  end

  def browserstack_build_name
    identifier = @env["BITRISE_BUILD_NUMBER"] || @env["GITHUB_RUN_ID"] || @env["GIT_COMMIT"] || Time.now.utc.strftime("%Y%m%d%H%M%S")
    "checkout-kit maestro-runner #{identifier} #{@run.fetch("id")}"
  end

  def find_build_id(build_name)
    @client.find_build_by_name(build_name)&.fetch("hashed_id", nil)
  rescue StandardError => error
    warn "Unable to resolve BrowserStack build #{build_name}: #{error.message}"
    nil
  end

  def capabilities(run, resolved_device, app_url, build_name, browserstack_username, browserstack_access_key)
    platform = run.fetch("platform")
    result = {
      "platformName" => platform == "ios" ? "iOS" : "Android",
      "appium:automationName" => platform == "ios" ? "XCUITest" : "UiAutomator2",
      "appium:app" => app_url,
      "appium:deviceName" => resolved_device.fetch("resolved_device"),
      "appium:platformVersion" => resolved_device.fetch("resolved_os_version"),
      "appium:noReset" => false,
      "appium:fullReset" => false,
      "appium:newCommandTimeout" => 300,
      "bstack:options" => {
        "userName" => browserstack_username,
        "accessKey" => browserstack_access_key,
        "projectName" => "Checkout Kit E2E",
        "buildName" => build_name,
        "sessionName" => run.fetch("id"),
        "debug" => true,
        "video" => true,
        "deviceLogs" => true,
        "networkLogs" => true,
        "idleTimeout" => 300
      }
    }

    if platform == "ios"
      result["appium:bundleId"] = run.fetch("app_id")
    else
      result["appium:appPackage"] = run.fetch("app_id")
      result["appium:autoGrantPermissions"] = true
    end

    result
  end

  def runner_command(binary, caps_path, runner_output, sessions_path, run)
    command = [
      binary,
      "--driver", "appium",
      "--platform", run.fetch("platform"),
      "--appium-url", APPIUM_URL,
      "--caps", caps_path,
      "--appium-session-file", sessions_path,
      "test",
      "--output", runner_output,
      "--flatten",
      "--artifacts", "always"
    ]

    comma_separated(run["include_tags"]).each { |tag| command.concat(["--include-tags", tag]) }
    comma_separated(run["exclude_tags"]).each { |tag| command.concat(["--exclude-tags", tag]) }
    flow_environment(run).each { |key, value| command.concat(["--env", "#{key}=#{value}"]) }
    command.concat(test_paths(run))
  end

  def test_paths(run)
    paths = ["tests/shared"]
    target_path = "tests/#{run.fetch("target")}"
    paths << target_path if @workspace && File.directory?(File.join(@workspace, target_path))
    paths
  end

  def comma_separated(value)
    values = value.is_a?(Array) ? value : value.to_s.split(",")
    values.map(&:to_s).map(&:strip).reject(&:empty?)
  end

  def flow_environment(run)
    {
      "E2E_APP_ID" => run.fetch("app_id"),
      "E2E_READY_MARKER" => run.fetch("ready_marker"),
      "E2E_CONTROL_LINK" => run.fetch("control_link")
    }.merge(run.fetch("env", {}))
  end

  def with_runner_workspace
    Dir.mktmpdir("checkout-kit-maestro-runner") do |workspace|
      FileUtils.cp_r(File.join(@workspace, "."), workspace)
      launch_path = File.join(workspace, "flows/app/launch.yaml")
      launch_flow = File.read(launch_path)
      updated_flow = launch_flow.sub(/^(\s*)clearState: true$/, "\\1clearState: true\n\\1newSession: true")
      raise "could not enable Appium newSession in #{launch_path}" if updated_flow == launch_flow

      File.write(launch_path, updated_flow)
      yield workspace
    end
  end

  def run_process(command, log_path, workspace)
    success = false
    File.open(log_path, "w") do |log|
      Open3.popen2e(*command, chdir: workspace) do |_stdin, output, wait_thread|
        output.each do |line|
          safe_line = redact(line)
          $stdout.write(safe_line)
          log.write(safe_line)
        end
        success = wait_thread.value.success?
      end
    end
    success
  end

  def redact(value)
    [username, access_key].reject(&:empty?).reduce(value) { |text, secret| text.gsub(secret, "[REDACTED]") }
  end

  def redact_artifacts
    return unless @output_dir && File.directory?(@output_dir)

    Dir.glob(File.join(@output_dir, "**", "*.{html,json,jsonl,log,txt,xml}")).each do |path|
      contents = File.binread(path)
      redacted = redact(contents)
      File.binwrite(path, redacted) if redacted != contents
    end
  end

  def read_report(runner_output)
    path = File.join(runner_output, "report.json")
    raise "maestro-runner did not produce #{path}" unless File.file?(path)

    JSON.parse(File.read(path))
  end

  def normalized_result(run, resolved_device, report, build_id)
    failed_tests = report.fetch("flows", []).filter_map do |flow|
      next unless flow["status"] == "failed"

      {
        "name" => flow.fetch("name", "unknown"),
        "source_file" => flow["sourceFile"],
        "duration_ms" => flow["duration"],
        "error" => flow["error"]
      }.compact
    end

    {
      "id" => run.fetch("id"),
      "target" => run.fetch("target"),
      "application_id" => run.fetch("application_id"),
      "platform" => run.fetch("platform"),
      "os_version_tag" => run.fetch("os_version_tag"),
      "resolved_device" => resolved_device.fetch("resolved_device"),
      "resolved_os_version" => resolved_device.fetch("resolved_os_version"),
      "passed" => report["status"] == "passed",
      "duration_ms" => report.fetch("flows", []).sum { |flow| flow.fetch("duration", 0).to_i },
      "summary" => report.fetch("summary", {}),
      "failed_tests" => failed_tests,
      "build_id" => build_id,
      "executor" => "maestro-runner"
    }
  end

  def failure_result(error)
    {
      "id" => @run["id"],
      "target" => @run["target"],
      "application_id" => @run["application_id"],
      "platform" => @run["platform"],
      "os_version_tag" => @run["os_version_tag"],
      "passed" => false,
      "failed_tests" => [{"name" => "maestro-runner setup", "error" => error.message}],
      "executor" => "maestro-runner"
    }.compact
  end

  def write_result(result)
    FileUtils.mkdir_p(@output_dir)
    File.write(File.join(@output_dir, "result.json"), JSON.pretty_generate(result))
  end
end
