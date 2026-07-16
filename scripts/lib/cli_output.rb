# frozen_string_literal: true

# Shared output helpers so every CLI script surfaces fatal errors the same way:
# a bold red problem statement on stderr, an optional bold blue "💡" suggestion
# line, then a non-zero exit. Honours the NO_COLOR convention so redirected or
# downloaded logs stay free of escape codes.
module CliOutput
  module_function

  def die(message, hint: nil)
    $stderr.puts red(message)
    $stderr.puts suggestion(hint) unless hint.nil? || hint.to_s.empty?
    exit 1
  end

  def suggestion(text)
    blue("💡 Fix: #{text}")
  end

  def red(text)
    colorize(text, "1;31")
  end

  def blue(text)
    colorize(text, "1;34")
  end

  def colorize(text, code)
    return text.to_s if ENV["NO_COLOR"]

    "\e[#{code}m#{text}\e[0m"
  end
end
