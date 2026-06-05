# frozen_string_literal: true

require 'digest'

module CheckoutKit
  module CLI
    module Redaction
      module_function

      def configured_summary(value, label: 'value')
        return 'missing' if value.nil? || value.empty?

        "configured (#{label} redacted, sha256:#{Digest::SHA256.hexdigest(value)[0, 8]})"
      end

      def presence(value)
        value.nil? || value.empty? ? 'missing' : 'configured'
      end
    end
  end
end
