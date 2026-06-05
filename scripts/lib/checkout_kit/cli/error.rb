# frozen_string_literal: true

module CheckoutKit
  module CLI
    # Base error for CLI failures. CLIs can rescue this to print a friendly
    # message and exit non-zero.
    Error = Class.new(StandardError)
  end
end
