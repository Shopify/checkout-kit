import EmbeddedCheckoutProtocol
import Foundation

// Uses the protocol package the way apps and hosts do. It must keep compiling after an additive
// protocol change.

let checkoutJSON = """
{
  "id": "checkout-1",
  "currency": "USD",
  "status": "incomplete",
  "line_items": [
    {
      "id": "line-1",
      "item": {"id": "gid://shopify/ProductVariant/1", "title": "T-shirt", "price": 2500},
      "quantity": 1,
      "totals": [{"type": "subtotal", "amount": 2500}]
    }
  ],
  "links": [],
  "messages": [{"type": "warning", "content": "Low stock", "severity": "recoverable"}],
  "totals": [{"type": "total", "amount": 2500}],
  "ucp": {"payment_handlers": {}, "version": "\(EmbeddedCheckoutProtocol.specVersion)"}
}
"""

func require(_ condition: Bool, _ message: String) {
    guard condition else { fatalError(message) }
}

// Inbound: decode and read.
let checkout = try JSONDecoder().decode(EmbeddedCheckoutProtocol.Checkout.self, from: Data(checkoutJSON.utf8))
let state: String
switch checkout.status {
case .completed: state = "completed"
case .canceled: state = "canceled"
default: state = "open"
}
require(state == "open", "status")
require(checkout.lineItems.first?.item.title == "T-shirt", "line items")
require(CheckoutStatus(rawValue: "completed") == .completed, "raw value")
let blocking = (checkout.messages ?? []).contains { $0.type == .error && $0.severity == .unrecoverable }
require(!blocking, "messages")

// Inbound: build fixtures the way tests and previews do.
let lineItem = LineItem(
    id: "line-1",
    item: Item(id: "gid://shopify/ProductVariant/1", price: 2500, title: "T-shirt"),
    quantity: 1,
    totals: [LineItemTotal(amount: 2500, type: "subtotal")]
) { $0.parentID = "line-0" }
let buyer = Buyer { $0.email = "buyer@example.com" }
require(lineItem.item.title == checkout.lineItems.first?.item.title && buyer.email == "buyer@example.com", "inbound fixtures")

// Outbound: build replies. Initializers take required fields plus a configuration closure.
let ucp = EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp.success()
let ready = EmbeddedCheckoutProtocol.ReadyResult(ucp: ucp) { $0.continueURL = "https://example.com/checkout" }
let destination = FulfillmentDestination(id: "dest-1") {
    $0.address = PostalAddress { $0.addressCountry = "CA" }
    $0.postalCode = "K1A 0B1"
    $0.streetAddress = "1 Main St"
}

let method = FulfillmentMethod(id: "method-1", lineItemIDS: ["line-1"], type: "shipping") {
    $0.destinations = [destination]
    $0.selectedDestinationID = "dest-1"
}

let addressChange = EmbeddedCheckoutProtocol.AddressChangeResult(ucp: ucp) {
    $0.checkout = EmbeddedCheckoutProtocol.AddressChangeCheckout {
        $0.fulfillment = EmbeddedCheckoutProtocol.CheckoutFulfillmentClass { $0.methods = [method] }
    }
}

require(addressChange.checkout?.fulfillment?.methods?.first?.id == "method-1", "address change")

/// Copy-and-mutate and the closure-based with(_:).
var edited = destination
edited.postalCode = "M5V 2T6"
let renamed = destination.with { $0.name = "Home" }
require(edited.postalCode == "M5V 2T6" && destination.postalCode == "K1A 0B1" && renamed.name == "Home", "copies")

// Initializers and with(_:) used as function values: their function types must not change when
// the protocol adds an optional field.
let makeAddress: ((inout PostalAddress) -> Void) -> PostalAddress = PostalAddress.init
let makeDestination: (String, (inout FulfillmentDestination) -> Void) -> FulfillmentDestination = FulfillmentDestination.init
let updateDestination: ((inout FulfillmentDestination) -> Void) -> FulfillmentDestination = destination.with
let makeLineItem: (String, Item, Int, [LineItemTotal], (inout LineItem) -> Void) -> LineItem = LineItem.init
let updateCheckout: ((inout EmbeddedCheckoutProtocol.Checkout) -> Void) -> EmbeddedCheckoutProtocol.Checkout = checkout.with
require(makeLineItem("line-2", lineItem.item, 2, []) { _ in }.quantity == 2, "line item reference")
require(updateCheckout { $0.currency = "CAD" }.currency == "CAD", "checkout with reference")
let makeOptions: ((inout EmbeddedCheckoutProtocol.Options) -> Void) -> EmbeddedCheckoutProtocol.Options = EmbeddedCheckoutProtocol.Options.init
require(makeAddress { $0.addressCountry = "US" }.addressCountry == "US", "address reference")
require(makeDestination("dest-2") { _ in }.id == "dest-2", "destination reference")
require(updateDestination { $0.name = "Work" }.name == "Work", "with reference")
require(makeOptions { $0.colorScheme = "dark" }.colorScheme == "dark", "options reference")

/// Handshake and runtime.
let options = EmbeddedCheckoutProtocol.Options {
    $0.delegations = [.windowOpen]
    $0.colorScheme = "dark"
}

let url = EmbeddedCheckoutProtocol.url(for: URL(string: "https://example.com/checkout")!, options: options)
require(url.absoluteString.contains("ec_color_scheme=dark"), "url")
let client = EmbeddedCheckoutProtocol.Client().on(EmbeddedCheckoutProtocol.Event.ready) { _ in ready }
let response = await client.process(#"{"jsonrpc":"2.0","id":1,"method":"ec.ready","params":{"delegate":[]}}"#)
require(response?.contains("\"success\"") == true, "ready")

print("Swift consumer OK")
