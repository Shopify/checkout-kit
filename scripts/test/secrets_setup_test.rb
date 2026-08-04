# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "json"
require "open3"
require "pty"
require "shellwords"
require "tmpdir"

# Exercises scripts/secrets_setup against a throwaway keypair, so the test never
# needs the repository's own private key. The interactive cases run under a real
# pty, because the script talks to /dev/tty rather than to stdout.
#
# Two modes are covered separately. --check is the dev up step, which reports and
# waits for Return. No flag is `dev secrets setup`, which asks for the key.
class SecretsSetupTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  SCRIPT = File.join(REPO_ROOT, "scripts", "secrets_setup")
  INTERRUPT = 3.chr

  def setup
    skip "ejson is not installed" unless system("command -v ejson >/dev/null 2>&1")

    @dir = Dir.mktmpdir
    @keydir = File.join(@dir, "keys")
    Dir.mkdir(@keydir)
    @public_key = generate_keypair
    @private_key = File.read(key_path).strip
    @path = File.join(@dir, "demo.ejson")
    write_encrypted("STOREFRONT_DOMAIN" => "shop.example.com")
    File.delete(key_path)
  end

  def teardown
    FileUtils.chmod(0o700, @keydir) if @keydir && File.directory?(@keydir)
    FileUtils.remove_entry(@dir) if @dir && File.exist?(@dir)
  end

  def test_an_installed_key_prints_nothing
    install_private_key
    out, status = run_check

    assert_equal 0, status
    assert_empty out.strip
  end

  def test_a_missing_key_without_a_terminal_names_the_setup_command
    out, status = run_check

    assert_equal 0, status
    assert_includes out, "dev secrets setup"
  end

  def test_a_missing_key_without_a_terminal_reports_no_error
    out, = run_check

    refute_includes out, "/dev/tty"
    refute_includes out, "line "
  end

  def test_a_missing_key_without_a_terminal_installs_nothing
    run_check

    assert_empty Dir.children(@keydir)
  end

  def test_the_step_says_what_the_key_is_for
    out = check_on_terminal("\n")

    assert_match(/e2e/i, out)
    assert_match(/sample/i, out)
    assert_includes out, "one time"
  end

  def test_the_step_names_the_way_out_of_dev_up
    out = check_on_terminal("\n")

    assert_includes out, "Ctrl-C"
    assert_includes out, "dev secrets setup"
    assert_includes out, "dev up"
  end

  def test_the_step_asks_one_question_and_names_its_answer
    out = check_on_terminal("\n")
    questions = out.delete("\r").lines.select { |line| question?(line) }

    assert_equal 1, questions.length
    assert_includes questions.first, "Return"
  end

  # A dev spinner tick repaints the line directly above the cursor, and the
  # terminal echoes the answer onto the cursor line itself, so a question is only
  # safe two lines up. Keep the blank line below every question.
  def test_a_blank_line_stands_between_each_question_and_the_cursor
    out = check_on_terminal("\n").delete("\r")
    questions = out.lines.each_index.select { |index| question?(out.lines[index]) }

    refute_empty questions
    questions.each { |index| assert_equal "\n", out.lines[index + 1] }
  end

  # The tick that closes the step lands on the line above the cursor too, so the
  # step prints nothing after the answer. There is no last message to clip.
  def test_the_step_prints_nothing_after_the_answer
    assert check_on_terminal("\n").delete("\r").end_with?("\n\n")
  end

  # The step protects no secret, so echoing stays on. Without it the cursor and
  # the typing are both invisible, and nobody can tell the answer registered.
  def test_the_step_shows_what_is_typed
    out = check_on_terminal("k\n")

    assert_includes out, "k"
  end

  def test_the_step_never_asks_for_the_key
    out = check_on_terminal("\n")

    refute_includes out, "Paste"
    refute_includes out, "1Password"
  end

  def test_the_step_installs_nothing_even_when_a_key_is_typed
    check_on_terminal("#{@private_key}\n")

    assert_empty Dir.children(@keydir)
  end

  def test_the_step_continues_after_the_answer
    _out, status = check_on_terminal_with_status("\n")

    assert_equal 0, status
  end

  # Ctrl-C reaches dev as well, so dev up aborts and prints its own Interrupt
  # line. Anything printed here would contradict it.
  # The terminal itself echoes ^C, so the check is that the script adds nothing of
  # its own after the question.
  def test_control_c_in_the_step_says_nothing_and_succeeds
    out, status = check_on_terminal_with_status(INTERRUPT)

    after_question = out.delete("\r").split("continue without them:\n").last.to_s

    assert_equal 0, status
    assert_equal "", after_question.gsub("^C", "").strip
    assert_empty Dir.children(@keydir)
  end

  def test_setup_says_when_the_key_is_already_installed
    install_private_key
    out, status = run_setup

    assert_equal 0, status
    assert_includes out, "already installed"
  end

  def test_setup_says_where_to_find_the_key
    out = setup_on_terminal("#{@private_key}\n")

    assert_includes out, "1Password"
    assert_includes out, "Repository secrets EJSON"
  end

  # Echo is off while the key is read, so the terminal never echoes the Return that
  # ends the answer, and the cursor stays on the question line. Setup writes that
  # line break itself, or the next message continues the question.
  def test_an_installed_key_is_reported_below_the_question
    assert_answer_stands_between_the_question_and_the_message("#{@private_key}\n")
  end

  def test_a_refused_key_is_reported_below_the_question
    assert_answer_stands_between_the_question_and_the_message("not-a-key\nnot-a-key\n")
  end

  def test_setup_installs_a_pasted_key
    setup_on_terminal("#{@private_key}\n")

    assert_path_exists key_path
  end

  def test_setup_reports_the_next_command
    out = setup_on_terminal("#{@private_key}\n")

    assert_includes out, "dev up"
  end

  def test_an_installed_key_is_not_readable_by_everyone
    setup_on_terminal("#{@private_key}\n")

    assert_equal "0440", format("%04o", File.stat(key_path).mode & 0o7777)
  end

  def test_an_installed_key_decrypts_the_file
    setup_on_terminal("#{@private_key}\n")

    assert_equal "shop.example.com", decrypt.fetch("STOREFRONT_DOMAIN")
  end

  def test_a_key_is_installed_only_where_it_decrypts
    other_public_key = another_public_key
    other = write_second_file(other_public_key)
    setup_on_terminal("#{@private_key}\n", files: [@path, other])

    assert_path_exists key_path
    refute_path_exists key_path(other_public_key)
  end

  def test_the_private_key_is_never_printed
    out = setup_on_terminal("#{@private_key}\n")

    refute_includes out, @private_key
  end

  def test_setup_succeeds_after_installing_the_key
    _out, status = setup_on_terminal_with_status("#{@private_key}\n")

    assert_equal 0, status
  end

  def test_a_key_that_is_not_hexadecimal_is_refused
    setup_on_terminal("not-a-key\nnot-a-key\n")

    assert_empty Dir.children(@keydir)
  end

  def test_a_key_of_the_right_shape_that_cannot_decrypt_is_refused
    setup_on_terminal("#{"0" * 64}\n#{"0" * 64}\n")

    assert_empty Dir.children(@keydir)
  end

  def test_a_refused_key_falls_back_to_the_install_command
    out, status = setup_on_terminal_with_status("#{"0" * 64}\n#{"0" * 64}\n")

    assert_equal 1, status
    assert_includes out, "dev ejson persist-keypair"
  end

  def test_control_c_in_setup_says_nothing_and_installs_nothing
    _out, status = setup_on_terminal_with_status(INTERRUPT)

    assert_equal 0, status
    assert_empty Dir.children(@keydir)
  end

  def test_setup_without_a_terminal_names_the_install_command
    out, status = run_setup

    assert_equal 1, status
    assert_includes out, "dev ejson persist-keypair"
  end

  def test_setup_with_an_unwritable_keydir_names_the_install_command
    FileUtils.chmod(0o500, @keydir)
    out, status = setup_on_terminal_with_status("")

    assert_equal 1, status
    assert_includes out, "dev ejson persist-keypair"
  end

  def test_setup_with_a_missing_keydir_names_the_install_command
    out, status = setup_on_terminal_with_status("", keydir: File.join(@dir, "absent"))

    assert_equal 1, status
    assert_includes out, "dev ejson persist-keypair"
  end

  private

  # One blank line keeps the spinner off the question, and one stands in for the
  # Return the terminal did not echo.
  def assert_answer_stands_between_the_question_and_the_message(answer)
    lines = setup_on_terminal(answer).delete("\r").lines
    question = lines.index { |line| line.include?("stays hidden:") }
    message = (question + 1...lines.length).find { |index| !lines[index].strip.empty? }

    assert_equal ["\n", "\n"], lines[question + 1...message]
  end

  def question?(line)
    line.rstrip.end_with?(":")
  end

  # A question, then the blank line that keeps the spinner off it, then the read.
  def waiting_for_input?(output)
    text = output.delete("\r")
    text.end_with?("\n\n") && question?(text.lines[-2].to_s)
  end

  def key_path(public_key = @public_key)
    File.join(@keydir, public_key)
  end

  def env(keydir: @keydir)
    {"EJSON_KEYDIR" => keydir, "NO_COLOR" => "1"}
  end

  def run_check(keydir: @keydir)
    capture(["--check", @path], keydir: keydir)
  end

  def run_setup(keydir: @keydir)
    capture([@path], keydir: keydir)
  end

  def capture(arguments, keydir: @keydir)
    out, status = Open3.capture2e(env(keydir: keydir), SCRIPT, *arguments, chdir: REPO_ROOT)
    [out, status.exitstatus]
  end

  def check_on_terminal(input, files: [@path])
    check_on_terminal_with_status(input, files: files).first
  end

  def check_on_terminal_with_status(input, files: [@path], keydir: @keydir)
    on_terminal(["--check", *files], input, keydir: keydir)
  end

  def setup_on_terminal(input, files: [@path])
    setup_on_terminal_with_status(input, files: files).first
  end

  def setup_on_terminal_with_status(input, files: [@path], keydir: @keydir)
    on_terminal(files, input, keydir: keydir)
  end

  # Types one line at a time, and only once a question is waiting, which is what
  # a person at a keyboard does.
  def on_terminal(arguments, input, keydir: @keydir)
    output = +""
    status = nil

    PTY.spawn(env(keydir: keydir), SCRIPT, *arguments, chdir: REPO_ROOT) do |reader, writer, pid|
      lines(input).each do |line|
        wait_for_prompt(reader, output, after: output.length)
        writer.write(line)
      end
      read_until_closed(reader, output)
      status = wait_for_exit(pid)
    end

    [output, status]
  end

  # Every write ends with a newline, including a bare Ctrl-C. The line discipline
  # needs the terminator before it hands anything to the script.
  def lines(input)
    return [] if input.empty?

    parts = input.split("\n", -1)
    parts.pop if parts.last.empty?
    parts.map { |line| "#{line}\n" }
  end

  def wait_for_prompt(reader, output, after: 0, timeout: 10)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout

    until output.length > after && waiting_for_input?(output)
      remaining = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
      raise "no prompt within #{timeout}s. Saw:\n#{output}" if remaining <= 0
      break unless IO.select([reader], nil, nil, remaining)

      output << reader.readpartial(4096)
    end
  rescue Errno::EIO, EOFError
    nil
  end

  # Reads to end of output, which the pty reports as EIO once the script exits.
  # Draining before reaping keeps the exit quick. The deadline is a backstop, so a
  # script that waits for input the test never sends fails instead of hanging.
  def read_until_closed(reader, output, timeout: 10)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout

    loop do
      remaining = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
      break if remaining <= 0
      break unless IO.select([reader], nil, nil, remaining)

      output << reader.readpartial(4096)
    end
  rescue Errno::EIO, EOFError
    nil
  end

  def wait_for_exit(pid, timeout: 5)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout

    while Process.clock_gettime(Process::CLOCK_MONOTONIC) < deadline
      reaped, status = Process.waitpid2(pid, Process::WNOHANG)
      return status.exitstatus if reaped

      sleep 0.05
    end

    ["TERM", "KILL"].each do |signal|
      Process.kill(signal, pid)
      3.times do
        reaped, status = Process.waitpid2(pid, Process::WNOHANG)
        return status.exitstatus if reaped

        sleep 0.1
      end
    end

    nil
  rescue Errno::ECHILD, Errno::ESRCH
    nil
  end

  def install_private_key
    File.write(key_path, @private_key)
    File.chmod(0o440, key_path)
  end

  def generate_keypair
    out, status = Open3.capture2e({"EJSON_KEYDIR" => @keydir}, "ejson", "keygen", "--write")
    raise "keygen failed: #{out}" unless status.success?

    out.strip.split.last
  end

  # A public key whose private half never reaches any keydir the script can read.
  def another_public_key
    out, status = Open3.capture2e("ejson", "keygen")
    raise "keygen failed: #{out}" unless status.success?

    out.lines.fetch(1).strip
  end

  def write_second_file(public_key)
    path = File.join(@dir, "e2e.ejson")
    File.write(path, JSON.pretty_generate("_public_key" => public_key, "environment" => {"SHOP" => "other.example.com"}))
    out, status = Open3.capture2e("ejson", "encrypt", path)
    raise "encrypt failed: #{out}" unless status.success?

    path
  end

  def write_encrypted(environment)
    File.write(@path, JSON.pretty_generate("_public_key" => @public_key, "environment" => environment))
    out, status = Open3.capture2e("ejson", "encrypt", @path)
    raise "encrypt failed: #{out}" unless status.success?
  end

  def decrypt
    out, status = Open3.capture2e({"EJSON_KEYDIR" => @keydir}, "ejson", "decrypt", @path)
    raise "decrypt failed: #{out}" unless status.success?

    JSON.parse(out).fetch("environment")
  end
end
