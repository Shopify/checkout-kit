# frozen_string_literal: true

require "minitest/autorun"
require "yaml"

class BootstrapCartFromLinkTest < Minitest::Test
  FLOW_PATH = File.expand_path("../flows/app/bootstrap-cart-from-link.yaml", __dir__)

  def commands
    YAML.load_stream(File.read(FLOW_PATH)).fetch(1)
  end

  def test_clears_state_then_relaunches_only_if_the_app_is_not_ready
    clearing_launches = commands.filter_map { |command| command["launchApp"] }.select { |launch| launch["clearState"] }

    assert_equal(1, clearing_launches.length)

    ready_probe = commands.filter_map { |command| command["extendedWaitUntil"] }.find do |wait|
      wait.dig("visible", "id") == "${E2E_READY_MARKER}"
    end

    refute_nil(ready_probe)
    assert_equal(10_000, ready_probe["timeout"])
    assert(ready_probe["optional"])

    fallback = commands.filter_map { |command| command["runFlow"] }.find do |run_flow|
      run_flow.dig("when", "notVisible", "id") == "${E2E_READY_MARKER}"
    end

    refute_nil(fallback)

    launch_retry = fallback.fetch("commands").filter_map { |command| command["retry"] }.find do |retry_config|
      retry_config.fetch("commands").any? { |command| command.key?("launchApp") }
    end

    refute_nil(launch_retry)
    assert_equal(1, launch_retry["maxRetries"])

    retry_commands = launch_retry.fetch("commands")
    normal_launch = retry_commands.find { |command| command.key?("launchApp") }.fetch("launchApp")
    ready_wait = retry_commands.find { |command| command.key?("extendedWaitUntil") }.fetch("extendedWaitUntil")

    refute(normal_launch.fetch("clearState", false))
    assert_equal("${E2E_READY_MARKER}", ready_wait.dig("visible", "id"))
    assert_equal(60_000, ready_wait["timeout"])
  end
end
