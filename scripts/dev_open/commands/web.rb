# frozen_string_literal: true

require_relative 'base'

module DevOpen
  module Commands
    # Opens the Web package or sample app in the configured editor.
    class Web < Base
      DEMO = 'platforms/web/sample'
      LIB = 'platforms/web'

      def run(argv)
        arg = argv.shift
        raise UsageError, usage unless argv.empty?

        case target(arg)
        when :demo then open_in_editor(DEMO)
        when :lib then open_in_editor(LIB)
        end
      end

      private

      def usage
        'Usage: dev web open [lib|demo]'
      end
    end
  end
end
