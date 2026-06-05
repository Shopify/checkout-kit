# frozen_string_literal: true

require 'English'
require 'fileutils'
require 'shellwords'
require 'tmpdir'

require_relative 'error'

module CheckoutKit
  module CLI
    # Process helpers shared across the CLIs.
    #
    # - `launch` spawns an interactive command (editor/IDE) inheriting stdio.
    # - `run` / `capture` run commands, streaming to a log file unless verbose.
    #
    # The log directory is configurable so callers (e.g. validate_release) can
    # route logs into their own workspace; it defaults to a temp location.
    module Shell
      TRUE_VALUES = %w[1 true yes on].freeze

      @verbose = TRUE_VALUES.include?(ENV.fetch('VERBOSE', '').downcase)
      @log_dir = nil

      module_function

      def verbose=(value)
        @verbose = value
      end

      def verbose?
        @verbose
      end

      def log_dir=(path)
        @log_dir = path
      end

      def log_dir
        @log_dir ||= File.join(Dir.tmpdir, 'checkout-kit-cli', 'logs')
      end

      def section(message)
        puts "\n==> #{message}"
      end

      def detail(message)
        puts message if verbose?
      end

      def command_string(command)
        command.map { |part| part.to_s.shellescape }.join(' ')
      end

      # Launches an interactive command (inherits stdio) and returns once it has
      # been spawned. GUI openers return immediately; terminal editors block,
      # which is the expected behaviour for the user who chose them.
      def launch(*command)
        puts "==> #{command_string(command)}"
        return if system(*command.map(&:to_s))

        raise Error, "Command failed: #{command_string(command)}"
      end

      def run(*command, chdir: nil, env: {}, display: nil)
        if verbose?
          puts "$ #{display || command_string(command)}"
          ok = run_command(command, chdir: chdir, env: env)
        else
          ok = run_quietly(command, chdir: chdir, env: env)
        end
        return if ok

        status = $CHILD_STATUS&.exitstatus
        suffix = status ? " (exit #{status})" : ''
        raise Error, "Command failed#{suffix}: #{display || command_string(command)}"
      end

      def capture(*command, chdir: nil, env: {})
        output = if chdir
                   IO.popen(env, command.map(&:to_s), chdir: chdir.to_s, err: %i[child out], &:read)
                 else
                   IO.popen(env, command.map(&:to_s), err: %i[child out], &:read)
                 end
        status = $CHILD_STATUS
        return output if status.success?

        raise Error, "Command failed (exit #{status.exitstatus}): #{command_string(command)}\n#{output}"
      end

      def command?(binary)
        system('command', '-v', binary.to_s, out: File::NULL, err: File::NULL)
      end

      def require_command!(binary, message = nil)
        return if command?(binary)

        raise(Error, message || "Required command not found: #{binary}")
      end

      def run_command(command, chdir:, env: {}, out: nil, err: nil)
        options = {}
        options[:chdir] = chdir.to_s if chdir
        options[:out] = out if out
        options[:err] = err if err
        system(env, *command.map(&:to_s), **options)
      end

      def run_quietly(command, chdir:, env: {})
        FileUtils.mkdir_p(log_dir)
        stdout_path = File.join(log_dir, "stdout.#{$PROCESS_ID}.#{rand(1_000_000)}.log")
        ok = nil

        File.open(stdout_path, 'w') do |stdout|
          ok = run_command(command, chdir: chdir, env: env, out: stdout, err: STDERR)
        end

        if ok
          FileUtils.rm_f(stdout_path)
        else
          warn "Command stdout was written to: #{stdout_path}"
        end

        ok
      end
    end
  end
end
