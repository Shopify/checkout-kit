# frozen_string_literal: true

require_relative 'redaction'
require_relative 'shell'

module CheckoutKit
  module CLI
    module ConfigSummary
      SENSITIVE_KEY_PATTERN = /(ACCESS_TOKEN|TOKEN|SECRET|PASSWORD|CHECKOUT_URL|MERCHANT_IDENTIFIER|SHOP_ID|ACCOUNT_ID|CLIENT_ID|AUTH|KEY)/i

      module_function

      def print(title, values:)
        return unless Shell.verbose?

        Shell.section(title)
        puts 'Resolved values:'
        values.each do |key, value|
          puts "  #{key}: #{format_value(key, value)}"
        end
      end

      def format_value(key, value)
        return 'missing' if value.nil? || value == ''

        return value.map { |item| format_value(key, item) }.join(', ') if value.is_a?(Array)
        return value.to_h { |nested_key, nested_value| [nested_key, format_value(nested_key, nested_value)] }.inspect if value.is_a?(Hash)

        string_value = value.to_s
        return string_value unless sensitive_key?(key)

        Redaction.configured_summary(string_value, label: key.to_s)
      end

      def sensitive_key?(key)
        key.to_s.match?(SENSITIVE_KEY_PATTERN)
      end
    end
  end
end
