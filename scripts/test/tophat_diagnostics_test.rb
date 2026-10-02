# frozen_string_literal: true

require "minitest/autorun"
require "time"
require_relative "../tophat/diagnostics"

class TophatDiagnosticsTest < Minitest::Test
  THREE_OK_THEN_404 = <<~LOG
    2026-08-07 10:15:30.111111-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_1 received response, status 200
    2026-08-07 10:15:30.222222-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_2 received response, status 200
    2026-08-07 10:15:30.333333-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_3 received response, status 200
    2026-08-07 10:15:31.444444-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_4 received response, status 404
  LOG

  ONLY_OK = <<~LOG
    2026-08-07 10:15:30.111111-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_1 received response, status 200
    2026-08-07 10:15:30.222222-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_2 received response, status 200
  LOG

  TWO_DIFFERENT_NON_2XX = <<~LOG
    2026-08-07 10:15:30.111111-0700  0x2a3  Info  0x0  1111  0  Tophat: task_1 received response, status 401
    2026-08-07 10:15:31.222222-0700  0x2a3  Info  0x0  1111  0  TophatBitriseExtension: task_2 received response, status 404
  LOG

  NO_PROCESS_NAME_LINE = "some tool: task_1 received response, status 500\n"

  def test_parse_log_output_returns_empty_array_for_nil
    assert_equal [], TophatDiagnostics.parse_log_output(nil)
  end

  def test_parse_log_output_returns_empty_array_for_empty_string
    assert_equal [], TophatDiagnostics.parse_log_output("")
  end

  def test_parse_log_output_returns_empty_array_when_only_2xx_statuses_present
    assert_equal [], TophatDiagnostics.parse_log_output(ONLY_OK)
  end

  def test_parse_log_output_extracts_single_non_2xx_finding_with_process_and_status
    findings = TophatDiagnostics.parse_log_output(THREE_OK_THEN_404)
    assert_equal 1, findings.length
    assert_equal 404, findings.first.status
    assert_equal "TophatBitriseExtension", findings.first.process
  end

  def test_parse_log_output_extracts_multiple_non_2xx_findings_in_order
    findings = TophatDiagnostics.parse_log_output(TWO_DIFFERENT_NON_2XX)
    assert_equal [401, 404], findings.map(&:status)
  end

  def test_parse_log_output_ignores_2xx_lines_interleaved_with_non_2xx
    findings = TophatDiagnostics.parse_log_output(THREE_OK_THEN_404)
    assert_equal [404], findings.map(&:status)
  end

  def test_parse_log_output_returns_empty_array_for_malformed_log_text
    assert_equal [], TophatDiagnostics.parse_log_output("this log line has nothing useful in it\n")
  end

  def test_parse_log_output_falls_back_to_tophat_when_process_name_absent_from_line
    findings = TophatDiagnostics.parse_log_output(NO_PROCESS_NAME_LINE)
    assert_equal "Tophat", findings.first.process
  end

  def test_most_recent_finding_returns_last_of_multiple
    findings = TophatDiagnostics.parse_log_output(TWO_DIFFERENT_NON_2XX)
    assert_equal 404, TophatDiagnostics.most_recent_finding(findings).status
  end

  def test_most_recent_finding_returns_nil_for_empty_array
    assert_nil TophatDiagnostics.most_recent_finding([])
  end

  def test_format_diagnostic_message_for_404_uses_specific_hint_and_emoji
    finding = TophatDiagnostics.parse_log_output(THREE_OK_THEN_404).first
    message = TophatDiagnostics.format_diagnostic_message(finding)
    assert message.start_with?("🔴 Diagnostics: Tophat's Bitrise helper received HTTP 404")
    assert_includes message, "artifact expired"
  end

  def test_format_diagnostic_message_for_unmapped_status_uses_generic_hint
    finding = TophatDiagnostics::Finding.new(status: 500, process: "Tophat", line: "irrelevant")
    message = TophatDiagnostics.format_diagnostic_message(finding)
    assert_includes message, TophatDiagnostics::DEFAULT_HINT
    refute_includes message, "artifact expired"
  end

  def test_log_show_argv_includes_predicate_and_formatted_start_time
    start_time = Time.new(2026, 8, 7, 10, 0, 0, "-07:00")
    argv = TophatDiagnostics.log_show_argv(start_time: start_time)
    assert_equal ["--predicate", %(process CONTAINS "Tophat")], argv[2, 2]
    assert_equal ["--start", "2026-08-07 10:00:00-0700"], argv[4, 2]
  end

  def test_log_show_argv_joins_multiple_process_names_with_or
    start_time = Time.new(2026, 8, 7, 10, 0, 0, "-07:00")
    argv = TophatDiagnostics.log_show_argv(start_time: start_time, processes: ["Tophat", "OtherProc"])
    assert_equal %(process CONTAINS "Tophat" OR process CONTAINS "OtherProc"), argv[3]
  end

  def test_capture_returns_stdout_for_a_successful_command
    assert_equal "hello\n", TophatDiagnostics.capture(["/bin/echo", "hello"])
  end

  def test_capture_returns_nil_for_missing_binary
    assert_nil TophatDiagnostics.capture(["/no/such/binary-xyz"])
  end

  def test_capture_returns_nil_on_nonzero_exit
    assert_nil TophatDiagnostics.capture(["/usr/bin/false"])
  end

  def test_capture_returns_nil_on_timeout
    assert_nil TophatDiagnostics.capture(["/bin/sleep", "2"], timeout_seconds: 0.2)
  end
end
