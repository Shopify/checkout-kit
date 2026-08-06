# EmbeddedCheckoutProtocol - Swift

`EmbeddedCheckoutProtocol` is the Swift client for UCP-backed checkout messages emitted by Shopify checkout. Checkout Kit uses it to decode lifecycle notifications such as checkout start, completion, totals changes, line item changes, checkout messages, and checkout errors.

See the [UCP shopping embedded protocol schema](../../services/shopping/embedded.openrpc.json) for method and payload definitions.

Most apps consume this product through the root Checkout Kit Swift package.

## Requirements

- Swift Package Manager with Swift tools 5.9+
- iOS 15.0+ or macOS 10.15+

## Install

Add the Checkout Kit repository:

```swift
dependencies: [
  .package(url: "https://github.com/Shopify/checkout-kit", exact: "4.0.0-alpha.2")
]
```

Then add `EmbeddedCheckoutProtocol` to your target:

```swift
.target(
  name: "YourTarget",
  dependencies: ["EmbeddedCheckoutProtocol"]
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

## Connect to Checkout Kit

Checkout Kit's Swift SDK accepts `EmbeddedCheckoutProtocol.Client` anywhere it accepts `CheckoutCommunicationProtocol`. The SDK also exposes the same client type as `CheckoutProtocol.Client` when you import `ShopifyCheckoutKit`.

### UIKit

```swift
import ShopifyCheckoutKit
import EmbeddedCheckoutProtocol

ShopifyCheckoutKit.present(
  checkout: checkoutURL,
  from: viewController,
  delegate: checkoutDelegate,
  client: client
)
```

### SwiftUI

```swift
ShopifyCheckout(checkout: checkoutURL)
  .connect(client)
```

### Accelerated checkout buttons

```swift
AcceleratedCheckoutButtons(cartID: cartID)
  .connect(client)
```

The button-specific `onFail`, `onDismiss`, and `onRenderStateChange` handlers remain on `AcceleratedCheckoutButtons`.

## Supported notifications

Checkout Kit-supported notification descriptors include:

- `EmbeddedCheckoutProtocol.Event.start`
- `EmbeddedCheckoutProtocol.Event.complete`
- `EmbeddedCheckoutProtocol.Event.error`
- `EmbeddedCheckoutProtocol.Event.lineItemsChange`
- `EmbeddedCheckoutProtocol.Event.messagesChange`
- `EmbeddedCheckoutProtocol.Event.totalsChange`
- `EmbeddedCheckoutProtocol.Event.fulfillmentChange`

Use these for app behavior such as clearing local carts after completion, updating analytics, or logging checkout messages.

## Supported delegations

Checkout Kit-supported delegation descriptors include:

- `EmbeddedCheckoutProtocol.Event.windowOpen`

Use this to handle `ec.window.open_request` when your app needs custom routing for checkout link requests.
