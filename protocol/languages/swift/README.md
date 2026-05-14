# ShopifyCheckoutProtocol — Swift SDK

Swift library for the Universal Commerce Protocol (UCP) embedded checkout specification.

## Requirements

- Swift 6.0+

## Installation

### Swift Package Manager (Package.swift)

Add the dependency to your `Package.swift`:

```swift
dependencies: [
    .package(url: "<REPO_URL>", from: "1.0.0")
]
```

Then add `ShopifyCheckoutProtocol` to your target's dependencies:

```swift
.target(
    name: "YourTarget",
    dependencies: ["ShopifyCheckoutProtocol"]
)
```

### Xcode

1. Open your project in Xcode
2. Go to **File > Add Package Dependencies...**
3. Enter the repository URL: `<REPO_URL>`
4. Click **Add Package**

## Usage

```swift
import ShopifyCheckoutProtocol
```

### Bridging with checkout-sheet-kit-swift

If you use [`checkout-sheet-kit-swift`](https://github.com/Shopify/checkout-sheet-kit-swift), add a retroactive conformance to bridge `CheckoutProtocol.Client` with the kit's `CheckoutCommunicationProtocol`:

```swift
extension CheckoutProtocol.Client: @retroactive CheckoutCommunicationProtocol {}
```

### Creating a Client

`CheckoutProtocol.Client` uses a fluent API to register event handlers:

```swift
private let client = CheckoutProtocol.Client()
    .on(CheckoutProtocol.start) { checkout in
        print("Checkout started: \(checkout.id)")
    }
    .on(CheckoutProtocol.complete) { checkout in
        print("Checkout completed: \(checkout.order?.id ?? "unknown")")
    }
```

### Connecting to Accelerated Checkout Buttons

Pass the client to `AcceleratedCheckoutButtons` using the `.connect()` modifier. Note that some event handlers like `.onFail` and `.onCancel` remain on the button view itself:

```swift
AcceleratedCheckoutButtons(cartID: cartID)
    .onFail { error in
        print("SDK error: \(error)")
    }
    .onCancel {
        print("Sheet cancelled")
    }
    .connect(client)
```

### Presenting with ShopifyCheckoutSheetKit

Pass the client when presenting a checkout sheet:

```swift
ShopifyCheckoutSheetKit.present(checkout: checkoutURL, delegate: client)
```
