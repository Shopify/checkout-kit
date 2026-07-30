#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import UIKit
import WebKit

@MainActor
struct PreloadKey: Hashable {
    let url: URL
    let entryPoint: MetaData.EntryPoint?
}

@MainActor
final class PreloadCache {
    private struct Entry {
        let key: PreloadKey
        let view: CheckoutWebView
        let createdAt: Date

        private static let ttl: TimeInterval = 5 * 60

        init(key: PreloadKey, view: CheckoutWebView, createdAt: Date = Date()) {
            self.key = key
            self.view = view
            self.createdAt = createdAt
        }

        var isStale: Bool {
            remainingTTL <= 0
        }

        var remainingTTL: TimeInterval {
            Self.ttl - Date().timeIntervalSince(createdAt)
        }
    }

    private static let keepAliveInterval: TimeInterval = 0.5

    private var entry: Entry?
    private var keepAliveTimer: Timer?
    private var expiryTimer: Timer?

    private(set) var state: PreloadState = .idle

    /// The cache notifies a single observer. Each `preload(checkout:)` call
    /// replaces it, so only the most recently returned `CheckoutPreload` handle
    /// receives state updates; earlier handles stop observing.
    private weak var observer: CheckoutPreload?

    func setObserver(_ observer: CheckoutPreload) {
        self.observer = observer
    }

    func store(_ view: CheckoutWebView, for key: PreloadKey, createdAt: Date = Date()) -> Bool {
        if let entry, entry.key == key, !entry.isStale {
            return true
        }

        invalidate()

        let entry = Entry(key: key, view: view, createdAt: createdAt)
        guard !entry.isStale else {
            return false
        }

        view.frame = Self.preloadFrame()
        self.entry = entry
        startKeepAlive(for: view)
        startExpiryTimer(after: entry.remainingTTL)
        transition(to: .loading)
        return true
    }

    func transition(to newState: PreloadState) {
        guard state != newState else { return }

        state = newState
        observer?.receive(newState)
    }

    /// Evicts the cached view, then notifies observers of the resulting `state`.
    /// Clearing before notifying ensures a preload started re-entrantly from the
    /// callback is not wiped by this invalidation.
    func evict(with state: PreloadState, disconnect: Bool = true) {
        invalidate(disconnect: disconnect)
        transition(to: state)
    }

    func view(for key: PreloadKey) -> CheckoutWebView? {
        guard let cached = entry, cached.key == key, !cached.isStale else {
            let missed = entry
            invalidate()
            if let missed {
                transition(to: missed.isStale ? .expired : .idle)
            }
            return nil
        }

        stopKeepAlive()
        stopExpiryTimer()
        cached.view.hasBeenPresented = true
        return cached.view
    }

    func invalidate(disconnect: Bool = true) {
        OSLogger.shared.debug("Invalidating preload cache, disconnect: \(disconnect)")

        let cachedView = entry?.view
        stopKeepAlive()
        stopExpiryTimer()
        entry = nil

        if disconnect {
            cachedView?.detachBridge()
        }
    }

    func hasEntry() -> Bool {
        if entry?.isStale == true {
            expire()
            return false
        }

        return entry != nil
    }

    func hasEntry(for key: PreloadKey) -> Bool {
        guard let entry, entry.key == key else {
            return false
        }

        if entry.isStale {
            expire()
            return false
        }

        return true
    }

    func contains(_ view: CheckoutWebView) -> Bool {
        guard let entry, !entry.isStale else {
            return false
        }

        return entry.view === view
    }

    func hasActiveKeepAlive() -> Bool {
        return keepAliveTimer != nil
    }

    /// While the preloaded webview is unparented, WebKit can suspend its web process before
    /// the page finishes loading. Periodically evaluating a no-op keeps the process scheduled
    /// so the preloaded page can finish loading before it is presented. The 500ms cadence is
    /// empirical and intentionally conservative rather than a documented WebKit guarantee.
    private func startKeepAlive(for view: CheckoutWebView) {
        stopKeepAlive()
        let timer = Timer.scheduledTimer(withTimeInterval: Self.keepAliveInterval, repeats: true) { [weak self, weak view] _ in
            Task { @MainActor in
                do {
                    _ = try await view?.evaluateJavaScript("void 0")
                } catch {
                    OSLogger.shared.debug("Preload keep-alive failed; invalidating preload cache")
                    self?.keepAliveDidFail()
                }
            }
        }
        timer.tolerance = Self.keepAliveInterval / 2
        keepAliveTimer = timer
    }

