# frozen_string_literal: true

# Re-exports the shared Checkout Kit CLI helpers under the PublishChecks
# namespace, so existing unqualified references (Shell, Env, Dotenv, ...)
# resolve to the shared implementations in scripts/lib/checkout_kit/cli.

lib = File.expand_path('../../../../../scripts/lib', __dir__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)

require 'checkout_kit/cli'

module PublishChecks
  Shell = CheckoutKit::CLI::Shell
  Dotenv = CheckoutKit::CLI::Dotenv
  Env = CheckoutKit::CLI::Env
  Redaction = CheckoutKit::CLI::Redaction
  ConfigSummary = CheckoutKit::CLI::ConfigSummary
  JsonFile = CheckoutKit::CLI::JsonFile
end
