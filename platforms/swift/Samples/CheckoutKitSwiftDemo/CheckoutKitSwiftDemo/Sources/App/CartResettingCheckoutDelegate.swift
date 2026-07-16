import ShopifyCheckoutKit

@MainActor
final class CartResettingCheckoutDelegate: CheckoutDelegate {
    private var completed = false

    func markCompleted() {
        completed = true
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
