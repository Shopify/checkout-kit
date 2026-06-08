# frozen_string_literal: true

require 'optparse'

require_relative '../support/shared'
require_relative '../support/temp_workspace'

module PublishChecks
  module Commands
    class Clean
      def self.run(argv, react_native_root:)
        new(argv).run
      end

      def initialize(argv)
        @dry_run = false
        parse!(argv)
      end

      def run
        ConfigSummary.print(
          'Clean release validation configuration',
          values: {dry_run: @dry_run, temp_root: TempWorkspace.root}
        )

        unless TempWorkspace.clean!(dry_run: @dry_run)
          puts "Nothing to clean: #{TempWorkspace.root}"
        end
      end

      private

      def parse!(argv)
        OptionParser.new do |opts|
          opts.banner = 'Usage: validate_release clean [options]'
          opts.separator ''
          opts.separator 'Removes generated apps, install fixtures, logs, and default pack output created by validate_release.'
          opts.on('--dry-run', 'Print the temp directory without deleting it') { @dry_run = true }
          opts.on('-h', '--help', 'Show this help') do
            puts opts
            exit 0
          end
        end.parse!(argv)

        raise "Unknown arguments: #{argv.join(' ')}" unless argv.empty?
      end
    end
  end
end
