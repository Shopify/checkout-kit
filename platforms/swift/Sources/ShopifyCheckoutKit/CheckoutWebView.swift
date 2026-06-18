#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
import UIKit
import WebKit

@MainActor
protocol CheckoutWebViewDelegate: AnyObject {
    func checkoutViewDidStartNavigation()
    func checkoutViewDidFinishNavigation()
    func checkoutViewDidFailWithError(error: CheckoutError)
}

@MainActor
class CheckoutWebView: WKWebView {
    var timer: Date?

    var checkoutBridge: CheckoutBridgeProtocol.Type = CheckoutBridge.self

    var isBridgeAttached = false
    private var bridgeRegistration: ScriptMessageHandlerRegistration?

    var client: (any CheckoutCommunicationProtocol)?

    var canOpenExternalURL: (URL) -> Bool = { UIApplication.shared.canOpenURL($0) }

    var openExternalURL: (URL) -> Void = { UIApplication.shared.open($0) }

    /// Kit-owned client that handles delegations and kit-mandated notifications. Currently:
    ///   - `window.open` - falls back to `UIApplication.shared.open(...)` after a
    ///     `canOpenURL` check (consumers may still override via their own client).
    ///   - `ec.error` - when the payload carries `severity: "unrecoverable"`, dismiss
    ///     the kit via `viewDelegate`. Per UCP spec, `unrecoverable` means no valid
    ///     resource exists to act on, so consumers don't have to wire dismissal in
    ///     every error handler.
    lazy var defaultsClient: CheckoutProtocol.Client = .init()
        .on(CheckoutProtocol.windowOpen) { request in
            guard UIApplication.shared.canOpenURL(request.url) else {
                return .rejected(reason: "canOpenURL returned false")
            }
            UIApplication.shared.open(request.url)
            return .success
        }
        .on(CheckoutProtocol.error) { [weak self] payload in
            guard payload.messages.contains(where: { $0.severity == .unrecoverable }) else { return }
            self?.viewDelegate?.checkoutViewDidFailWithError(
                error: .checkoutUnavailable(
                    message: "Embedded checkout reported unrecoverable error.",
                    code: .clientError(code: .unknown)
                )
            )
        }

    var defaultClientBindings: [String: DefaultClientBinding] {
        [
            CheckoutProtocol.windowOpen.method: DefaultClientBinding(
                client: defaultsClient,
                policy: .runIfUnhandled
            ),
            CheckoutProtocol.error.method: DefaultClientBinding(
                client: defaultsClient,
                policy: .alwaysRunAfterMerchant
            )
        ]
    }

    static func `for`(checkout url: URL, entryPoint: MetaData.EntryPoint? = nil) -> CheckoutWebView {
        OSLogger.shared.debug("Creating webview for URL: \(url.absoluteString)")
        return CheckoutWebView(entryPoint: entryPoint)
    }

    // MARK: Properties

    weak var viewDelegate: CheckoutWebViewDelegate?

    private var entryPoint: MetaData.EntryPoint?

    // MARK: Initializers

    init(frame: CGRect = .zero, configuration: WKWebViewConfiguration = WKWebViewConfiguration(), entryPoint: MetaData.EntryPoint? = nil) {
        OSLogger.shared.debug("Initializing webview")
        configuration.allowsInlineMediaPlayback = true
        self.entryPoint = entryPoint
        configuration.applicationNameForUserAgent = CheckoutBridge.applicationName(entryPoint: entryPoint)

        super.init(frame: frame, configuration: configuration)

        #if DEBUG
            if #available(iOS 16.4, *) {
                isInspectable = true
            }
        #endif

        navigationDelegate = self
        translatesAutoresizingMaskIntoConstraints = false
        scrollView.contentInsetAdjustmentBehavior = .never

        setBackgroundColor()
        connectBridge()
    }

    deinit {
        OSLogger.shared.debug("De-allocating webview")
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func connectBridge() {
        OSLogger.shared.debug("Bridging communication to checkout")
        bridgeRegistration = ScriptMessageHandlerRegistration(
            userContentController: configuration.userContentController,
            name: CheckoutBridge.messageHandler,
            handler: MessageHandler(delegate: self)
        )
        isBridgeAttached = true
    }

    public func detachBridge() {
        guard isBridgeAttached else { return }

        OSLogger.shared.debug("Detaching bridge")
        bridgeRegistration?.detach()
        bridgeRegistration = nil
        isBridgeAttached = false
    }

    private func setBackgroundColor() {
        isOpaque = false
        backgroundColor = ShopifyCheckoutKit.configuration.backgroundColor

        underPageBackgroundColor = ShopifyCheckoutKit.configuration.backgroundColor
    }

    // MARK: -

    func load(checkout url: URL) {
        OSLogger.shared.info("Loading checkout URL: \(url.absoluteString)")
        load(URLRequest(url: url))
    }
}

/// Holds a WebKit script-message registration outside CheckoutWebView deinit.
///
/// Swift 6.0 does not support isolated deinit, so this token captures the
/// WebKit registration while on the main actor and schedules fallback teardown
/// back onto the main actor from deinit. Replace this with an isolated deinit
/// on CheckoutWebView once Swift 6.2+ is the minimum supported compiler.
private final class ScriptMessageHandlerRegistration {
    private let userContentController: WKUserContentController
    private let name: String
    private var isAttached = true