    private func startExpiryTimer(after interval: TimeInterval) {
        stopExpiryTimer()
        let timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.expire()
            }
        }
        timer.tolerance = min(interval / 2, 1)
        expiryTimer = timer
    }

    func expire() {
        evict(with: .expired)
    }

    func keepAliveDidFail() {
        evict(with: .failed(reason: .keepAliveLost))
    }

    private func stopKeepAlive() {
        keepAliveTimer?.invalidate()
        keepAliveTimer = nil
    }

    private func stopExpiryTimer() {
        expiryTimer?.invalidate()
        expiryTimer = nil
    }

    private static func preloadFrame() -> CGRect {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return scene?.coordinateSpace.bounds ?? UIScreen.main.bounds
    }
}

private enum LogSafeURL {
    private static let redactedQueryItemNames = Set([
        "checkout[email]",
        "checkout[phone]",
        "ec_auth",
        "key",
        "multipass",
        "token"
    ])

    static func string(_ url: URL?) -> String {
        guard let url else {
            return "unknown URL"
        }

        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return "redacted URL"
        }

        components.user = components.user.map { _ in "redacted" }
        components.password = components.password.map { _ in "redacted" }
        components.queryItems = components.queryItems?.map(redactedQueryItem)
        components.fragment = nil

        return components.string ?? "redacted URL"
    }

    private static func redactedQueryItem(_ item: URLQueryItem) -> URLQueryItem {
        guard redactedQueryItemNames.contains(item.name) || item.name.hasPrefix("checkout[") else {
            return item
        }

        return URLQueryItem(name: item.name, value: "redacted")
    }
}

@MainActor
protocol CheckoutWebViewDelegate: AnyObject {
    func checkoutViewDidStartNavigation()
    func checkoutViewDidFinishNavigation()
    func checkoutViewDidFailWithError(error: CheckoutError)
}

@MainActor
class CheckoutWebView: WKWebView {
    static let preloadCache = PreloadCache()
    private static let purposeHeader = "Shopify-Purpose"
    private static let prefetchPurpose = "prefetch"

    var timer: Date?

    private(set) var checkoutNavigation: WKNavigation?
    private var didRetryCheckoutNavigation = false
    private var checkoutRequest: URLRequest?

    var checkoutBridge: CheckoutBridgeProtocol.Type = CheckoutBridge.self

    var isBridgeAttached = false
    private var bridgeRegistration: ScriptMessageHandlerRegistration?

    var client: (any CheckoutCommunicationProtocol)?

    var canOpenExternalURL: (URL) -> Bool = { UIApplication.shared.canOpenURL($0) }

    var openExternalURL: (URL) -> Void = { UIApplication.shared.open($0) }

    /// Kit-owned client that handles delegations and kit-mandated notifications. Currently:
    ///   - `ec.ready` - kit-owned handshake. Supported delegations are announced up
    ///     front via the `ec_delegate` URL query param; acceptance is implicit, so the
    ///     ready result carries only the UCP envelope and the kit simply answers the
    ///     delegated calls it supports. It is abstracted from consumers and cannot be
    ///     overridden by a merchant-supplied client.
    ///   - `window.open` - falls back to `UIApplication.shared.open(...)` after a
    ///     `canOpenURL` check (consumers may still override via their own client).
    lazy var defaultsClient: CheckoutProtocol.Client = .init()
        .onDecodeError { method, error, params in
            OSLogger.shared.error("Failed to decode \(method) payload: \(error)")
            OSLogger.shared.debug("Raw \(method) params: \(String(bytes: params, encoding: .utf8) ?? "")")
        }
        .on(CheckoutProtocol.ready) { _ in
            ReadyResult(checkout: nil, credential: nil, ucp: .success(), upgrade: nil, continueURL: nil, messages: nil)
        }
        .on(CheckoutProtocol.complete) { [weak self] _ in
            guard let self, CheckoutWebView.preloadCache.contains(self) else { return }
            CheckoutWebView.preloadCache.evict(with: .idle, disconnect: false)
        }
        .on(CheckoutProtocol.windowOpen) { request in
            guard let target = request.parsedURL, self.canOpenExternalURL(target) else {
                return .rejected(reason: "canOpenURL returned false")
            }
            self.openExternalURL(target)
            return .success()
        }

