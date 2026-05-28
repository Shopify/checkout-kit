@testable import ShopifyCheckoutKit
import ShopifyCheckoutProtocol
import WebKit
import XCTest

@MainActor
class CheckoutWebViewTests: XCTestCase {
    private var view: CheckoutWebView!
    private var mockDelegate: MockCheckoutWebViewDelegate!
    private var url = URL(string: "http://shopify1.shopify.com/checkouts/cn/123")!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        CheckoutWebView.invalidate()
        view = CheckoutWebView.for(checkout: url)
        mockDelegate = MockCheckoutWebViewDelegate()
        view.viewDelegate = mockDelegate
        view.checkoutBridge = MockCheckoutBridge.self
        MockCheckoutBridge.reset()
    }

    override func tearDown() async throws {
        view.viewDelegate = nil
        CheckoutWebView.invalidate()
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        try await super.tearDown()
    }

    func testCorrectlyConfiguresWebview() {
        XCTAssertEqual(view.configuration.applicationNameForUserAgent, CheckoutBridge.applicationName)
        XCTAssertTrue(view.configuration.allowsInlineMediaPlayback)
    }

    func testImplementsWKNavigationDelegatePolicySelectors() {
        let navigationActionSelector = NSSelectorFromString("webView:decidePolicyForNavigationAction:decisionHandler:")
        let navigationResponseSelector = NSSelectorFromString("webView:decidePolicyForNavigationResponse:decisionHandler:")

        XCTAssertTrue(view.responds(to: navigationActionSelector))
        XCTAssertTrue(view.responds(to: navigationResponseSelector))
    }

    func testDetachBridgeIsIdempotent() {
        XCTAssertTrue(view.isBridgeAttached)

        view.detachBridge()
        view.detachBridge()

        XCTAssertFalse(view.isBridgeAttached)
    }

    func testHTTPSLinkIsAllowed() throws {
        let link = try XCTUnwrap(URL(string: "https://www.shopify.com/legal/privacy/app-users"))
        let received = expectation(description: "policy decided")

        view.webView(view, decidePolicyFor: MockExternalNavigationAction(url: link)) { policy in
            XCTAssertEqual(policy, .allow)
            received.fulfill()
        }

        wait(for: [received], timeout: 2.0)
    }

    func testDeepLinkIsCancelledAfterAttemptingUIApplicationOpen() throws {
        let link = try XCTUnwrap(URL(string: "unhandled-scheme://nowhere"))
        let received = expectation(description: "policy decided")

        view.webView(view, decidePolicyFor: MockExternalNavigationAction(url: link)) { policy in
            XCTAssertEqual(policy, .cancel, "Deep link navigation should not continue in the checkout WebView")
            received.fulfill()
        }

        wait(for: [received], timeout: 2.0)
    }

    func testDeepLinkIsCancelledAndOpenedExternallyWhenUIApplicationCanOpen() throws {
        let link = try XCTUnwrap(URL(string: "tel:+15555551234"))
        var openedURL: URL?
        view.canOpenExternalURL = { _ in true }
        view.openExternalURL = { openedURL = $0 }
        let received = expectation(description: "policy decided")

        view.webView(view, decidePolicyFor: MockExternalNavigationAction(url: link)) { policy in
            XCTAssertEqual(policy, .cancel, "An externally opened deep link must not also navigate the webview")
            received.fulfill()
        }

        wait(for: [received], timeout: 2.0)
        XCTAssertEqual(openedURL, link, "The deep link should be opened via UIApplication exactly once")
    }

    func testHTTPSubframeRequestIsAllowed() throws {
        let link = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))
        let received = expectation(description: "policy decided")

        view.webView(view, decidePolicyFor: MockNavigationAction(url: link)) { policy in
            XCTAssertEqual(policy, .allow)
            received.fulfill()
        }

        wait(for: [received], timeout: 2.0)
    }

    func test403responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 403, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        switch mockDelegate.errorReceived {
        case let .some(.checkoutUnavailable(message, _)):
            XCTAssertEqual(message, "forbidden")
        default:
            XCTFail("Unhandled error case received")
        }
    }

    func test401responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 401, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        switch mockDelegate.errorReceived {
        case let .some(.checkoutUnavailable(message, _)):
            XCTAssertEqual(message, "unauthorized")
        default:
            XCTFail("Unhandled error case received")
        }
    }

    func test404responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 404, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        switch mockDelegate.errorReceived {
        case let .some(.checkoutUnavailable(message, _)):
            XCTAssertEqual(message, "not found")
        default:
            XCTFail("Unhandled error case received")
        }
    }

    func test410responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 410, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        switch mockDelegate.errorReceived {
        case let .some(.checkoutExpired(message, _)):
            XCTAssertEqual(message, "Checkout has expired.")
        default:
            XCTFail("Unhandled error case received")
        }
    }

    func test5XXResponsesEmitCheckoutUnavailable() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        view.viewDelegate = mockDelegate

        for statusCode in 500 ... 510 {
            let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called for status code \(statusCode)")
            mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation

            let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: statusCode, httpVersion: nil, headerFields: nil))

            let policy = view.handleResponse(urlResponse)
            XCTAssertEqual(policy, .cancel, "Policy should be .cancel for status code \(statusCode)")

            wait(for: [didFailWithErrorExpectation], timeout: 3)
            guard let receivedError = mockDelegate.errorReceived else {
                XCTFail("Expected to receive a `CheckoutError` for status code \(statusCode)")
                return
            }

            switch receivedError {
            case let .checkoutUnavailable(_, code):
                if case let .httpError(received) = code {
                    XCTAssertEqual(received, statusCode)
                } else {
                    XCTFail("Expected httpError code for status \(statusCode)")
                }
            default:
                XCTFail("Received incorrect `CheckoutError` case for status code \(statusCode)")
            }

            mockDelegate.didFailWithErrorExpectation = nil
            mockDelegate.errorReceived = nil
        }
    }

    func testNormalresponseOnNonCheckoutURLCodeDelegation() throws {
        let link = try XCTUnwrap(URL(string: "http://shopify.com/resource_url"))
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was not called")
        didFailWithErrorExpectation.isInverted = true

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 410, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .allow)

        waitForExpectations(timeout: 0.5, handler: nil)
    }

    func testForReturnsNewWebView() throws {
        let url = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let firstView = CheckoutWebView.for(checkout: url)
        let secondView = CheckoutWebView.for(checkout: url)

        XCTAssertNotEqual(firstView, secondView)
        XCTAssertTrue(firstView.isBridgeAttached)
        XCTAssertTrue(secondView.isBridgeAttached)
    }

    func testPreloadLoadsWithShopifyPurposeHeader() {
        let webView = LoadedRequestObservableWebView()

        webView.load(checkout: url, isPreload: true)

        XCTAssertEqual(webView.lastLoadedURLRequest?.value(forHTTPHeaderField: "Shopify-Purpose"), "prefetch")
        XCTAssertTrue(webView.isPreloadRequest)
    }

    func testNormalLoadDoesNotUsePreloadHeader() {
        let webView = LoadedRequestObservableWebView()

        webView.load(checkout: url)

        XCTAssertNil(webView.lastLoadedURLRequest?.value(forHTTPHeaderField: "Shopify-Purpose"))
        XCTAssertFalse(webView.isPreloadRequest)
    }

    func testPreloadDoesNotUseHeaderWhenPreloadingDisabled() {
        ShopifyCheckoutKit.configuration.preloading.enabled = false
        let webView = LoadedRequestObservableWebView()

        webView.load(checkout: url, isPreload: true)

        XCTAssertNil(webView.lastLoadedURLRequest?.value(forHTTPHeaderField: "Shopify-Purpose"))
        XCTAssertFalse(webView.isPreloadRequest)
    }

    func testPreloadCachesWebViewForMatchingPresent() {
        ShopifyCheckoutKit.preload(checkout: url)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertTrue(CheckoutWebView.preloadCache.hasActiveKeepAlive())

        let cached = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url, options: .init(delegations: CheckoutProtocol.defaultDelegations)))

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertFalse(CheckoutWebView.preloadCache.hasActiveKeepAlive())
        XCTAssertNil(cached.superview)
        XCTAssertNotNil(cached.url)
    }

    func testRepeatedPreloadForMatchingCheckoutDoesNotReloadCachedWebView() {
        let webView = LoadedRequestObservableWebView()
        let checkoutURL = EmbeddedCheckoutProtocol.url(for: url)
        _ = CheckoutWebView.preloadCache.store(webView, for: PreloadKey(url: checkoutURL, entryPoint: nil))

        CheckoutWebView.preload(checkout: checkoutURL)

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertNil(webView.lastLoadedURLRequest)
    }

    func testPresentingMatchingCheckoutReusesCachedWebViewWithoutEvictingIt() {
        ShopifyCheckoutKit.preload(checkout: url)
        let first = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url, options: .init(delegations: CheckoutProtocol.defaultDelegations)))
        let second = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url, options: .init(delegations: CheckoutProtocol.defaultDelegations)))

        XCTAssertTrue(first === second)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func testPresentWithDifferentURLDoesNotReusePreloadedWebView() throws {
        ShopifyCheckoutKit.preload(checkout: url)
        let otherURL = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/456"))

        let fresh = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: otherURL))

        XCTAssertNil(fresh.url)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertFalse(CheckoutWebView.preloadCache.hasActiveKeepAlive())
    }

    func testPresentWithDifferentEntryPointDoesNotReusePreloadedWebView() {
        CheckoutWebView.preload(checkout: EmbeddedCheckoutProtocol.url(for: url), entryPoint: .acceleratedCheckouts)

        let fresh = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url), entryPoint: nil)

        XCTAssertNil(fresh.url)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertFalse(CheckoutWebView.preloadCache.hasActiveKeepAlive())
    }

    func testInvalidateClearsPreloadCache() {
        ShopifyCheckoutKit.preload(checkout: url)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertTrue(CheckoutWebView.preloadCache.hasActiveKeepAlive())

        ShopifyCheckoutKit.invalidate()

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertFalse(CheckoutWebView.preloadCache.hasActiveKeepAlive())
    }

    func testStalePreloadCacheIsRejectedImmediately() {
        let staleCreatedAt = Date(timeIntervalSinceNow: -6 * 60)
        CheckoutWebView.preload(checkout: EmbeddedCheckoutProtocol.url(for: url), createdAt: staleCreatedAt)

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertFalse(CheckoutWebView.preloadCache.hasActiveKeepAlive())

        let fresh = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url))

        XCTAssertNil(fresh.url)
        XCTAssertTrue(fresh.isBridgeAttached)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertFalse(CheckoutWebView.preloadCache.hasActiveKeepAlive())
    }

    func testPreloadCacheExpiresAndStopsKeepAlive() {
        let nearlyStaleCreatedAt = Date(timeIntervalSinceNow: -(5 * 60 - 1))
        CheckoutWebView.preload(checkout: EmbeddedCheckoutProtocol.url(for: url), createdAt: nearlyStaleCreatedAt)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertTrue(CheckoutWebView.preloadCache.hasActiveKeepAlive())

        let expired = expectation(description: "preload cache expired")
        let deadline = Date(timeIntervalSinceNow: 3)
        func pollForExpiry() {
            if !CheckoutWebView.preloadCache.hasEntry(), !CheckoutWebView.preloadCache.hasActiveKeepAlive() {
                expired.fulfill()
            } else if Date() < deadline {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                    Task { @MainActor in
                        pollForExpiry()
                    }
                }
            }
        }

        pollForExpiry()

        wait(for: [expired], timeout: 3)
    }

    func testPreloadKeepAliveFailureInvalidatesCache() {
        let webView = ThrowingEvaluateJavaScriptWebView()
        _ = CheckoutWebView.preloadCache.store(webView, for: PreloadKey(url: EmbeddedCheckoutProtocol.url(for: url), entryPoint: nil))
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        XCTAssertTrue(CheckoutWebView.preloadCache.hasActiveKeepAlive())

        let invalidated = expectation(description: "preload cache invalidated")
        let deadline = Date(timeIntervalSinceNow: 2)
        func pollForInvalidation() {
            if !CheckoutWebView.preloadCache.hasEntry(), !CheckoutWebView.preloadCache.hasActiveKeepAlive() {
                invalidated.fulfill()
            } else if Date() < deadline {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                    Task { @MainActor in
                        pollForInvalidation()
                    }
                }
            }
        }

        pollForInvalidation()

        wait(for: [invalidated], timeout: 2)
    }

    func testInvalidateDetachesCachedPreloadedWebView() {
        ShopifyCheckoutKit.preload(checkout: url)
        let cached = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url, options: .init(delegations: CheckoutProtocol.defaultDelegations)))
        XCTAssertTrue(cached.isBridgeAttached)

        ShopifyCheckoutKit.invalidate()

        XCTAssertFalse(cached.isBridgeAttached)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testHTTPErrorInvalidatesPreloadCache() throws {
        ShopifyCheckoutKit.preload(checkout: url)
        let cached = CheckoutWebView.for(checkout: EmbeddedCheckoutProtocol.url(for: url, options: .init(delegations: CheckoutProtocol.defaultDelegations)))
        let link = try XCTUnwrap(cached.url)
        let response = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 403, httpVersion: nil, headerFields: nil))

        _ = cached.handleResponse(response)

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testCheckoutURLLogsRedactSensitiveValues() throws {
        let originalLogger = OSLogger.shared
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .all)
        OSLogger.shared = logger.logger
        defer { OSLogger.shared = originalLogger }

        let sensitiveURL = try XCTUnwrap(
            URL(
                string: "https://buyer:secret@shopify1.shopify.com/checkouts/cn/123?ec_version=2026-04-08&ec_auth=test-jwt-token&ec_delegate=payment.instruments_change&checkout[email]=buyer@example.com#fragment"
            )
        )

        view.load(checkout: sensitiveURL)

        let combinedLogs = logger.capturedMessages.map(\.message).joined(separator: "\n")
        XCTAssertFalse(combinedLogs.contains("secret"))
        XCTAssertFalse(combinedLogs.contains("test-jwt-token"))
        XCTAssertFalse(combinedLogs.contains("buyer@example.com"))
        XCTAssertFalse(combinedLogs.contains("fragment"))
        XCTAssertTrue(combinedLogs.contains("ec_auth=redacted"))
        XCTAssertTrue(combinedLogs.contains("checkout%5Bemail%5D=redacted"))
    }

    func testCheckoutURLLogsRedactKnownSensitiveQueryItemsAndKeepBenignItems() throws {
        let originalLogger = OSLogger.shared
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .all)
        OSLogger.shared = logger.logger
        defer { OSLogger.shared = originalLogger }

        let sensitiveURL = try XCTUnwrap(
            URL(
                string: "https://shopify1.shopify.com/checkouts/cn/123?token=checkout-token&key=checkout-key&multipass=customer-token&ec_auth=session-jwt&locale=en"
            )
        )

        view.load(checkout: sensitiveURL)

        let combinedLogs = logger.capturedMessages.map(\.message).joined(separator: "\n")
        XCTAssertFalse(combinedLogs.contains("checkout-token"))
        XCTAssertFalse(combinedLogs.contains("checkout-key"))
        XCTAssertFalse(combinedLogs.contains("customer-token"))
        XCTAssertFalse(combinedLogs.contains("session-jwt"))
        XCTAssertTrue(combinedLogs.contains("token=redacted"))
        XCTAssertTrue(combinedLogs.contains("key=redacted"))
        XCTAssertTrue(combinedLogs.contains("multipass=redacted"))
        XCTAssertTrue(combinedLogs.contains("ec_auth=redacted"))
        XCTAssertTrue(combinedLogs.contains("locale=en"))
    }

    func testWebViewDidFailWithError() throws {
        let url = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let view = CheckoutWebView.for(checkout: url)
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)

        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        view.webView(view, didFail: nil, withError: error)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        switch mockDelegate.errorReceived {
        case let .some(.sdkError(underlying)):
            let nsError = underlying as NSError
            XCTAssertEqual(nsError.domain, NSURLErrorDomain)
            XCTAssertEqual(nsError.code, NSURLErrorTimedOut)
        default:
            XCTFail("checkoutDidFail(.sdkError) expected to throw")
        }
    }

    func testWebViewDoesNotEmitDidFailForCancelledRedirect() throws {
        let url = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let view = CheckoutWebView.for(checkout: url)
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled, userInfo: nil)

        view.viewDelegate = mockDelegate
        view.webView(view, didFail: nil, withError: error)

        XCTAssertNil(mockDelegate.errorReceived)
    }

    func testClientIsSetOnWebView() {
        let client = MockBridgeClient()
        view.client = client
        XCTAssertNotNil(view.client)
    }

    // MARK: - ec.ready handshake

    @MainActor
    func testAcknowledgeReadyRespondsToReadyRequest() async throws {
        let id = "req-ready-1"
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"\#(id)","params":{"delegate":[]}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["jsonrpc"] as? String, "2.0")
        XCTAssertEqual(parsed["id"] as? String, id)
        XCTAssertNil(parsed["method"], "JSON-RPC responses must not carry a method field")
        XCTAssertNil(parsed["params"], "JSON-RPC responses must not carry a params field")
        let result = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(result["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "success")
        XCTAssertEqual(ucp["version"] as? String, EmbeddedCheckoutProtocol.specVersion)
    }

    @MainActor
    func testAcknowledgeReadyLogsPreloadState() {
        let originalLogger = OSLogger.shared
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .all)
        OSLogger.shared = logger.logger
        defer { OSLogger.shared = originalLogger }

        view.load(checkout: url, isPreload: true)
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        XCTAssertTrue(
            logger.capturedMessages.contains { captured in
                captured.message.contains("Handling ec.ready: sending UCP ready acknowledgement, isPreload: true")
            }
        )
    }

    @MainActor
    func testAcknowledgeReadyDoesNotInvokeClient() async {
        view.client = MockBridgeClient(responseMessage: "client-response")
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        let response = try? XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        XCTAssertNotEqual(response, "client-response")
    }

    func testNonReadyMessageDoesNotTriggerReadyAck() {
        let body = #"{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{"id":"c-1"}}}"#
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled, "ec.ready ack must not fire for non-ready methods")
    }

    func testNonStringMessageBodyIsIgnored() {
        let message = MockScriptMessage(body: 42)

        view.userContentController(WKUserContentController(), didReceive: message)

        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testUnsupportedProtocolRequestsReturnMethodNotFoundAndDoNotInvokeClient() async throws {
        let client = RecordingBridgeClient(response: #"{"jsonrpc":"2.0","id":"raw","result":{}}"#)
        view.client = client
        let responseSent = expectation(description: "method-not-found responses sent")
        responseSent.expectedFulfillmentCount = 3
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let messages = [
            (#"{"jsonrpc":"2.0","method":"ec.payment.credential_request","id":"unsupported","params":{}}"#, "unsupported"),
            (#"{"jsonrpc":"2.0","method":"ep.cart.ready","id":"ep","params":{}}"#, "ep"),
            (#"{"jsonrpc":"2.0","method":"customMethod","id":"custom","params":{}}"#, "custom")
        ]

        for (body, _) in messages {
            view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: body))
        }

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertEqual(MockCheckoutBridge.sendResponseCount, messages.count)
        let parsedResponses = try MockCheckoutBridge.responseBodies.map { response -> [String: Any] in
            try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        }
        XCTAssertEqual(parsedResponses.map { $0["id"] as? String }, messages.map { $0.1 })
        for parsed in parsedResponses {
            let error = try XCTUnwrap(parsed["error"] as? [String: Any])
            XCTAssertEqual(error["code"] as? Int, -32601)
            XCTAssertEqual(error["message"] as? String, "Method not found")
        }
        let receivedMessages = await client.messages()
        XCTAssertEqual(receivedMessages, [])
    }

    @MainActor
    func testUnsupportedProtocolNotificationsDoNotInvokeClient() async {
        let client = RecordingBridgeClient(response: #"{"jsonrpc":"2.0","id":"raw","result":{}}"#)
        view.client = client
        let notSent = expectation(description: "sendResponse must not fire")
        notSent.isInverted = true
        MockCheckoutBridge.sendResponseExpectation = notSent
        let messages = [
            #"{"jsonrpc":"2.0","method":"ec.payment.credential_request","params":{}}"#,
            #"{"jsonrpc":"2.0","method":"ep.cart.ready","params":{}}"#,
            #"{"jsonrpc":"2.0","method":"customMethod","params":{}}"#
        ]

        for body in messages {
            view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: body))
        }

        await fulfillment(of: [notSent], timeout: 1.0)
        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled)
        let receivedMessages = await client.messages()
        XCTAssertEqual(receivedMessages, [])
    }

    @MainActor
    func testReadyAckFiresWhenNoClientIsAttached() async {
        view.client = nil
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testMalformedReadyParamsReturnParseError() async throws {
        view.client = MockBridgeClient(responseMessage: "client-response")
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"ready-bad","params":{"delegate":[null]}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        XCTAssertNotEqual(response, "client-response")
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, "ready-bad")
        let error = try XCTUnwrap(parsed["error"] as? [String: Any])
        XCTAssertEqual(error["code"] as? Int, -32700)
        XCTAssertEqual(error["message"] as? String, "Parse error")
    }

    @MainActor
    func testSupportedRequestUsesRawClientResponse() async {
        let id = "req-window-raw"
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"\#(id)","params":{"url":"https://example.com/terms"}}"#
        let rawResponse = #"{"jsonrpc":"2.0","id":"\#(id)","result":{"data":"ok"}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let client = RecordingBridgeClient(response: rawResponse)
        view.client = client

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: body))

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertEqual(MockCheckoutBridge.lastResponseBody, rawResponse)
        let receivedMessages = await client.messages()
        XCTAssertEqual(receivedMessages, [body])
    }

    @MainActor
    func testWindowOpenRequestUsesConsumerOverride() async throws {
        let id = "req-window-1"
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"\#(id)","params":{"url":"https://example.com/terms"}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        view.client = EmbeddedCheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { _ in
                .rejected(reason: "consumer override")
            }
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, id)
        let resultBody = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(resultBody["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "error")
        let messages = try XCTUnwrap(resultBody["messages"] as? [[String: Any]])
        XCTAssertEqual(messages.first?["content"] as? String, "consumer override")
        XCTAssertEqual(messages.first?["code"] as? String, "window_open_rejected_error")
        XCTAssertEqual(MockCheckoutBridge.sendResponseCount, 1)
    }

    @MainActor
    func testDefaultsClientOpensNonWebSchemeWithExternalURLHandler() async throws {
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"req-window-1","params":{"url":"unhandled-scheme://nowhere"}}"#
        let externalURLHandler = MockExternalURLHandler(didOpen: true)
        view.externalURLHandler = externalURLHandler

        let raw = await view.defaultsClient.process(body)
        let response = try XCTUnwrap(raw)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, "req-window-1")
        let resultBody = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(resultBody["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "success")
        XCTAssertEqual(externalURLHandler.openedURL?.absoluteString, "unhandled-scheme://nowhere")
    }

    @MainActor
    func testDefaultsClientRejectsWhenExternalURLHandlerCannotOpenNonWebScheme() async throws {
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"req-window-1","params":{"url":"unhandled-scheme://nowhere"}}"#
        view.externalURLHandler = MockExternalURLHandler(didOpen: false)

        let raw = await view.defaultsClient.process(body)
        let response = try XCTUnwrap(raw)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        let resultBody = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(resultBody["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "error")
        let messages = try XCTUnwrap(resultBody["messages"] as? [[String: Any]])
        XCTAssertEqual(messages.first?["content"] as? String, "UIApplication.open returned false")
    }

    @MainActor
    func testWindowOpenRequestReturnsInvalidParamsForMalformedBody() async throws {
        view.client = nil
        let responseSent = expectation(description: "sendResponse fires")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"r","params":{}}"#)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 1.0)
        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, "r")
        let error = try XCTUnwrap(parsed["error"] as? [String: Any])
        XCTAssertEqual(error["code"] as? Int, -32602)
        XCTAssertEqual(error["message"] as? String, "Invalid params")
    }

    // MARK: - ec.error severity-based dismissal

    /// Builds a minimal valid `ec.error` payload with the given severity. `ErrorResponse`
    /// requires both `messages` and `ucp` to decode — Codec routes it via the typed
    /// `params.error` field, so missing fields would make the message decode to `.unknown`
    /// and bypass the handler entirely.
    private func ecErrorBody(severity: String) -> String {
        return """
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"status":"error","version":"\(EmbeddedCheckoutProtocol.specVersion)"},"messages":[{"type":"error","code":"session_failed","content":"Session failed","severity":"\(severity)"}]}}}
        """
    }

    @MainActor
    func testEcErrorWithUnrecoverableSeverityDismissesViaDelegate() async {
        let dismissed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = dismissed
        view.client = nil
        let message = MockScriptMessage(body: ecErrorBody(severity: "unrecoverable"))

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [dismissed], timeout: 2.0)
        let error = try? XCTUnwrap(mockDelegate.errorReceived)
        guard case let .checkoutUnavailable(message, _) = error else {
            return XCTFail("Expected checkoutUnavailable error")
        }
        XCTAssertEqual(message, "Embedded checkout reported unrecoverable error.")
    }

    @MainActor
    func testEcErrorWithRecoverableSeverityDoesNotDismiss() async {
        let notDismissed = expectation(description: "viewDelegate must not receive failure")
        notDismissed.isInverted = true
        mockDelegate.didFailWithErrorExpectation = notDismissed
        view.client = nil
        let message = MockScriptMessage(body: ecErrorBody(severity: "recoverable"))

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [notDismissed], timeout: 1.0)
        XCTAssertNil(mockDelegate.errorReceived)
    }

    @MainActor
    func testEcErrorWithRequiresBuyerInputSeverityDoesNotDismiss() async {
        let notDismissed = expectation(description: "viewDelegate must not receive failure")
        notDismissed.isInverted = true
        mockDelegate.didFailWithErrorExpectation = notDismissed
        view.client = nil
        let message = MockScriptMessage(body: ecErrorBody(severity: "requires_buyer_input"))

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [notDismissed], timeout: 1.0)
        XCTAssertNil(mockDelegate.errorReceived)
    }

    @MainActor
    func testEcErrorWithRequiresBuyerReviewSeverityDoesNotDismiss() async {
        let notDismissed = expectation(description: "viewDelegate must not receive failure")
        notDismissed.isInverted = true
        mockDelegate.didFailWithErrorExpectation = notDismissed
        view.client = nil
        let message = MockScriptMessage(body: ecErrorBody(severity: "requires_buyer_review"))

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [notDismissed], timeout: 1.0)
        XCTAssertNil(mockDelegate.errorReceived)
    }

    @MainActor
    func testEcErrorStillForwardsToConsumerClient() async {
        let consumerHandlerFired = expectation(description: "consumer handler fired")
        let dismissed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = dismissed
        view.client = EmbeddedCheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { _ in
                consumerHandlerFired.fulfill()
            }
        let message = MockScriptMessage(body: ecErrorBody(severity: "unrecoverable"))

        view.userContentController(WKUserContentController(), didReceive: message)

        // Consumer handler runs first (via `view.client?.process(body)`), then the
        // defaultsClient handler runs and dismisses. Both must fire.
        await fulfillment(of: [consumerHandlerFired, dismissed], timeout: 2.0, enforceOrder: true)
    }

    @MainActor
    func testEcErrorDismissesEvenWhenConsumerClientReturnsResponse() async {
        let responseSent = expectation(description: "consumer response sent")
        let dismissed = expectation(description: "viewDelegate received failure")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        mockDelegate.didFailWithErrorExpectation = dismissed
        view.client = MockBridgeClient(responseMessage: #"{"jsonrpc":"2.0","id":"consumer","result":{}}"#)
        let message = MockScriptMessage(body: ecErrorBody(severity: "unrecoverable"))

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent, dismissed], timeout: 5.0)
        guard case .checkoutUnavailable = mockDelegate.errorReceived else {
            return XCTFail("Expected checkoutUnavailable error")
        }
    }
}

