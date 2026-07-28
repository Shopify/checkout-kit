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
  .package(url: "https://github.com/Shopify/checkout-kit", exact: "4.0.0-alpha.1")
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

let client = CheckoutProtocol.Client()
  .on(CheckoutProtocol.start) { checkout in
    print("Checkout started: \(checkout.id)")
  }
  .on(CheckoutProtocol.complete) { checkout in
    print("Checkout completed: \(checkout.order?.id ?? "unknown")")
  }
  .on(CheckoutProtocol.totalsChange) { checkout in
    print("Totals changed: \(checkout.totals)")
  }
```

## Connect to Checkout Kit

Most SwiftUI apps should use Checkout Kit's `.onStart`, `.onComplete`,
`.onTotalsChange`, and related callback modifiers. Connect a `CheckoutProtocol.Client`
when you need advanced protocol request handling or lower-level access.

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

The callback modifiers and connected client compose, so both receive notifications.
For `ec.ready`, a response from the connected client wins; when it has no ready handler,
Checkout Kit supplies its standard successful handshake.

### Accelerated checkout buttons

```swift
AcceleratedCheckoutButtons(cartID: cartID)
  .connect(client)
```

The same lifecycle callback modifiers are available on `AcceleratedCheckoutButtons`,
alongside its button-specific `onFail`, `onDismiss`, and `onRenderStateChange` handlers.

## Supported notifications

Public notification descriptors include:

- `CheckoutProtocol.start`
- `CheckoutProtocol.complete`
- `CheckoutProtocol.error`
- `CheckoutProtocol.fulfillmentChange`
- `CheckoutProtocol.lineItemsChange`
- `CheckoutProtocol.messagesChange`
- `CheckoutProtocol.totalsChange`

Use these for app behavior such as clearing local carts after completion, updating analytics, or logging checkout messages.

## Supported delegations

Public delegation descriptors include:

- `CheckoutProtocol.windowOpen`

Use this to handle `ec.window.open_request` when your app needs custom routing for checkout link requests.

## Advanced requests

- `CheckoutProtocol.ready`

Register a ready handler only when the host needs to supply a custom handshake result.
Checkout Kit responds automatically when the connected client leaves it unhandled.
