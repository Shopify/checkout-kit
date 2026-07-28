#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import SwiftUI
import UIKit

@MainActor
public class CheckoutViewController: UINavigationController {
    public init(checkout url: URL, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil) {
        let rootViewController = CheckoutWebViewController(checkoutURL: url, delegate: delegate, client: client, entryPoint: nil)
        super.init(rootViewController: rootViewController)
        presentationController?.delegate = rootViewController
    }

    package init(checkout url: URL, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        let rootViewController = CheckoutWebViewController(checkoutURL: url, delegate: delegate, client: client, entryPoint: entryPoint)
        super.init(rootViewController: rootViewController)
        presentationController?.delegate = rootViewController
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
    var callbackClient = CheckoutProtocol.Client()
    var onDismissAction: (() -> Void)?
    var onFailAction: ((CheckoutError) -> Void)?

    public init(checkout url: URL) {
        checkoutURL = url
    }

    var decoratedCheckoutURL: URL {
        CheckoutURLDecorator.decorate(checkoutURL)
    }

    var connectedClient: any CheckoutCommunicationProtocol {
        CheckoutEventCallbackClient(callbacks: callbackClient, advanced: client)
    }

    public func makeUIViewController(context _: Self.Context) -> CheckoutViewController {
        let viewController = CheckoutViewController(checkout: decoratedCheckoutURL, client: connectedClient)
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

        webViewController.client = connectedClient
        webViewController.checkoutView?.client = connectedClient
        webViewController.onDismiss = onDismissAction
        webViewController.onFail = onFailAction
    }

    /// Connects an advanced Embedded Checkout Protocol client.
    ///
    /// Prefer the lifecycle callback modifiers for common checkout observation. A
    /// connected client can additionally handle protocol requests and receives the
    /// same notifications as the callbacks. Unhandled `ec.ready` requests fall back
    /// to Checkout Kit's standard handshake response.
    @discardableResult public func connect(_ handler: any CheckoutCommunicationProtocol) -> Self {
        var copy = self
        copy.client = handler
        return copy
    }

    /// Adds an action to perform when checkout is visible and interactive.
    @discardableResult public func onStart(_ action: @escaping @MainActor @Sendable (Checkout) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.start, perform: action)
        return copy
    }

    /// Adds an action to perform when checkout completes successfully.
    @discardableResult public func onComplete(_ action: @escaping @MainActor @Sendable (Checkout) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.complete, perform: action)
        return copy
    }

    /// Adds an action to perform when checkout reports a protocol error.
    ///
    /// Recoverable protocol errors do not invoke `onFail`; `onFail` remains reserved
    /// for terminal SDK and presentation failures.
    @discardableResult public func onError(_ action: @escaping @MainActor @Sendable (ErrorResponse) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.error, perform: action)
        return copy
    }

    /// Adds an action to perform when checkout fulfillment details change.
    @discardableResult public func onFulfillmentChange(_ action: @escaping @MainActor @Sendable (Checkout) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.fulfillmentChange, perform: action)
        return copy
    }

    /// Adds an action to perform when checkout line items change.
    @discardableResult public func onLineItemsChange(_ action: @escaping @MainActor @Sendable (Checkout) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.lineItemsChange, perform: action)
        return copy
    }

    /// Adds an action to perform when checkout messages change.
    @discardableResult public func onMessagesChange(_ action: @escaping @MainActor @Sendable (Checkout) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.messagesChange, perform: action)
        return copy
    }

    /// Adds an action to perform when checkout totals change.
    @discardableResult public func onTotalsChange(_ action: @escaping @MainActor @Sendable (Checkout) -> Void) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.totalsChange, perform: action)
        return copy
    }

    /// Adds an action that can handle requests to open an external window.
    ///
    /// Return `.success()` after presenting the requested URL, or `.rejected()`
    /// when the request cannot be handled. When this callback is absent, Checkout
    /// Kit uses its standard external URL handling.
    @discardableResult public func onWindowOpen(
        _ action: @escaping @MainActor @Sendable (WindowOpenRequest) async -> WindowOpenResult
    ) -> Self {
        var copy = self
        copy.callbackClient = callbackClient.on(CheckoutProtocol.windowOpen, perform: action)
        return copy
    }

    @discardableResult public func onDismiss(_ action: @escaping () -> Void) -> Self {
        var copy = self
        copy.onDismissAction = action
        return copy
    }

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
