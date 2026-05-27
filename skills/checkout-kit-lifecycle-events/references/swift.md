# Swift

Use native `CheckoutDelegate` or SwiftUI callbacks for native/ambient presentation outcomes. Use `CheckoutProtocol.Client` for bidirectional communication with the checkout web instance.

Register only protocol handlers the app needs.

```swift
import ShopifyCheckoutKit
import ShopifyCheckoutProtocol
import UIKit

final class AppCheckoutDelegate: CheckoutDelegate {
    func checkoutDidCancel() {
        // Native presentation outcome: buyer dismissed the sheet.
    }

    func checkoutDidFail(error: CheckoutError) {
        // Native/ambient failure: SDK, network, or presentation failure.
    }
}

let client = CheckoutProtocol.Client()
    .on(CheckoutProtocol.complete) { checkout in
        // Checkout completed in the web instance.
        // Clear or refresh app cart state if needed.
    }
    .on(CheckoutProtocol.error) { error in
        // Checkout-originated protocol error.
        // Log/report or show app-owned fallback UI if needed.
    }
    .on(CheckoutProtocol.windowOpen) { request in
        // Registering this handler overrides Checkout Kit's smart default URL opening.
        // The app is now responsible for opening the URL or rejecting the request.
        guard UIApplication.shared.canOpenURL(request.url) else {
            return .rejected(reason: "Unsupported URL")
        }

        UIApplication.shared.open(request.url)
        return .success
    }

ShopifyCheckoutKit.present(
    checkout: checkoutURL,
    from: viewController,
    delegate: AppCheckoutDelegate(),
    client: client
)
```

For SwiftUI, keep native presentation callbacks on the view and connect the same protocol client:

```swift
ShopifyCheckout(checkout: checkoutURL)
    .connect(client)
    .onCancel {
        // Native presentation outcome.
    }
    .onFail { error in
        // Native/ambient failure.
    }
```

If you do not need custom external URL behavior, do not register `CheckoutProtocol.windowOpen`; the SDK smart default will handle supported URLs.
