#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import UIKit

/// The version of the `ShopifyCheckoutKit` library.
public let version = "4.0.0-alpha.5"

private let lockedCheckoutKitConfiguration = LockedValue(Configuration())

/// The configuration options for the `ShopifyCheckoutKit` library.
///
/// Assigning configuration invalidates any cached preload.
public var configuration: Configuration {
    get { lockedCheckoutKitConfiguration.get() }
    set {
        lockedCheckoutKitConfiguration.set(newValue)
        applyConfigurationChange(newValue)
    }
}

/// A convenience function for configuring the `ShopifyCheckoutKit` library.
///
/// Calling this function invalidates any cached preload.
public func configure(_ block: (inout Configuration) -> Void) {
    lockedCheckoutKitConfiguration.update(block)
    applyConfigurationChange(lockedCheckoutKitConfiguration.get())
}

private func applyConfigurationChange(_ configuration: Configuration) {
    OSLogger.shared.logLevel = configuration.logLevel

    Task { @MainActor in
        invalidate()
    }
}

/// Preloads the checkout for faster presentation and returns a handle for
/// observing preload state. Retain the handle to keep observing.
@MainActor
@discardableResult
public func preload(checkout url: URL) -> CheckoutPreload? {
    guard configuration.preloading.enabled else {
        return nil
    }

    let checkoutPreload = CheckoutPreload(cache: CheckoutWebView.preloadCache)
    let decorated = CheckoutURLDecorator.decorate(url)
    CheckoutWebView.preload(checkout: decorated)
    return checkoutPreload
}

/// Invalidates any cached checkout created by preload calls.
@MainActor
public func invalidate() {
    CheckoutWebView.preloadCache.evict(with: .idle, disconnect: true)
}

@MainActor
@discardableResult
public func present(checkout url: URL, from: UIViewController, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) -> CheckoutViewController {
    let decorated = CheckoutURLDecorator.decorate(url)
    let viewController = CheckoutViewController(checkout: decorated, delegate: delegate, client: client)
    from.present(viewController, animated: true)
    return viewController
}

@MainActor
@discardableResult
package func present(checkout url: URL, from: UIViewController, entryPoint: MetaData.EntryPoint, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) -> CheckoutViewController {
    let decorated = CheckoutURLDecorator.decorate(url)
    let viewController = CheckoutViewController(checkout: decorated, delegate: delegate, client: client, entryPoint: entryPoint)
    from.present(viewController, animated: true)
    return viewController
}
