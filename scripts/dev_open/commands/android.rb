# frozen_string_literal: true

require_relative 'base'

module DevOpen
  module Commands
    # Opens the Android library or sample app in Android Studio.
    class Android < Base
      DEMO = 'platforms/android/samples/CheckoutKitAndroidDemo'
      LIB = 'platforms/android'

      def run(argv)
        arg = argv.shift
        raise UsageError, usage unless argv.empty?

        case target(arg)
        when :demo then open_in_android_studio(DEMO)
        when :lib then open_in_android_studio(LIB)
        end
      end

      private

      def usage
        'Usage: dev android open [lib|demo]'
      end
    end
  end
end
