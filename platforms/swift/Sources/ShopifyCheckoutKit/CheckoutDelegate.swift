import Foundation

/// A delegate protocol for managing checkout lifecycle events.
public protocol CheckoutDelegate: AnyObject {
    /// Tells the delegate that the buyer dismissed checkout.
    func checkoutDidDismiss()

    /// Tells the delegate that checkout cannot continue.
    ///
    /// Use ``CheckoutError/code`` for your app's recovery policy.
    func checkoutDidFail(error: CheckoutError)
}
