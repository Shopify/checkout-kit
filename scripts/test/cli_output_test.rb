# frozen_string_literal: true

require "minitest/autorun"
require "stringio"
require_relative "../lib/cli_output"

class CliOutputTest < Minitest::Test
  def test_red_wraps_text_in_bold_red_ansi
    assert_equal "\e[1;31mboom\e[0m", CliOutput.red("boom")
  end

  def test_blue_wraps_text_in_bold_blue_ansi
    assert_equal "\e[1;34mhint\e[0m", CliOutput.blue("hint")
  end

  def test_suggestion_prefixes_lightbulb_and_colors_blue
    assert_equal "\e[1;34m💡 Fix: rebase\e[0m", CliOutput.suggestion("rebase")
  end

  def test_red_is_plain_when_no_color_is_set
    original = ENV["NO_COLOR"]
    ENV["NO_COLOR"] = "1"
    assert_equal "boom", CliOutput.red("boom")
  ensure
    ENV["NO_COLOR"] = original
  end

  def test_die_prints_error_and_suggestion_then_exits_nonzero
    original = $stderr
    captured = StringIO.new
    $stderr = captured
    error = assert_raises(SystemExit) { CliOutput.die("boom", hint: "rebase on main") }
    assert_equal 1, error.status
    assert_includes captured.string, "boom"
    assert_includes captured.string, "💡 Fix: rebase on main"
  ensure
    $stderr = original
  end

  def test_die_without_hint_omits_suggestion
    original = $stderr
    captured = StringIO.new
    $stderr = captured
    assert_raises(SystemExit) { CliOutput.die("boom") }
    refute_includes captured.string, "💡"
  ensure
    $stderr = original
  end
end
