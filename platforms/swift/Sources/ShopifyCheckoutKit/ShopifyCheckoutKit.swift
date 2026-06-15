#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
import UIKit

/// The version of the `ShopifyCheckoutKit` library.
public let version = "4.0.0-alpha.1"

/// The configuration options for the `ShopifyCheckoutKit` library.
public var configuration = Configuration() {
    didSet {
        OSLogger.shared.logLevel = configuration.logLevel
    }
}

/// A convienence function for configuring the `ShopifyCheckoutKit` library.
public func configure(_ block: (inout Configuration) -> Void) {
    block(&configuration)
}

@MainActor
@discardableResult
public func present(checkout url: URL, from: UIViewController, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) -> CheckoutViewController {
    let decorated = CheckoutProtocol.url(for: url)
    let viewController = CheckoutViewController(checkout: decorated, delegate: delegate, client: client)
    from.present(viewController, animated: true)
    return viewController
}

@MainActor
@discardableResult
package func present(checkout url: URL, from: UIViewController, entryPoint: MetaData.EntryPoint, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) -> CheckoutViewController {
    let decorated = CheckoutProtocol.url(for: url)
    let viewController = CheckoutViewController(checkout: decorated, delegate: delegate, client: client, entryPoint: entryPoint)
    from.present(viewController, animated: true)
    return viewController
}
