# frozen_string_literal: true

require 'checkout_kit/cli'

require_relative '../support/error'
require_relative '../support/editor'

module DevOpen
  module Commands
    # Shared behaviour for `dev <platform> open` commands: target aliasing,
    # path resolution against the repo root, and the open mechanisms.
    class Base
      DEMO_ALIASES = %w[demo sample samples].freeze
      LIB_ALIASES = %w[lib library package module].freeze

      def self.run(argv, repo_root:)
        new(repo_root).run(argv)
      end

      def initialize(repo_root)
        @repo_root = repo_root
      end

      private

      attr_reader :repo_root

      # Maps a positional argument to :demo (default) or :lib.
      def target(arg)
        return :demo if arg.nil? || DEMO_ALIASES.include?(arg)
        return :lib if LIB_ALIASES.include?(arg)

        raise UsageError, usage
      end

      # Resolves a path relative to the repo root, ensuring it exists.
      def path(relative)
        absolute = File.join(repo_root, relative)
        raise CheckoutKit::CLI::Error, "Path not found: #{relative}" unless File.exist?(absolute)

        absolute
      end

      def open_in_editor(relative)
        CheckoutKit::CLI::Shell.launch(*Editor.command(repo_root), path(relative))
      end

      def open_in_xcode(relative)
        CheckoutKit::CLI::Shell.launch('xed', path(relative))
      end

      def open_in_android_studio(relative)
        CheckoutKit::CLI::Shell.launch('open', '-a', 'Android Studio', path(relative))
      end
    end
  end
end