    @MainActor
    init(userContentController: WKUserContentController, name: String, handler: WKScriptMessageHandler) {
        self.userContentController = userContentController
        self.name = name
        userContentController.add(handler, name: name)
    }

    @MainActor
    func detach() {
        guard isAttached else { return }

        userContentController.removeScriptMessageHandler(forName: name)
        isAttached = false
    }

    deinit {
        guard isAttached else { return }

        let userContentController = userContentController
        let name = name
        Task { @MainActor in
            userContentController.removeScriptMessageHandler(forName: name)
        }
    }
}

extension CheckoutWebView: WKScriptMessageHandler {
    func userContentController(_: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? String else {
            return
        }

        if let response = CheckoutProtocol.acknowledgeReady(body) {
            Task { @MainActor in
                await checkoutBridge.sendResponse(self, messageBody: response)
            }
            return
        }

        Task { @MainActor in
            let composedClient = ComposedCheckoutCommunicationClient(
                merchant: client,
                defaults: defaultClientBindings
            )
            if let response = await composedClient.process(body) {
                await checkoutBridge.sendResponse(self, messageBody: response)
            }
        }
    }
}

extension CheckoutWebView: WKNavigationDelegate {
    func webView(_: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Handle rare cases where the url is nil
        guard let url = action.request.url else {
            decisionHandler(.allow)
            return
        }

        // Handle non-HTTP links triggered on external surfaces by opening them with UIApplication
        // Scenarios include:
        // 	- mailto:, tel: etc
        // 	- Deep links on offsite payment sites
        //
        if CheckoutURL(from: url).isDeepLink() {
            if canOpenExternalURL(url) {
                openExternalURL(url)
                OSLogger.shared.debug("Deep link intercepted: \(url.absoluteString) - opened externally")
                return decisionHandler(.cancel)
            } else {
                OSLogger.shared.error("Deep link rejected: \(url.absoluteString). If you're expecting this scheme, it must be listed under LSApplicationSchemeQueries in Info.plist.")
                return decisionHandler(.cancel)
            }
        }

        decisionHandler(.allow)
    }

    func webView(_: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let response = navigationResponse.response as? HTTPURLResponse {
            decisionHandler(handleResponse(response))
            return
        }
        decisionHandler(.allow)
    }

    func handleResponse(_ response: HTTPURLResponse) -> WKNavigationResponsePolicy {
        let statusCode = response.statusCode
        let errorMessageForStatusCode = HTTPURLResponse.localizedString(
            forStatusCode: statusCode
        )

        guard isCheckout(url: response.url) else {
            return .allow
        }

        if statusCode >= 400 {
            OSLogger.shared.debug("Handling response for URL: \(response.url?.absoluteString ?? "unknown URL"), status code: \(statusCode)")

            switch statusCode {
            case 410:
                OSLogger.shared.debug("Gone (410)")
                viewDelegate?.checkoutViewDidFailWithError(error: .checkoutExpired(message: "Checkout has expired.", code: CheckoutErrorCode.cartExpired))
            default:
                OSLogger.shared.debug("\(statusCode) error received")
                viewDelegate?.checkoutViewDidFailWithError(
                    error: .checkoutUnavailable(
                        message: errorMessageForStatusCode,
                        code: CheckoutUnavailable.httpError(statusCode: statusCode)
                    )
                )
            }

            return .cancel
        }

        return .allow
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation _: WKNavigation!) {
        let url = webView.url?.absoluteString ?? ""
        OSLogger.shared.info("Started provisional navigation - url:\(url)")
        timer = Date()
        viewDelegate?.checkoutViewDidStartNavigation()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation _: WKNavigation!, withError error: Error) {
        let url = webView.url?.absoluteString ?? ""
        OSLogger.shared.debug("Failed provisional navigation with error: \(error.localizedDescription) url:\(url)")
        timer = nil
    }

    func webView(_: WKWebView, didFinish _: WKNavigation!) {
        viewDelegate?.checkoutViewDidFinishNavigation()

        if let startTime = timer {
            let endTime = Date()
            let diff = endTime.timeIntervalSince(startTime)
            let message = "Loaded checkout in \(String(format: "%.2f", diff))s"

            ShopifyCheckoutKit.configuration.logger.log(message)
        }
        timer = nil
    }

    func webView(_: WKWebView, didFail _: WKNavigation!, withError error: Error) {
        timer = nil

        let nsError = error as NSError

        OSLogger.shared.debug("WebView navigation failed with error: description:\(nsError.localizedDescription) domain:\(nsError.domain) code:\(nsError.code)")

        if nsError.domain == NSURLErrorDomain, nsError.code == NSURLErrorCancelled {
            OSLogger.shared.debug("Ignoring cancelled URL redirect. code:NSURLErrorCancelled")
            return
        }

        viewDelegate?.checkoutViewDidFailWithError(
            error: .sdkError(underlying: error)
        )
    }

    private func isCheckout(url: URL?) -> Bool {
        return self.url == url
    }
}
