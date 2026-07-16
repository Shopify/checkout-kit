import Foundation

/// A delegate protocol for managing checkout lifecycle events.
public protocol CheckoutDelegate: AnyObject {
    /// Tells the delegate that the buyer dismissed checkout.
    func checkoutDidDismiss()

    /// Tells the delegate that the checkout encountered one or more errors.
    func checkoutDidFail(error: CheckoutError)
}
