# frozen_string_literal: true

# BrowserStack can leave the build/session status failed after a successful
# Maestro retry. Reconcile attempts within each session without hiding missing
# results, interrupted sessions, or failures on another device.
class BrowserStackTestResults
  FINISHED_STATUSES = %w[completed passed failed].freeze

  attr_reader :failed_tests, :retried_tests

  def initialize(build, sessions, retries:)
    @build = build
    @sessions = sessions
    @retries = retries
    @failed_tests = []
    @retried_tests = []
    @sessions_passed = sessions.map { |session| reconcile_session(session) }
  end

  def passed?
    expected = @build.fetch("devices", []).flat_map { |device| device.fetch("sessions", []) }
    ids = @sessions.map { |session| session["id"] }
    return false if expected.empty? || ids.any? { |id| id.to_s.empty? } || ids.uniq != ids
    return false unless expected.map { |session| session["id"] }.sort == ids.sort
    return false unless @sessions_passed.all?
    return false unless expected.all? do |session|
      actual = @sessions.find { |candidate| candidate["id"] == session["id"] }
      summary_matches?(session["testcases"], attempts(actual)) &&
        finished?(session, recovered: !retried_tests.empty?)
    end

    finished?(@build, recovered: !retried_tests.empty?)
  end

  private

  def attempts(session)
    session.dig("testcases", "data").to_a.flat_map { |group| group.fetch("testcases", []) }
  end

  def reconcile_session(session)
    tests = attempts(session)
    names = tests.map { |test| test["name"] }
    groups = tests.group_by do |test|
      name = test["name"].to_s
      match = name.match(/\A(.+)_bstackretry([1-5])\z/)
      if match && match[2].to_i <= @retries && names.include?(match[1])
        match[1]
      else
        name
      end
    end
    failures = []
    recovered = []
    groups.each do |name, group|
      unsuccessful = group.reject { |test| test["status"] == "passed" }
      # Only an explicit retry can supersede a failed assertion. Error, timeout,
      # queued and skipped attempts remain failures even if another attempt passes.
      if group.any? { |test| test["status"] == "passed" && test["name"] != name } &&
          unsuccessful.all? { |test| test["status"] == "failed" }
        recovered << {"name" => name, "attempts" => group} unless unsuccessful.empty?
      else
        failures.concat(unsuccessful)
      end
    end
    @failed_tests.concat(failures)
    @retried_tests.concat(recovered)
    !tests.empty? && names.none? { |name| name.to_s.empty? } &&
      summary_matches?(session["testcases"], tests) && failures.empty? &&
      finished?(session, recovered: !recovered.empty?)
  end

  def summary_matches?(summary, tests)
    return false unless summary.is_a?(Hash) && summary["count"] == tests.length

    counts = tests.map { |test| test["status"] }.tally
    advertised = summary["status"]
    advertised.is_a?(Hash) &&
      (advertised.keys | counts.keys).all? { |status| advertised.fetch(status, 0) == counts.fetch(status, 0) }
  end

  def finished?(result, recovered:)
    status = result["status"].to_s.downcase
    FINISHED_STATUSES.include?(status) && result["reason"].to_s.empty? &&
      (status != "failed" || recovered)
  end
end
