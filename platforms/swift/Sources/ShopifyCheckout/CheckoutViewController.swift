#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import SwiftUI
import UIKit

@MainActor
public class CheckoutViewController: UINavigationController {
    public convenience init(checkout url: URL, delegate: (any CheckoutDelegate)? = nil) {
        self.init(
            checkout: url,
            configuration: ShopifyCheckout.configuration,
            delegate: delegate
        )
    }

    /// Shared initializer that lets SwiftUI inject instance-scoped configuration while package callers use the global default.
    package init(checkout url: URL, configuration: Configuration = ShopifyCheckout.configuration, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        let decoratedURL = CheckoutURLDecorator.decorate(url, configuration: configuration)
        let rootViewController = CheckoutWebViewController(
            checkoutURL: decoratedURL,
            configuration: configuration,
            delegate: delegate,
            client: client,
            entryPoint: entryPoint
        )
        super.init(rootViewController: rootViewController)
        configureNavigationBar(colorScheme: configuration.appearance.effectiveColorScheme)
        presentationController?.delegate = rootViewController
    }

    private func configureNavigationBar(colorScheme: CheckoutColorScheme) {
        overrideUserInterfaceStyle = colorScheme.userInterfaceStyle

        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = colorScheme.color { $0.headerBackgroundColor }
        appearance.titleTextAttributes = [.foregroundColor: colorScheme.color { $0.headerTitleColor }]
        appearance.shadowColor = colorScheme.optionalColor { $0.headerBorderColor }

        navigationBar.standardAppearance = appearance
        navigationBar.scrollEdgeAppearance = appearance
        navigationBar.compactAppearance = appearance
        navigationBar.compactScrollEdgeAppearance = appearance
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

/// Entry point for Checkout Kit's checkout feature, and the SwiftUI checkout content type.
///
/// `ShopifyCheckout` has two roles:
///
/// - **Static members** (``configure(_:)``, ``configuration``, ``preload(checkout:)``,
///   ``clearPreload()``, and ``present(checkout:from:delegate:)``) operate on shared checkout
///   state. Configuration and preloads apply to every checkout entry point.
/// - **Instances** created with ``init(checkout:)`` are checkout content that your app hosts.
///   Modifiers such as ``title(_:)`` and ``onComplete(_:)`` affect only that instance and do not
///   change the shared configuration.
///
/// ``present(checkout:from:delegate:)`` is a UIKit API on a SwiftUI type by design. The type
/// represents the checkout feature, so SDK-managed presentation lives alongside app-hosted
/// content rather than on a separate type. UIKit apps can call it without adopting SwiftUI.
public struct ShopifyCheckout: UIViewControllerRepresentable, CheckoutConfigurable {
    public typealias UIViewControllerType = CheckoutViewController

    /// Values set by instance modifiers such as ``title(_:)`` and ``appearance(_:)``.
    ///
    /// Only these values can vary per instance. Every other setting is always read from the shared
    /// ``ShopifyCheckout/configuration``.
    struct Overrides {
        var appearance: CheckoutAppearance?
        var title: String?

        func applied(to base: Configuration) -> Configuration {
            var resolved = base
            if let appearance {
                resolved.appearance = appearance
            }
            if let title {
                resolved.title = title
            }
            return resolved
        }
    }

    var checkoutURL: URL
    var overrides = Overrides()
    var onStartAction: ((CheckoutStartEvent) -> Void)?
    var onUpdateAction: ((CheckoutUpdateEvent) -> Void)?
    var onCompleteAction: ((CheckoutCompleteEvent) -> Void)?
    var onLinkClickAction: ((CheckoutLink) -> CheckoutLinkAction)?
    var onDismissAction: (() -> Void)?
    var onFailAction: ((CheckoutFailureEvent) -> Void)?

    public init(checkout url: URL) {
        checkoutURL = url
    }

    /// The shared configuration with this instance's overrides applied.
    func resolvedConfiguration(base: Configuration = ShopifyCheckout.configuration) -> Configuration {
        overrides.applied(to: base)
    }

    public func makeUIViewController(context _: Self.Context) -> CheckoutViewController {
        // Resolve once: appearance and title stay fixed for this checkout's lifetime, even if the
        // shared configuration changes while it is on screen.
        let viewController = CheckoutViewController(
            checkout: checkoutURL,
            configuration: resolvedConfiguration()
        )
        configureWebViewController(viewController)
        return viewController
    }

    public func updateUIViewController(_ uiViewController: CheckoutViewController, context _: Self.Context) {
        configureWebViewController(uiViewController)
    }

    private func configureWebViewController(_ navigationController: CheckoutViewController) {
        guard
            let webViewController = navigationController
            .viewControllers
            .compactMap({ $0 as? CheckoutWebViewController })
            .first
        else {
            return
        }

        webViewController.onStart = onStartAction
        webViewController.onUpdate = onUpdateAction
        webViewController.onComplete = onCompleteAction
        webViewController.onLinkClick = onLinkClickAction
        webViewController.onDismiss = onDismissAction
        webViewController.onFail = onFailAction
    }

    @discardableResult public func onStart(_ action: @escaping (CheckoutStartEvent) -> Void) -> Self {
        var copy = self
        copy.onStartAction = action
        return copy
    }

    @discardableResult public func onUpdate(_ action: @escaping (CheckoutUpdateEvent) -> Void) -> Self {
        var copy = self
        copy.onUpdateAction = action
        return copy
    }

    @discardableResult public func onComplete(_ action: @escaping (CheckoutCompleteEvent) -> Void) -> Self {
        var copy = self
        copy.onCompleteAction = action
        return copy
    }

    /// Registers a handler for links clicked in checkout.
    ///
    /// Return ``CheckoutLinkAction/default`` when your app does not handle the link,
    /// so Checkout Kit uses its default behavior; return ``CheckoutLinkAction/handled`` when your app handled the link, or
    /// ``CheckoutLinkAction/cancel`` to reject it.
    @discardableResult public func onLinkClick(
        _ action: @escaping (CheckoutLink) -> CheckoutLinkAction
    ) -> Self {
        var copy = self
        copy.onLinkClickAction = action
        return copy
    }

    /// Registers a handler called after the presented checkout closes.
    ///
    /// Dismissal describes presentation lifecycle independently of checkout outcome. When a
    /// terminal failure closes checkout, the `onFail` handler runs before this handler.
    ///
    /// When your app hosts this view in a SwiftUI `.sheet`, this handler also runs after the buyer
    /// swipes the sheet down. It does not run when the buyer taps outside the sheet, for example on
    /// iPad, or when your app sets the sheet's `isPresented` binding to `false`. The sheet's own
    /// `onDismiss` parameter runs for both. To keep the buyer from tapping outside the sheet, add
    /// `.interactiveDismissDisabled()`, which also turns off swipe-down.
    @discardableResult public func onDismiss(_ action: @escaping () -> Void) -> Self {
        var copy = self
        copy.onDismissAction = action
        return copy
    }

    /// Registers a handler called when checkout cannot continue.
    ///
    /// Use ``CheckoutError/code`` for your app's recovery policy.
    @discardableResult public func onFail(_ action: @escaping (CheckoutFailureEvent) -> Void) -> Self {
        var copy = self
        copy.onFailAction = action
        return copy
    }
}

@MainActor
public protocol CheckoutConfigurable {
    func appearance(_ appearance: CheckoutAppearance) -> Self
    func title(_ title: String) -> Self
}

extension CheckoutConfigurable {
    @discardableResult public func appearance(_ appearance: CheckoutAppearance) -> Self {
        modifyingOverrides { $0.appearance = appearance }
    }

    @discardableResult public func title(_ title: String) -> Self {
        modifyingOverrides { $0.title = title }
    }

    private func modifyingOverrides(_ update: (inout ShopifyCheckout.Overrides) -> Void) -> Self {
        guard var copy = self as? ShopifyCheckout else {
            return self
        }

        update(&copy.overrides)
        return copy as? Self ?? self
    }
}

/// Use `ShopifyCheckout` instead.
@available(*, deprecated, renamed: "ShopifyCheckout")
public typealias CheckoutSheet = ShopifyCheckout
