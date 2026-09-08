import ShopifyCheckoutKit

@MainActor
final class CartResettingCheckoutDelegate: CheckoutDelegate {
    private var completed = false

    nonisolated func checkoutDidComplete(_ checkout: Checkout) {
        MainActor.assumeIsolated {
            print("[CheckoutKit] Checkout completed: \(checkout.order?.id ?? "unknown")")
            completed = true
        }
    }

    nonisolated func checkoutDidDismiss() {
        MainActor.assumeIsolated {
            guard completed else { return }
            completed = false
            CartManager.shared.resetCart()
        }
    }

    nonisolated func checkoutDidFail(error _: CheckoutError) {}
}
