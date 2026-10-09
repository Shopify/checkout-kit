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
            configuration: ShopifyCheckoutKit.configuration,
            delegate: delegate
        )
    }

    /// Shared initializer that lets SwiftUI inject instance-scoped configuration while package callers use the global default.
    package init(checkout url: URL, configuration: Configuration = ShopifyCheckoutKit.configuration, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        let rootViewController = CheckoutWebViewController(
            checkoutURL: url,
            configuration: configuration,
            delegate: delegate,
            client: client,
            entryPoint: entryPoint
        )
        super.init(rootViewController: rootViewController)
        configureNavigationBar()
        presentationController?.delegate = rootViewController
    }

    private func configureNavigationBar() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()

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

public struct ShopifyCheckout: UIViewControllerRepresentable, CheckoutConfigurable {
    public typealias UIViewControllerType = CheckoutViewController

    var checkoutURL: URL
    var configuration: Configuration
    var onStartAction: ((CheckoutStartEvent) -> Void)?
    var onUpdateAction: ((CheckoutUpdateEvent) -> Void)?
    var onCompleteAction: ((CheckoutCompleteEvent) -> Void)?
    var onLinkClickAction: ((CheckoutLink) -> CheckoutLinkAction)?
    var onDismissAction: (() -> Void)?
    var onFailAction: ((CheckoutFailureEvent) -> Void)?

    public init(checkout url: URL) {
        checkoutURL = url
        configuration = ShopifyCheckoutKit.configuration
    }

    var decoratedCheckoutURL: URL {
        CheckoutURLDecorator.decorate(checkoutURL, configuration: configuration)
    }

    public func makeUIViewController(context _: Self.Context) -> CheckoutViewController {
        let viewController = CheckoutViewController(
            checkout: decoratedCheckoutURL,
            configuration: configuration
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
    /// Return ``CheckoutLinkAction/open`` to use Checkout Kit's default behavior,
    /// ``CheckoutLinkAction/handled`` when your app handled the link, or
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
    func backgroundColor(_ color: UIColor) -> Self
    func appearance(_ appearance: ShopifyCheckoutKit.Configuration.Appearance) -> Self
    func tintColor(_ color: UIColor) -> Self
    func title(_ title: String) -> Self
    func closeButtonTintColor(_ color: UIColor?) -> Self
}

extension CheckoutConfigurable {
    @discardableResult public func backgroundColor(_ color: UIColor) -> Self {
        modifyingConfiguration { $0.backgroundColor = color }
    }

    @discardableResult public func appearance(_ appearance: ShopifyCheckoutKit.Configuration.Appearance) -> Self {
        modifyingConfiguration { $0.appearance = appearance }
    }

    @discardableResult public func tintColor(_ color: UIColor) -> Self {
        modifyingConfiguration { $0.tintColor = color }
    }

    @discardableResult public func title(_ title: String) -> Self {
        modifyingConfiguration { $0.title = title }
    }

    @discardableResult public func closeButtonTintColor(_ color: UIColor?) -> Self {
        modifyingConfiguration { $0.closeButtonTintColor = color }
    }

    private func modifyingConfiguration(_ update: (inout Configuration) -> Void) -> Self {
        guard var copy = self as? ShopifyCheckout else {
            return self
        }

        update(&copy.configuration)
        return copy as? Self ?? self
    }
}
