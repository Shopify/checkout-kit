# frozen_string_literal: true

require_relative 'base'

module DevOpen
  module Commands
    # Opens the Swift package or sample app workspace in Xcode via `xed`.
    class Swift < Base
      DEMO = 'platforms/swift/Samples/Samples.xcworkspace'
      LIB = 'platforms/swift'

      def run(argv)
        arg = argv.shift
        raise UsageError, usage unless argv.empty?

        case target(arg)
        when :demo then open_in_xcode(DEMO)
        when :lib then open_in_xcode(LIB)
        end
      end

      private

      def usage
        'Usage: dev swift open [lib|demo]'
      end
    end
  end
end
