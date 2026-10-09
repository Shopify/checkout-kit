# frozen_string_literal: true

require "open3"
require "time"

# Pure parsing of macOS unified log text for Tophat's Bitrise helper HTTP
# activity, plus a generic timeout-guarded shell-out used to fetch that text.
# tophatctl itself has no verbose/debug flag, so this is the only visibility
# into why an install actually failed.
module TophatDiagnostics
  module_function

  LOG_SHOW_BIN = "/usr/bin/log"
  PROCESS_NAMES = ["Tophat"].freeze
  KNOWN_PROCESS_LABELS = ["TophatBitriseExtension", "Tophat"].freeze
  STATUS_LINE_PATTERN = /received response,\s*status\s+(\d{3})\b/i
  LOG_TIMEOUT_SECONDS = 8

  STATUS_HINTS = {
    404 => "This usually means the artifact expired or no longer matches. Run\n   dev tophat --force-rebuild to trigger a fresh build and retry."
  }.freeze
  DEFAULT_HINT = "Try re-running dev tophat; if it persists, check the Bitrise build/artifact directly."

  Finding = Struct.new(:status, :process, :line, keyword_init: true)

  def parse_log_output(text)
    return [] if text.nil? || text.strip.empty?

    text.each_line.filter_map do |line|
      match = STATUS_LINE_PATTERN.match(line)
      next unless match

      status = match[1].to_i
      next if (200..299).cover?(status)

      process = KNOWN_PROCESS_LABELS.find { |name| line.include?(name) } || "Tophat"
      Finding.new(status: status, process: process, line: line.strip)
    end
  end

  def most_recent_finding(findings)
    findings.last
  end

  def log_show_argv(start_time:, processes: PROCESS_NAMES, style: "compact")
    predicate = processes.map { |name| %(process CONTAINS "#{name}") }.join(" OR ")
    [LOG_SHOW_BIN, "show", "--predicate", predicate, "--start", format_start_time(start_time), "--style", style]
  end

  def format_start_time(time)
    time.strftime("%Y-%m-%d %H:%M:%S%z")
  end

  def format_diagnostic_message(finding)
    hint = STATUS_HINTS.fetch(finding.status, DEFAULT_HINT)
    "🔴 Diagnostics: Tophat's Bitrise helper received HTTP #{finding.status} while installing.\n   #{hint}"
  end

  def capture_raw_log(start_time:, timeout_seconds: LOG_TIMEOUT_SECONDS)
    capture(log_show_argv(start_time: start_time), timeout_seconds: timeout_seconds)
  end

  def capture(argv, timeout_seconds: LOG_TIMEOUT_SECONDS)
    output = +""
    Open3.popen2e(*argv) do |stdin, out, wait_thread|
      stdin.close
      reader = Thread.new { out.each_line { |line| output << line } }
      unless wait_thread.join(timeout_seconds)
        kill(wait_thread.pid)
        reader.kill
        return nil
      end
      reader.join
      return nil unless wait_thread.value.success?
    end
    output
  rescue Errno::ENOENT, Errno::EACCES, SystemCallError
    nil
  end

  def kill(pid)
    Process.kill("TERM", pid)
  rescue Errno::ESRCH
    nil
  end
end
