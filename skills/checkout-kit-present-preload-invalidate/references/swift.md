# Swift

```swift
import ShopifyCheckoutKit
import UIKit

private var preloadTask: Task<Void, Never>?
private var preloadedCheckoutURL: URL?

func onCartStateSettled(checkoutURL: URL) {
    preloadTask?.cancel()
    preloadTask = Task { @MainActor in
        try? await Task.sleep(nanoseconds: 300_000_000)
        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        preloadedCheckoutURL = checkoutURL
    }
}

func onCheckoutTapped(checkoutURL: URL, from viewController: UIViewController) {
    ShopifyCheckoutKit.present(checkout: checkoutURL, from: viewController, delegate: checkoutDelegate)
}

func onCheckoutAffectingStateChanged(freshCheckoutURL: URL, cartOrBuyerChanged: Bool) {
    let preloadedCheckoutIsStale = preloadedCheckoutURL != nil && preloadedCheckoutURL != freshCheckoutURL

    if cartOrBuyerChanged && preloadedCheckoutIsStale {
        ShopifyCheckoutKit.invalidate()
        preloadedCheckoutURL = nil
    }

    onCartStateSettled(checkoutURL: freshCheckoutURL)
}

func onSessionBoundaryChanged() {
    ShopifyCheckoutKit.invalidate()
    preloadedCheckoutURL = nil
}
```
