import ShopifyCheckoutKit

@MainActor
final class CartResettingCheckoutDelegate: CheckoutDelegate {
    private var completed = false

    func markCompleted() {
        completed = true
    }

    func checkoutDidDismiss() {
        guard completed else { return }
        completed = false
        CartManager.shared.resetCart()
    }

    func checkoutDidFail(error _: CheckoutError) {}
}
