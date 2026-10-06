#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import UIKit

/// The version of the `ShopifyCheckoutKit` library.
public let version = "4.0.0-alpha.8"

private let lockedCheckoutKitConfiguration = LockedValue(Configuration())

/// The configuration options for the `ShopifyCheckoutKit` library.
///
/// Assigning configuration invalidates any cached preload.
public var configuration: Configuration {
    get { lockedCheckoutKitConfiguration.get() }
    set {
        let previousConfiguration = lockedCheckoutKitConfiguration.get()
        lockedCheckoutKitConfiguration.set(newValue)
        applyConfigurationChange(
            configuration: newValue,
            previousConfiguration: previousConfiguration
        )
    }
}

/// A convenience function for configuring the `ShopifyCheckoutKit` library.
///
/// Calling this function invalidates any cached preload.
public func configure(_ block: (inout Configuration) -> Void) {
    let previousConfiguration = lockedCheckoutKitConfiguration.get()
    lockedCheckoutKitConfiguration.update(block)
    applyConfigurationChange(
        configuration: lockedCheckoutKitConfiguration.get(),
        previousConfiguration: previousConfiguration
    )
}

private func applyConfigurationChange(configuration: Configuration, previousConfiguration: Configuration) {
    OSLogger.shared.logLevel = configuration.logLevel

    if previousConfiguration.telemetry.enabled, !configuration.telemetry.enabled {
        CheckoutTelemetry.disable()
    }

    // Invalidate synchronously on the main thread so a `preload` issued right after a
    // configuration change is not discarded by a deferred invalidation.
    if Thread.isMainThread {
        MainActor.assumeIsolated { invalidate() }
    } else {
        Task { @MainActor in invalidate() }
    }
}

/// Preloads the checkout for faster presentation and returns a handle for
/// observing preload state. Each call refreshes the cached checkout, even when
/// the URL is unchanged. Retain the handle to keep observing.
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
    CheckoutWebView.preloadCache.evict(with: .idle)
}

/// Presents checkout, or returns the existing checkout in the presenter’s modal hierarchy.
/// Duplicate calls preserve the original checkout URL and delegate, including during dismissal.
@MainActor
@discardableResult
public func present(checkout url: URL, from: UIViewController, delegate: (any CheckoutDelegate)? = nil) -> CheckoutViewController {
    presentCheckout(checkout: url, from: from, delegate: delegate)
}

@MainActor
@discardableResult
package func present(checkout url: URL, from: UIViewController, entryPoint: MetaData.EntryPoint, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) -> CheckoutViewController {
    presentCheckout(checkout: url, from: from, delegate: delegate, client: client, entryPoint: entryPoint)
}

@MainActor
private func presentCheckout(checkout url: URL, from: UIViewController, delegate: (any CheckoutDelegate)?, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) -> CheckoutViewController {
    // Start at the root so calls from a checkout child or a modal above it share the same guard.
    var root = from
    while let ancestor = root.parent ?? root.presentingViewController {
        root = ancestor
    }
    var presented: UIViewController? = root
    while let current = presented {
        if let checkout = current as? CheckoutViewController {
            OSLogger.shared.warn("Checkout is already presented; ignoring duplicate presentation.")
            return checkout
        }
        presented = current.presentedViewController
    }

    let decorated = CheckoutURLDecorator.decorate(url)
    let viewController = CheckoutViewController(checkout: decorated, delegate: delegate, client: client, entryPoint: entryPoint)
    from.present(viewController, animated: true)
    return viewController
}
