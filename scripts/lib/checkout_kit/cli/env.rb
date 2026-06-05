# frozen_string_literal: true

require_relative 'error'

module CheckoutKit
  module CLI
    module Env
      TRUE_VALUES = %w[1 true yes on].freeze
      FALSE_VALUES = %w[0 false no off].freeze

      module_function

      def bool(name, default)
        value = ENV[name]
        return default if value.nil? || value.empty?

        normalized = value.downcase
        return true if TRUE_VALUES.include?(normalized)
        return false if FALSE_VALUES.include?(normalized)

        raise Error, "#{name} must be one of #{(TRUE_VALUES + FALSE_VALUES).join(', ')}"
      end
    end
  end
end