    var defaultClientBindings: [String: DefaultClientBinding] {
        [
            CheckoutProtocol.ready.method: DefaultClientBinding(
                client: defaultsClient,
                policy: .kitOwned
            ),
            CheckoutProtocol.complete.method: DefaultClientBinding(
                client: defaultsClient,
                policy: .alwaysRunAfterMerchant
            ),
            CheckoutProtocol.windowOpen.method: DefaultClientBinding(
                client: defaultsClient,
                policy: .runIfUnhandled
            )
        ]
    }

    static func `for`(checkout url: URL, entryPoint: MetaData.EntryPoint? = nil) -> CheckoutWebView {
        OSLogger.shared.debug("Creating webview for URL: \(LogSafeURL.string(url))")

        guard ShopifyCheckoutKit.configuration.preloading.enabled else {
            OSLogger.shared.debug("Preloading not enabled")
            return CheckoutWebView(entryPoint: entryPoint)
        }

        guard let cachedView = preloadCache.view(for: PreloadKey(url: url, entryPoint: entryPoint)) else {
            return CheckoutWebView(entryPoint: entryPoint)
        }

        OSLogger.shared.debug("Presenting cached entry")
        return cachedView
    }

    static func preload(checkout url: URL, entryPoint: MetaData.EntryPoint? = nil, createdAt: Date = Date()) {
        guard ShopifyCheckoutKit.configuration.preloading.enabled else {
            return
        }

        let key = PreloadKey(url: url, entryPoint: entryPoint)
        guard !preloadCache.hasEntry(for: key) else {
            OSLogger.shared.debug("Preload cache already has matching entry")
            return
        }

        let view = CheckoutWebView(entryPoint: entryPoint)
        // Keep the preloaded webview out of any window. WebKit derives
        // `document.visibilityState` from window membership, so an unparented webview reports
        // `hidden` while still running JS to completion; adding it to a window at presentation
        // flips it to `visible`. Size it to the presentation viewport so it loads at the right
        // dimensions and avoids a reflow when shown.
        if preloadCache.store(view, for: key, createdAt: createdAt) {
            view.load(checkout: url, isPreload: true)
        }
    }

    static func invalidate(disconnect: Bool = true) {
        preloadCache.invalidate(disconnect: disconnect)
    }

    // MARK: Properties

    weak var viewDelegate: CheckoutWebViewDelegate?

    var isPreloadRequest = false

    /// Latches true once the cached view is handed off for presentation. A
    /// presented view is a live session, so its navigation events must no
    /// longer drive preload state, even after dismissal or reuse.
    var hasBeenPresented = false

    private var didReceiveTerminalProtocolError = false
    private var entryPoint: MetaData.EntryPoint?

    // MARK: Initializers

    convenience init(frame: CGRect = .zero, entryPoint: MetaData.EntryPoint? = nil) {
        self.init(frame: frame, configuration: WKWebViewConfiguration(), entryPoint: entryPoint)
    }

