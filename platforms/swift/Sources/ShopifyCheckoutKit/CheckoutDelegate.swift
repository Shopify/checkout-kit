import Foundation

/// A delegate protocol for managing checkout lifecycle events.
public protocol CheckoutDelegate: AnyObject {
    /// Tells the delegate that the checkout was cancelled by the buyer.
    func checkoutDidCancel()

    /// Tells the delegate that the checkout encountered one or more errors.
    func checkoutDidFail(error: CheckoutError)
}
