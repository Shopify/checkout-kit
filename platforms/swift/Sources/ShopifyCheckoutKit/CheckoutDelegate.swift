import Foundation

/// A delegate protocol for managing checkout lifecycle events.
public protocol CheckoutDelegate: AnyObject {
    /// Tells the delegate that the buyer started checkout.
    func checkoutDidStart(_ checkout: Checkout)

    /// Tells the delegate that the buyer-visible checkout state changed.
    func checkoutDidUpdate(_ checkout: Checkout)

    /// Tells the delegate that checkout completed.
    func checkoutDidComplete(_ checkout: Checkout)

    /// Tells the delegate that the buyer dismissed checkout.
    func checkoutDidDismiss()

    /// Tells the delegate that checkout cannot continue.
    ///
    /// Use ``CheckoutError/code`` for your app's recovery policy.
    func checkoutDidFail(error: CheckoutError)
}

extension CheckoutDelegate {
    public func checkoutDidStart(_: Checkout) {}
    public func checkoutDidUpdate(_: Checkout) {}
    public func checkoutDidComplete(_: Checkout) {}
    public func checkoutDidDismiss() {}
    public func checkoutDidFail(error _: CheckoutError) {}
}