    init(frame: CGRect = .zero, configuration: WKWebViewConfiguration, entryPoint: MetaData.EntryPoint? = nil) {
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

    func cleanUpForDismissal() {
        stopLoading()
        navigationDelegate = nil
        uiDelegate = nil
        viewDelegate = nil
        client = nil
        removeFromSuperview()
        detachBridge()
    }

    private func setBackgroundColor() {
        isOpaque = false
        backgroundColor = ShopifyCheckoutKit.configuration.backgroundColor
        underPageBackgroundColor = ShopifyCheckoutKit.configuration.backgroundColor
    }

    // MARK: -

    func load(checkout url: URL, isPreload: Bool = false) {
        OSLogger.shared.info("Loading checkout URL: \(LogSafeURL.string(url)), isPreload: \(isPreload)")
        var request = URLRequest(url: url)

        if isPreload, ShopifyCheckoutKit.configuration.preloading.enabled {
            isPreloadRequest = true
            request.setValue(Self.prefetchPurpose, forHTTPHeaderField: Self.purposeHeader)
        }

        checkoutRequest = request
        didRetryCheckoutNavigation = false
        didReceiveTerminalProtocolError = false
        checkoutNavigation = load(request)
    }

    private var isPreloadBackgrounded: Bool {
        CheckoutWebView.preloadCache.contains(self) && !hasBeenPresented
    }

    private func handleCachedViewFailure(_ reason: PreloadState.FailureReason) {
        guard CheckoutWebView.preloadCache.contains(self) else { return }

        if hasBeenPresented {
            CheckoutWebView.preloadCache.evict(with: .idle)
        } else {
            CheckoutWebView.preloadCache.evict(with: .failed(reason: reason))
        }
    }

    private func markPreloadReadyIfActive() {
        guard isPreloadBackgrounded else { return }

        CheckoutWebView.preloadCache.transition(to: .ready)
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

        guard let method = CheckoutProtocol.supportedProtocolMethod(body) else {
            if isTerminalProtocolError(body) {
                handleTerminalProtocolError(body, malformedEnvelope: true)
            } else if let response = CheckoutProtocol.methodNotFoundResponse(forUnsupportedProtocolRequest: body) {
                Task { @MainActor in
                    await checkoutBridge.sendResponse(self, messageBody: response)
                }
            }
            return
        }

        if method == CheckoutProtocol.error.method {
            handleTerminalProtocolError(body)
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

    /// Delivers an `ec.error` payload to protocol subscribers, then ends the embedded session.
    ///
    /// Every `ec.error` is terminal regardless of its message severities. The first
    /// unrecoverable error message selects the stable lifecycle code; no qualifying message maps to
    /// `.unknown`. Malformed terminal payloads map to `.sdkError`.
    private func handleTerminalProtocolError(_ body: String, malformedEnvelope: Bool = false) {
        Task { @MainActor in
            let composedClient = ComposedCheckoutCommunicationClient(
                merchant: client,
                defaults: defaultClientBindings
            )
            if let response = await composedClient.process(body) {
                await checkoutBridge.sendResponse(self, messageBody: response)
            }

            guard !didReceiveTerminalProtocolError else { return }

            // `ec.error` denotes a terminal session error. Message severity selects the public
            // lifecycle code, but does not keep the embedded session alive.
            let failure = if !malformedEnvelope,
                             let notification = try? JSONDecoder().decode(
                                 TerminalErrorNotification.self,
                                 from: Data(body.utf8)
                             )
            {
                CheckoutError.terminalProtocol(error: notification.params.error)
            } else {
                CheckoutError.sdk(message: "Embedded checkout sent an invalid terminal error.")
            }

            let wasBackgroundedPreload = isPreloadBackgrounded
            handleCachedViewFailure(.protocolError)
            guard !wasBackgroundedPreload else { return }

            didReceiveTerminalProtocolError = true
            viewDelegate?.checkoutViewDidFailWithError(error: failure)
        }
    }

    private func isTerminalProtocolError(_ body: String) -> Bool {
        guard
            let data = body.data(using: .utf8),
            let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let method = envelope["method"] as? String
        else {
            return false
        }

        return method == CheckoutProtocol.error.method
    }
}

private struct TerminalErrorNotification: Decodable {
    let params: JSONRPCErrorParams
}

extension CheckoutWebView: WKNavigationDelegate {
    func webView(_: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
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
                OSLogger.shared.debug("Deep link intercepted: \(LogSafeURL.string(url)) - opened externally")
                return decisionHandler(.cancel)
            } else {
                OSLogger.shared.error("Deep link rejected: \(LogSafeURL.string(url)). If you're expecting this scheme, it must be listed under LSApplicationSchemeQueries in Info.plist.")
                return decisionHandler(.cancel)
            }
        }

        decisionHandler(.allow)
    }

    func webView(_: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping @MainActor @Sendable (WKNavigationResponsePolicy) -> Void) {
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
            handleCachedViewFailure(.httpError(statusCode: statusCode))

            OSLogger.shared.debug("Handling response for URL: \(LogSafeURL.string(response.url)), status code: \(statusCode)")

            viewDelegate?.checkoutViewDidFailWithError(
                error: CheckoutError.http(statusCode: statusCode, message: errorMessageForStatusCode)
            )

            return .cancel
        }

        return .allow
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation _: WKNavigation!) {
        let url = LogSafeURL.string(webView.url)
        OSLogger.shared.info("Started provisional navigation - url:\(url)")
        timer = Date()
        viewDelegate?.checkoutViewDidStartNavigation()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        timer = nil

        let nsError = error as NSError
        let url = LogSafeURL.string(webView.url)

        if isCancelledNavigationError(nsError) {
            OSLogger.shared.debug("Ignoring cancelled provisional navigation - url:\(url)")
            return
        }

        guard navigation === checkoutNavigation,
              !didRetryCheckoutNavigation,
              isRetryableProvisionalNavigationError(nsError),
              let checkoutRequest
        else {
            OSLogger.shared.error("Provisional navigation failed - domain:\(nsError.domain) code:\(nsError.code) url:\(url)")
            failNavigation(with: error)
            return
        }

        didRetryCheckoutNavigation = true
        OSLogger.shared.warn("Retrying checkout navigation - domain:\(nsError.domain) code:\(nsError.code) url:\(url)")

        guard let retryNavigation = load(checkoutRequest) else {
            OSLogger.shared.error("Checkout navigation retry failed to start - domain:\(nsError.domain) code:\(nsError.code) url:\(url)")
            failNavigation(with: error)
            return
        }

        checkoutNavigation = retryNavigation
    }

