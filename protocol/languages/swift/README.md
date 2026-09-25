# EmbeddedCheckoutProtocol - Swift

`EmbeddedCheckoutProtocol` is the Swift client for UCP-backed checkout messages emitted by Shopify checkout. Checkout Kit uses it to decode lifecycle notifications such as checkout start, completion, totals changes, line item changes, checkout messages, and checkout errors.

See the [UCP shopping embedded protocol schema](../../services/shopping/embedded.openrpc.json) for method and payload definitions.

Most apps consume this product through the root Checkout Kit Swift package.

All event payloads, request results, their protocol-only helper models, and
checkout/error parameter wrappers live under `EmbeddedCheckoutProtocol`, for
example `EmbeddedCheckoutProtocol.Checkout`, `EmbeddedCheckoutProtocol.ReadyRequest`,
`EmbeddedCheckoutProtocol.ReadyResult`, and `EmbeddedCheckoutProtocol.JSONRPCErrorParams`.
Explicit references to these types must use the namespace; no top-level aliases
are provided. SwiftPM and CocoaPods use the same names.

Shared checkout and order domain types remain top-level. This preserves direct
use of `Buyer`, `LineItem`, and `CheckoutTotal` in Kit's public snapshot.
Kit's public `Checkout` snapshot is separate from the namespaced wire checkout.

## Requirements

- Swift tools 6.0+ when consuming the repository-root Checkout Kit package shown below.
- iOS 15.0+ for Checkout Kit.
- The standalone package in this directory declares Swift tools 5.9+ and supports iOS 15.0+ or macOS 10.15+ for protocol-only development.

## Install

Add the Checkout Kit repository:

```swift
dependencies: [
  .package(url: "https://github.com/Shopify/checkout-kit", exact: "4.0.0-alpha.7")
]
```

Then add `EmbeddedCheckoutProtocol` to your target:

```swift
.target(
  name: "YourTarget",
  dependencies: [
    .product(name: "EmbeddedCheckoutProtocol", package: "checkout-kit")
  ]
)
```

For local protocol development, this directory also contains a standalone `Package.swift`.

## Usage

```swift
import EmbeddedCheckoutProtocol

let client = EmbeddedCheckoutProtocol.Client()
  .on(EmbeddedCheckoutProtocol.Event.start) { message in
    let checkout = message.params.checkout
    print("Checkout started: \(checkout.id)")
  }
  .on(EmbeddedCheckoutProtocol.Event.complete) { message in
    let checkout = message.params.checkout
    print("Checkout completed: \(checkout.order?.id ?? "unknown")")
  }
  .on(EmbeddedCheckoutProtocol.Event.totalsChange) { message in
    let checkout = message.params.checkout
    print("Totals changed: \(checkout.totals)")
  }
```

The client handles serialized JSON-RPC messages; your transport supplies incoming messages and sends any response:

```swift
if let response = await client.process(incomingMessage) {
  // Send response back to checkout through your transport.
}
```

Handlers run on the main actor. The protocol package does not supply a WebView transport.

## Connect to Checkout Kit

Apps using Checkout Kit register lifecycle callbacks directly. The SDK manages the protocol client internally;
`client:` presentation arguments and `.connect(client)` are no longer public Checkout Kit APIs.

### UIKit

```swift
import ShopifyCheckoutKit
import UIKit

final class CheckoutHandler: CheckoutDelegate {
  func checkoutDidStart(_ event: CheckoutStartEvent) {
    // Read the initial checkout snapshot from event.checkout.
  }

  func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
    // Record completion; keep the confirmation page visible until dismissal.
  }

  func checkoutDidFail(_ event: CheckoutFailureEvent) {
    // Choose recovery using event.error.code.
  }

  func checkoutDidDismiss() {
    // Clear or refresh your app's checkout UI.
  }
}

// Retain the handler for the lifetime of the presentation.
let checkoutDelegate = CheckoutHandler()
ShopifyCheckoutKit.present(
  checkout: checkoutURL,
  from: viewController,
  delegate: checkoutDelegate
)
```

### SwiftUI

```swift
ShopifyCheckout(checkout: checkoutURL)
  .onStart { event in
    // Read event.checkout.
  }
  .onUpdate { event in
    // Read updated totals, line items, fulfillment, or messages.
  }
  .onComplete { event in
    // Record completion from event.checkout.
  }
  .onFail { event in
    // Choose recovery using event.error.code.
  }
  .onDismiss {
    // Clear or refresh your app's checkout UI.
  }
```

### Accelerated checkout buttons

```swift
AcceleratedCheckoutButtons(cartID: cartID)
  .onComplete { event in
    // Record completion from event.checkout.
  }
  .onFail { error in
    // Accelerated buttons receive CheckoutError directly.
  }
```

Accelerated checkout buttons also expose `onStart`, `onUpdate`, `onLinkClick`, `onDismiss`, and
`onRenderStateChange`. See the [Swift platform README](../../../platforms/swift/README.md) for full integration examples.

## Protocol notifications

The raw protocol catalog includes:

- `EmbeddedCheckoutProtocol.Event.start`
- `EmbeddedCheckoutProtocol.Event.complete`
- `EmbeddedCheckoutProtocol.Event.error`
- `EmbeddedCheckoutProtocol.Event.lineItemsChange`
- `EmbeddedCheckoutProtocol.Event.messagesChange`
- `EmbeddedCheckoutProtocol.Event.buyerChange`
- `EmbeddedCheckoutProtocol.Event.totalsChange`
- `EmbeddedCheckoutProtocol.Event.paymentChange`
- `EmbeddedCheckoutProtocol.Event.fulfillmentChange`

Checkout Kit translates a supported subset into its own lifecycle events. Buyer and payment change notifications
are available to low-level protocol clients but are not exposed as Checkout Kit callbacks.

## Protocol delegations

Raw request descriptors include:

- `EmbeddedCheckoutProtocol.Event.ready`
- `EmbeddedCheckoutProtocol.Event.auth`
- `EmbeddedCheckoutProtocol.Event.paymentInstrumentsChange`
- `EmbeddedCheckoutProtocol.Event.paymentCredential`
- `EmbeddedCheckoutProtocol.Event.windowOpen`
- `EmbeddedCheckoutProtocol.Event.fulfillmentAddressChange`

Register request handlers only when your transport supports the corresponding behavior. In Checkout Kit, customize
link handling through `CheckoutDelegate.checkoutAction(for:)` or `.onLinkClick`, returning `.open`, `.handled`, or `.cancel`.
