# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/browserstack_test_results"

class BrowserStackTestResultsTest < Minitest::Test
  def test_a_passing_retry_recovers_a_failed_build_and_preserves_attempt_artifacts
    original = test_case("checkout", "failed").merge("video" => "https://example.com/failure")
    retry_test = test_case("checkout_bstackretry1", "passed")
    result = normalize(session(original, retry_test), status: "failed")

    assert result.passed?
    assert_empty result.failed_tests
    assert_equal [{"name" => "checkout", "attempts" => [original, retry_test]}], result.retried_tests
  end

  def test_a_later_retry_can_pass_regardless_of_response_order
    result = normalize(session(
      test_case("checkout_bstackretry2", "passed"),
      test_case("checkout", "failed"),
      test_case("checkout_bstackretry1", "failed")
    ), retries: 2, status: "failed")

    assert result.passed?
    assert_equal 1, result.retried_tests.length
  end

  def test_exhausted_retries_remain_failed
    tests = [test_case("checkout", "failed"), test_case("checkout_bstackretry1", "failed")]
    result = normalize(session(*tests), status: "failed")

    refute result.passed?
    assert_equal tests, result.failed_tests
    assert_empty result.retried_tests
  end

  def test_an_unrelated_failure_is_not_hidden_by_a_passing_retry
    other = test_case("another-checkout", "failed")
    result = normalize(session(*recovered_attempts, other), status: "failed")

    refute result.passed?
    assert_equal [other], result.failed_tests
  end

  def test_a_retry_on_another_device_cannot_clear_a_failure
    failed = session(test_case("checkout", "failed"))
    passed = session(test_case("checkout_bstackretry1", "passed"), id: "second-device", status: "passed")
    result = normalize(failed, passed, status: "failed")

    refute result.passed?
    assert_equal [test_case("checkout", "failed")], result.failed_tests
    assert_empty result.retried_tests
  end

  def test_retries_must_be_enabled_and_within_the_configured_limit
    [0, 1].each do |limit|
      result = normalize(session(test_case("checkout", "failed"), test_case("checkout_bstackretry2", "passed")), retries: limit)

      refute result.passed?
      assert_empty result.retried_tests
    end
  end

  def test_a_similarly_named_flow_cannot_clear_a_failure
    %w[checkout_bstackretry0 checkout_bstackretry6 checkout_bstackretry1_extra different_bstackretry1].each do |name|
      result = normalize(session(test_case("checkout", "failed"), test_case(name, "passed")))

      refute result.passed?, name
      assert_empty result.retried_tests
    end
  end

  def test_a_duplicate_name_is_not_evidence_of_a_retry
    result = normalize(session(test_case("checkout", "failed"), test_case("checkout", "passed")))

    refute result.passed?
    assert_empty result.retried_tests
  end

  def test_incomplete_or_errored_attempts_remain_failures
    %w[error timedout skipped queued running unknown].each do |status|
      result = normalize(session(test_case("checkout", status), test_case("checkout_bstackretry1", "passed")))

      refute result.passed?, status
      assert_equal status, result.failed_tests.first.fetch("status")
    end
  end

  def test_infrastructure_build_failures_cannot_be_overridden
    %w[error timedout stopped done running].each do |status|
      refute normalize(session(*recovered_attempts), status: status).passed?, status
    end
  end

  def test_session_failure_reasons_cannot_be_overridden
    interrupted = session(*recovered_attempts).merge("reason" => "CLIENT_STOPPED_SESSION")

    refute normalize(interrupted).passed?
  end

  def test_unfinished_or_interrupted_sessions_cannot_be_overridden
    %w[error timedout stopped running queued].each do |status|
      refute normalize(session(*recovered_attempts, status: status)).passed?, status
    end
  end

  def test_a_failed_build_without_a_recovered_failure_stays_failed
    result = normalize(session(test_case("checkout", "passed"), status: "passed"), status: "failed")

    refute result.passed?
  end

  def test_empty_builds_and_sessions_never_pass
    refute normalize.passed?
    refute normalize(session(status: "passed")).passed?
  end

  def test_missing_or_duplicate_sessions_never_pass
    complete = session(test_case("checkout", "passed"), status: "passed")
    build = build_for([complete])

    refute BrowserStackTestResults.new(build, [], retries: 1).passed?
    refute BrowserStackTestResults.new(build, [complete, complete], retries: 1).passed?
    refute BrowserStackTestResults.new(build, [complete.merge("id" => "different")], retries: 1).passed?
  end

  def test_missing_test_details_never_pass_even_if_all_visible_tests_pass
    incomplete = session(test_case("checkout", "passed"), status: "passed")
    incomplete["testcases"]["count"] = 2
    incomplete["testcases"]["status"]["passed"] = 2

    refute normalize(incomplete).passed?
  end

  def test_build_and_session_counts_must_agree
    complete = session(*recovered_attempts)
    build = build_for([complete], status: "failed")
    build["devices"][0]["sessions"][0]["testcases"]["count"] = 3

    refute BrowserStackTestResults.new(build, [complete], retries: 1).passed?
  end

  def test_an_interruption_reported_only_by_the_build_summary_is_not_hidden
    complete = session(*recovered_attempts)
    build = build_for([complete], status: "failed")
    build["devices"][0]["sessions"][0]["status"] = "stopped"

    refute BrowserStackTestResults.new(build, [complete], retries: 1).passed?
  end

  def test_status_totals_must_agree_with_attempt_details
    incomplete = session(*recovered_attempts)
    incomplete["testcases"]["status"]["error"] = 1

    refute normalize(incomplete).passed?
  end

  def test_success_without_retries_still_passes
    result = normalize(session(test_case("checkout", "passed"), status: "passed"))

    assert result.passed?
    assert_empty result.failed_tests
    assert_empty result.retried_tests
  end

  private

  def test_case(name, status)
    {"name" => name, "status" => status}
  end

  def recovered_attempts
    [test_case("checkout", "failed"), test_case("checkout_bstackretry1", "passed")]
  end

  def session(*tests, id: "device-session", status: "failed")
    {
      "id" => id,
      "status" => status,
      "testcases" => {
        "count" => tests.length,
        "status" => tests.map { |test| test.fetch("status") }.tally,
        "data" => tests.map { |test| {"class" => test.fetch("name"), "testcases" => [test]} }
      }
    }
  end

  def build_for(sessions, status: "completed")
    {
      "status" => status,
      "devices" => sessions.map do |session|
        {"sessions" => [session.merge("testcases" => session.fetch("testcases").reject { |key| key == "data" })]}
      end
    }
  end

  def normalize(*sessions, status: "completed", retries: 1)
    BrowserStackTestResults.new(build_for(sessions, status: status), sessions, retries: retries)
  end
end