    func webView(_: WKWebView, didFinish navigation: WKNavigation!) {
        markPreloadReadyIfActive()

        viewDelegate?.checkoutViewDidFinishNavigation()

        if let startTime = timer {
            let endTime = Date()
            let diff = endTime.timeIntervalSince(startTime)
            let message = "Loaded checkout in \(String(format: "%.2f", diff))s"

            ShopifyCheckoutKit.configuration.logger.log(message)
        }
        timer = nil

        if navigation === checkoutNavigation {
            resetProvisionalNavigationRetryState()
        }
    }

    func webView(_ webView: WKWebView, didFail _: WKNavigation!, withError error: Error) {
        timer = nil

        let nsError = error as NSError

        if isCancelledNavigationError(nsError) {
            OSLogger.shared.debug("Ignoring cancelled committed navigation - code:NSURLErrorCancelled")
            return
        }

        let url = LogSafeURL.string(webView.url)
        OSLogger.shared.error("Committed navigation failed - domain:\(nsError.domain) code:\(nsError.code) url:\(url)")
        failNavigation(with: error)
    }

    private func isRetryableProvisionalNavigationError(_ error: NSError) -> Bool {
        guard error.domain == NSURLErrorDomain else {
            return false
        }

        let retryableErrorCodes = [
            NSURLErrorTimedOut,
            NSURLErrorNetworkConnectionLost,
            NSURLErrorCannotConnectToHost,
            NSURLErrorDNSLookupFailed
        ]

        return retryableErrorCodes.contains(error.code)
    }

    private func isCancelledNavigationError(_ error: NSError) -> Bool {
        return error.domain == NSURLErrorDomain && error.code == NSURLErrorCancelled
    }

    private func resetProvisionalNavigationRetryState() {
        checkoutRequest = nil
        checkoutNavigation = nil
        didRetryCheckoutNavigation = false
    }

    private func failNavigation(with error: Error) {
        resetProvisionalNavigationRetryState()
        handleCachedViewFailure(.navigationFailed)
        let failure = isRetryableProvisionalNavigationError(error as NSError)
            ? CheckoutError.network(message: error.localizedDescription, underlyingError: error)
            : CheckoutError.unknown(message: error.localizedDescription, underlyingError: error)
        viewDelegate?.checkoutViewDidFailWithError(error: failure)
    }

    private func isCheckout(url: URL?) -> Bool {
        return self.url == url
    }
}
