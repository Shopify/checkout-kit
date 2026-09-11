#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import SwiftUI
import UIKit

@MainActor
public class CheckoutViewController: UINavigationController {
    public init(checkout url: URL, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) {
        let decoratedURL = CheckoutURLDecorator.decorate(url)
        let rootViewController = CheckoutWebViewController(checkoutURL: decoratedURL, delegate: delegate, client: client, entryPoint: nil)
        super.init(rootViewController: rootViewController)
        configureNavigationBar()
        presentationController?.delegate = rootViewController
    }

    package init(checkout url: URL, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        let decoratedURL = CheckoutURLDecorator.decorate(url)
        let rootViewController = CheckoutWebViewController(checkoutURL: decoratedURL, delegate: delegate, client: client, entryPoint: entryPoint)
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
    var client: (any CheckoutCommunicationProtocol)?
    var onDismissAction: (() -> Void)?
    var onFailAction: ((CheckoutError) -> Void)?

    public init(checkout url: URL) {
        checkoutURL = url
    }

    public func makeUIViewController(context _: Self.Context) -> CheckoutViewController {
        let viewController = CheckoutViewController(checkout: checkoutURL, client: client)
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

        webViewController.client = client
        webViewController.checkoutView?.client = client
        webViewController.onDismiss = onDismissAction
        webViewController.onFail = onFailAction
    }

    @discardableResult public func connect(_ handler: any CheckoutCommunicationProtocol) -> Self {
        var copy = self
        copy.client = handler
        return copy
    }

    @discardableResult public func onDismiss(_ action: @escaping () -> Void) -> Self {
        var copy = self
        copy.onDismissAction = action
        return copy
    }

    /// Registers a handler called when checkout cannot continue.
    ///
    /// Use ``CheckoutError/code`` for your app's recovery policy.
    @discardableResult public func onFail(_ action: @escaping (CheckoutError) -> Void) -> Self {
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
        ShopifyCheckoutKit.configuration.backgroundColor = color
        return self
    }

    @discardableResult public func appearance(_ appearance: ShopifyCheckoutKit.Configuration.Appearance) -> Self {
        ShopifyCheckoutKit.configuration.appearance = appearance
        return self
    }

    @discardableResult public func tintColor(_ color: UIColor) -> Self {
        ShopifyCheckoutKit.configuration.tintColor = color
        return self
    }

    @discardableResult public func title(_ title: String) -> Self {
        ShopifyCheckoutKit.configuration.title = title
        return self
    }

    @discardableResult public func closeButtonTintColor(_ color: UIColor?) -> Self {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = color
        return self
    }
}