private actor RecordingBridgeClient: CheckoutCommunicationProtocol {
    let response: String?
    private var receivedMessages: [String] = []

    init(response: String? = nil) {
        self.response = response
    }

    func messages() -> [String] {
        receivedMessages
    }

    func process(_ message: String) async -> String? {
        receivedMessages.append(message)
        return response
    }
}

@MainActor
class LoadedRequestObservableWebView: CheckoutWebView {
    var lastLoadedURLRequest: URLRequest?

    override func load(_ request: URLRequest) -> WKNavigation? {
        lastLoadedURLRequest = request
        return nil
    }
}

@MainActor
class ThrowingEvaluateJavaScriptWebView: CheckoutWebView {
    override func evaluateJavaScript(_: String) async throws -> Any {
        throw NSError(domain: "ThrowingEvaluateJavaScriptWebView", code: 1)
    }
}

@MainActor
class MockCheckoutBridge: CheckoutBridgeProtocol {
    static var sendResponseCalled = false
    static var sendResponseCount = 0
    static var lastResponseBody: String?
    static var responseBodies: [String] = []
    static var sendResponseExpectation: XCTestExpectation?

    static func reset() {
        sendResponseCalled = false
        sendResponseCount = 0
        lastResponseBody = nil
        responseBodies = []
        sendResponseExpectation = nil
    }

    @MainActor static func sendResponse(_: WKWebView, messageBody: String) async -> Bool {
        sendResponseCalled = true
        sendResponseCount += 1
        lastResponseBody = messageBody
        responseBodies.append(messageBody)
        sendResponseExpectation?.fulfill()
        return true
    }
}

final class MockExternalURLHandler: ExternalURLHandling {
    let didOpen: Bool
    private(set) var openedURL: URL?

    init(didOpen: Bool) {
        self.didOpen = didOpen
    }

    @MainActor
    func open(_ url: URL) async -> Bool {
        openedURL = url
        return didOpen
    }
}
