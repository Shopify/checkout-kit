# frozen_string_literal: true

require 'checkout_kit/cli'

module DevOpen
  # Raised when arguments are invalid; the message is the command usage line.
  # Inherits the shared CLI error so the entrypoint can rescue a single type.
  UsageError = Class.new(CheckoutKit::CLI::Error)
end
