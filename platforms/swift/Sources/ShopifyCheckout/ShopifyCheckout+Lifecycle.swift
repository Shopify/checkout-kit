#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import UIKit

private let lockedCheckoutConfiguration = LockedValue(Configuration())

extension ShopifyCheckout {
    /// The shared configuration for Checkout Kit's checkout feature.
    ///
    /// Reading is safe from any thread. Use ``configure(_:)`` to change configuration.
    public nonisolated static var configuration: Configuration {
        lockedCheckoutConfiguration.get()
    }

    /// Updates the shared checkout configuration.
    ///
    /// Calling this function invalidates any cached preload.
    @MainActor
    public static func configure(_ block: (inout Configuration) -> Void) {
        let previousConfiguration = lockedCheckoutConfiguration.get()
        lockedCheckoutConfiguration.update(block)
        let configuration = lockedCheckoutConfiguration.get()

        OSLogger.shared.logLevel = configuration.logLevel

        if previousConfiguration.telemetry.enabled, !configuration.telemetry.enabled {
            CheckoutTelemetry.disable()
        }

        clearPreload()
    }

    /// Preloads checkout for faster presentation and returns a handle for observing preload state.
    /// Each call refreshes the cached checkout, even when the URL is unchanged. Retain the handle
    /// to keep observing.
    @MainActor
    @discardableResult
    public static func preload(checkout url: URL) -> CheckoutPreload? {
        guard configuration.preloading.enabled else {
            return nil
        }

        let checkoutPreload = CheckoutPreload(cache: CheckoutWebView.preloadCache)
        let decorated = CheckoutURLDecorator.decorate(url)
        CheckoutWebView.preload(checkout: decorated)
        return checkoutPreload
    }

    /// Clears any cached checkout created by preload calls.
    /// If no checkout is cached, the last preload state is preserved and observers are not notified.
    @MainActor
    public static func clearPreload() {
        CheckoutWebView.preloadCache.evict(with: .idle(reason: .invalidated))
    }

    /// Presents checkout, or returns the existing checkout in the presenter’s modal hierarchy.
    /// Duplicate calls preserve the original checkout URL and delegate, including during dismissal.
    @MainActor
    @discardableResult
    public static func present(
        checkout url: URL,
        from: UIViewController,
        delegate: (any CheckoutDelegate)? = nil
    ) -> CheckoutViewController {
        presentCheckout(checkout: url, from: from, delegate: delegate)
    }

    @MainActor
    @discardableResult
    package static func present(
        checkout url: URL,
        from: UIViewController,
        entryPoint: MetaData.EntryPoint,
        delegate: (any CheckoutDelegate)? = nil,
        client: (any CheckoutCommunicationProtocol)? = nil
    ) -> CheckoutViewController {
        presentCheckout(checkout: url, from: from, delegate: delegate, client: client, entryPoint: entryPoint)
    }
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

    let viewController = CheckoutViewController(checkout: url, delegate: delegate, client: client, entryPoint: entryPoint)
    from.present(viewController, animated: true)
    return viewController
}
