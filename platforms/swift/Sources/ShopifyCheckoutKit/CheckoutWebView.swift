#if !COCOAPODS
    import ShopifyCheckoutProtocol
#endif
import SafariServices
import UIKit
import WebKit

protocol CheckoutWebViewDelegate: AnyObject {
    func checkoutViewDidStartNavigation()
    func checkoutViewDidFinishNavigation()
    func checkoutViewDidFailWithError(error: CheckoutError)
}

protocol ExternalURLHandling: Sendable {
    @MainActor func open(_ url: URL) async -> Bool
}

struct UIApplicationExternalURLHandler: ExternalURLHandling {
    @MainActor
    func open(_ url: URL) async -> Bool {
        await UIApplication.shared.openURL(url)
    }
}

class CheckoutWebView: WKWebView {
    var timer: Date?

    var checkoutBridge: CheckoutBridgeProtocol.Type = CheckoutBridge.self

    var isBridgeAttached = false

    var client: (any CheckoutCommunicationProtocol)?
    var externalURLHandler: any ExternalURLHandling = UIApplicationExternalURLHandler()

    static func `for`(checkout url: URL, entryPoint: MetaData.EntryPoint? = nil) -> CheckoutWebView {
        OSLogger.shared.debug("Creating webview for URL: \(url.absoluteString)")
        return CheckoutWebView(entryPoint: entryPoint)
    }

    // MARK: Properties

    weak var viewDelegate: CheckoutWebViewDelegate?
    var presentedEventDidDispatch = false
    var checkoutDidPresent: Bool = false {
        didSet {
            dispatchPresentedMessage(checkoutDidLoad, checkoutDidPresent)
        }
    }

    var checkoutDidLoad: Bool = false {
        didSet {
            dispatchPresentedMessage(checkoutDidLoad, checkoutDidPresent)
        }
    }

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
        detachBridge()
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func connectBridge() {
        OSLogger.shared.debug("Bridging communication to checkout")
        configuration.userContentController
            .add(MessageHandler(delegate: self), name: CheckoutBridge.messageHandler)

        isBridgeAttached = true
    }

    public func detachBridge() {
        OSLogger.shared.debug("Detaching bridge")
        configuration.userContentController
            .removeScriptMessageHandler(forName: CheckoutBridge.messageHandler)
        isBridgeAttached = false
    }

    private func setBackgroundColor() {
        isOpaque = false
        backgroundColor = ShopifyCheckoutKit.configuration.backgroundColor

        if #available(iOS 15.0, *) {
            underPageBackgroundColor = ShopifyCheckoutKit.configuration.backgroundColor
        }
    }

    func instrument(_ payload: InstrumentationPayload) {
        OSLogger.shared.debug("Emitting instrumentation event with payload: \(payload)")
        checkoutBridge.instrument(self, payload)
    }

    // MARK: -

    func load(checkout url: URL) {
        OSLogger.shared.info("Loading checkout URL: \(url.absoluteString)")
        load(URLRequest(url: url))
    }

    private func dispatchPresentedMessage(_ checkoutDidLoad: Bool, _ checkoutDidPresent: Bool) {
        if checkoutDidLoad, checkoutDidPresent, isBridgeAttached {
            OSLogger.shared.info("Emitting presented event to checkout")
            CheckoutBridge.sendMessage(self, messageName: "presented", messageBody: nil)
            presentedEventDidDispatch = true
        }
    }
}

extension CheckoutWebView: WKScriptMessageHandler {
    func userContentController(_: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? String else {
            return
        }

        if let response = CheckoutProtocol.acknowledgeReady(body) {
            checkoutBridge.sendResponse(self, messageBody: response)
            return
        }

        Task {
            if let response = await client?.process(body) {
                checkoutBridge.sendResponse(self, messageBody: response)
                return
            }

            if let response = await defaultsClient.process(body) {
                checkoutBridge.sendResponse(self, messageBody: response)
            }
        }
    }

    /// Kit-owned client that handles delegations the consumer did not register.
    /// Today the only default is `window.open`, which opens web URLs in
    /// SFSafariViewController and non-web URLs with UIApplication.
    var defaultsClient: CheckoutProtocol.Client {
        CheckoutProtocol.Client()
        .on(CheckoutProtocol.windowOpen) { [externalURLHandler] request in
            let scheme = request.url.scheme?.lowercased()
            guard scheme == "http" || scheme == "https" else {
                let didOpen = await externalURLHandler.open(request.url)
                return didOpen ? .success : .rejected(reason: "UIApplication.open returned false")
            }

            guard let presenter = UIApplication.shared.foregroundActiveWindow?.topMostViewController() else {
                return .rejected(reason: "no presenter available")
            }

            let safari = SFSafariViewController(url: request.url)
            safari.modalPresentationStyle = .pageSheet
            safari.modalTransitionStyle = .coverVertical
            presenter.present(safari, animated: true)

            return .success
        }
    }
}

extension UIApplication {
    var foregroundActiveWindow: UIWindow? {
        let activeScenes = connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }

        if #available(iOS 15.0, *) {
            return activeScenes.compactMap(\.keyWindow).first
        } else {
            return activeScenes.flatMap(\.windows).first { $0.isKeyWindow }
        }
    }

    func openURL(_ url: URL) async -> Bool {
        await withCheckedContinuation { continuation in
            open(url, options: [:]) { didOpen in
                continuation.resume(returning: didOpen)
            }
        }
    }
}

extension UIWindow {
    func topMostViewController() -> UIViewController? {
        guard var topController = rootViewController else {
            return nil
        }

        while let presentedViewController = topController.presentedViewController {
            topController = presentedViewController
        }

        return topController
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
            UIApplication.shared.open(url, options: [:]) { didOpen in
                let result = didOpen ? "opened by native application controller" : "native application controller rejected"
                OSLogger.shared.debug("Deep link intercepted: \(url.absoluteString) - \(result)")
            }
            return decisionHandler(.cancel)
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

            if isBridgeAttached {
                instrument(
                    InstrumentationPayload(
                        name: "checkout_finished_loading",
                        value: Int(diff * 1000),
                        type: .histogram
                    )
                )
            }
        }
        checkoutDidLoad = true
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
