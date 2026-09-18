import ShopifyCheckoutKit

@MainActor
final class CartResettingCheckoutDelegate: CheckoutDelegate {
    private var completed = false

    func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
        print("[CheckoutKitSwiftDemo] Checkout completed: \(event.checkout.order?.id ?? "unknown")")
        completed = true
    }

    func checkoutDidDismiss() {
        guard completed else { return }
        completed = false
        CartManager.shared.resetCart()
    }

    func checkoutDidFail(_: CheckoutFailureEvent) {}
}
