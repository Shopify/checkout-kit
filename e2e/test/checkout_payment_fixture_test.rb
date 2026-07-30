# frozen_string_literal: true

require "minitest/autorun"
require "yaml"

class CheckoutPaymentFixtureTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)
  CHECKOUT_PATH = File.join(E2E_ROOT, "tests", "shared", "checkout-hardcoded-buyer-identity.yaml")
  PAYMENT_FLOW_PATH = File.join(E2E_ROOT, "flows", "checkout", "fill-payment-card.yaml")

  def yaml_documents(path)
    File.read(path).split(/^---\s*$/).map { |document| YAML.safe_load(document) }
  end

  def test_successful_checkout_uses_the_bogus_gateway_approval_number
    checkout = yaml_documents(CHECKOUT_PATH).first

    assert_equal "1", checkout.fetch("env").fetch("CARD_NUMBER")
    assert_equal "1", checkout.fetch("env").fetch("CARD_NUMBER_DISPLAY")
  end

  def test_payment_flow_replaces_the_prefilled_cardholder_name
    commands = yaml_documents(PAYMENT_FLOW_PATH).last
    name_field_index = commands.index { |command| command.is_a?(Hash) && command.dig("tapOn", "text") == "^Name on card$" }
    erase_index = commands.index("eraseText")
    cardholder_name_index = commands.index { |command| command == {"inputText" => "${CARD_HOLDER_NAME}"} }

    assert_equal name_field_index + 2, erase_index
    assert_equal erase_index + 1, cardholder_name_index
  end
end
