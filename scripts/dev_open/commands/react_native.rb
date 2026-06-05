# frozen_string_literal: true

require_relative 'base'

module DevOpen
  module Commands
    # Opens the React Native workspace root in the configured editor, or the
    # sample app's native project in Xcode / Android Studio.
    class ReactNative < Base
      WORKSPACE = 'platforms/react-native'
      SAMPLE = 'platforms/react-native/sample'
      SAMPLE_IOS = "#{SAMPLE}/ios/CheckoutKitReactNativeDemo.xcworkspace".freeze
      SAMPLE_ANDROID = "#{SAMPLE}/android".freeze

      def run(argv)
        raise UsageError, usage if argv.size > 1

        case argv.first
        when nil then open_in_editor(WORKSPACE)
        when '--ios' then open_in_xcode(SAMPLE_IOS)
        when '--android' then open_in_android_studio(SAMPLE_ANDROID)
        else raise UsageError, usage
        end
      end

      private

      def usage
        'Usage: dev rn open [--ios|--android]'
      end
    end
  end
end
