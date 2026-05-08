# Swift

```swift
import ShopifyCheckoutKit
import UIKit

let checkout = ShopifyCheckoutKit.present(checkout: checkoutURL, from: viewController)
    .onComplete { event in
        navigateToConfirmation(event)
    }
    .onCancel {
        handleCheckoutCancel()
    }
    .onFail { error in
        renderCheckoutError(error)
    }
    .onLinkClick { url in
        openExternalURL(url)
    }
```

```swift
final class AppCheckoutDelegate: CheckoutDelegate {
    func checkoutDidComplete(event: CheckoutCompletedEvent) {
        navigateToConfirmation(event)
    }

    func checkoutDidCancel() {
        handleCheckoutCancel()
    }

    func checkoutDidFail(error: CheckoutError) {
        renderCheckoutError(error)
    }

    func checkoutDidClickLink(url: URL) {
        openExternalURL(url)
    }
}

ShopifyCheckoutKit.present(
    checkout: checkoutURL,
    from: viewController,
    delegate: AppCheckoutDelegate()
)
```
