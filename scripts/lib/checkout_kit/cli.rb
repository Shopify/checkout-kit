# frozen_string_literal: true

# Shared support modules for Checkout Kit's Ruby CLIs (scripts/dev-open,
# platforms/react-native/scripts/validate_release, ...).
#
# Add scripts/lib to the load path from an entrypoint, then `require
# 'checkout_kit/cli'` to pull in everything below.

require_relative 'cli/error'
require_relative 'cli/env'
require_relative 'cli/dotenv'
require_relative 'cli/redaction'
require_relative 'cli/shell'
require_relative 'cli/json_file'
require_relative 'cli/config_summary'

module CheckoutKit
  module CLI
  end
end
