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

Checkout Kit's Swift SDK accepts `CheckoutProtocol.Client` anywhere it accepts `CheckoutCommunicationProtocol`.

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

The button-specific `onFail`, `onCancel`, and `onRenderStateChange` handlers remain on `AcceleratedCheckoutButtons`.

## Supported notifications

Public notification descriptors include:

- `CheckoutProtocol.start`
- `CheckoutProtocol.complete`
- `CheckoutProtocol.error`
- `CheckoutProtocol.lineItemsChange`
- `CheckoutProtocol.messagesChange`
- `CheckoutProtocol.totalsChange`

Use these for app behavior such as clearing local carts after completion, updating analytics, or logging checkout messages.

## Supported delegations

Public delegation descriptors include:

- `CheckoutProtocol.windowOpen`

Use this to handle `ec.window.open_request` when your app needs custom routing for checkout link requests.
