#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
import UIKit

/// The version of the `ShopifyCheckoutKit` library.
public let version = "4.0.0-alpha.1"

private let lockedCheckoutKitConfiguration = LockedValue(Configuration())

/// The configuration options for the `ShopifyCheckoutKit` library.
public var configuration: Configuration {
    get { lockedCheckoutKitConfiguration.get() }
    set {
        lockedCheckoutKitConfiguration.set(newValue)
        applyConfigurationChange()
    }
}

/// A convienence function for configuring the `ShopifyCheckoutKit` library.
public func configure(_ block: (inout Configuration) -> Void) {
    lockedCheckoutKitConfiguration.update(block)
    applyConfigurationChange()
}

private func applyConfigurationChange() {
    let configuration = lockedCheckoutKitConfiguration.get()
    OSLogger.shared.logLevel = configuration.logLevel

    if !configuration.preloading.enabled {
        Task { @MainActor in
            if !ShopifyCheckoutKit.configuration.preloading.enabled {
                CheckoutWebView.invalidate()
            }
        }
    }
}

/// Preloads the checkout for faster presentation.
@MainActor
public func preload(checkout url: URL) {
    guard configuration.preloading.enabled else {
        return
    }

    let decorated = CheckoutProtocol.url(for: url)
    CheckoutWebView.preload(checkout: decorated)
}

/// Invalidates any cached checkout created by preload calls.
@MainActor
public func invalidate() {
    CheckoutWebView.invalidate(disconnect: true)
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
