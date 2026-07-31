import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class CheckoutWebViewTests: XCTestCase {
    private var view: CheckoutWebView!
    private var mockDelegate: MockCheckoutWebViewDelegate!
    private var url = URL(string: "https://shopify1.shopify.com/checkouts/cn/123")!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        CheckoutWebView.invalidate()
        view = CheckoutWebView.for(checkout: url)
        mockDelegate = MockCheckoutWebViewDelegate()
        view.viewDelegate = mockDelegate
        view.checkoutBridge = MockCheckoutBridge.self
        view.messageIsMainFrame = { _ in true }
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

    func testDeepLinkIsCancelledWhenUIApplicationCannotOpen() throws {
        let link = try XCTUnwrap(URL(string: "unhandled-scheme://nowhere"))
        let received = expectation(description: "policy decided")

        view.webView(view, decidePolicyFor: MockExternalNavigationAction(url: link)) { policy in
            XCTAssertEqual(policy, .cancel, "Schemes that canOpenURL refuses should be cancelled")
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

    func testInitialHTTPCheckoutLoadIsRejected() throws {
        let insecureURL = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let didFail = expectation(description: "checkout failure reported")
        mockDelegate.didFailWithErrorExpectation = didFail

        view.load(checkout: insecureURL)

        wait(for: [didFail], timeout: 2.0)
        guard case let .sdkError(underlying) = mockDelegate.errorReceived else {
            return XCTFail("Expected sdkError")
        }
        XCTAssertTrue(underlying.localizedDescription.contains("requires an HTTPS URL"))
    }

    func testMainFrameHTTPRedirectIsRejected() throws {
        let insecureURL = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let policyDecided = expectation(description: "policy decided")
        let didFail = expectation(description: "checkout failure reported")
        mockDelegate.didFailWithErrorExpectation = didFail
        view.navigationIsMainFrame = { _ in true }

        view.webView(view, decidePolicyFor: MockNavigationAction(url: insecureURL)) { policy in
            XCTAssertEqual(policy, .cancel)
            policyDecided.fulfill()
        }

        wait(for: [policyDecided, didFail], timeout: 2.0)
    }

    func test403responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 403, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .httpError)
        XCTAssertEqual(error.message, "forbidden")
        XCTAssertEqual(error.httpStatusCode, 403)
    }

    func test401responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 401, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .httpError)
        XCTAssertEqual(error.message, "unauthorized")
        XCTAssertEqual(error.httpStatusCode, 401)
    }

    func test404responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 404, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .httpError)
        XCTAssertEqual(error.message, "not found")
        XCTAssertEqual(error.httpStatusCode, 404)
    }

    func test410responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 410, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .cartExpired)
        XCTAssertEqual(error.message, HTTPURLResponse.localizedString(forStatusCode: 410))
        XCTAssertEqual(error.httpStatusCode, 410)
    }

    func test5XXResponsesEmitHTTPError() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123")))
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

            XCTAssertEqual(receivedError.code, .httpError)
            XCTAssertEqual(receivedError.httpStatusCode, statusCode)

            mockDelegate.didFailWithErrorExpectation = nil
            mockDelegate.errorReceived = nil
        }
    }

    func testNormalresponseOnNonCheckoutURLCodeDelegation() throws {
        let link = try XCTUnwrap(URL(string: "https://shopify.com/resource_url"))
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
        let url = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))
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

        let cached = CheckoutWebView.for(checkout: CheckoutURLDecorator.decorate(url))

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
        let first = CheckoutWebView.for(checkout: CheckoutURLDecorator.decorate(url))
        let second = CheckoutWebView.for(checkout: CheckoutURLDecorator.decorate(url))

        XCTAssertTrue(first === second)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func testPresentWithDifferentURLDoesNotReusePreloadedWebView() throws {
        ShopifyCheckoutKit.preload(checkout: url)
        let otherURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/456"))

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
        let cached = CheckoutWebView.for(checkout: CheckoutURLDecorator.decorate(url))
        XCTAssertTrue(cached.isBridgeAttached)

        ShopifyCheckoutKit.invalidate()

        XCTAssertFalse(cached.isBridgeAttached)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testHTTPErrorInvalidatesPreloadCache() throws {
        ShopifyCheckoutKit.preload(checkout: url)
        let cached = CheckoutWebView.for(checkout: CheckoutURLDecorator.decorate(url))
        let link = try XCTUnwrap(cached.url)
        let response = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 403, httpVersion: nil, headerFields: nil))

        _ = cached.handleResponse(response)

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testCheckoutURLLogsRedactSensitiveValues() throws {
        let originalLogger = OSLogger.shared
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .debug)
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
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .debug)
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
        let url = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))
        let view = CheckoutWebView.for(checkout: url)
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)

        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        view.webView(view, didFail: nil, withError: error)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        let receivedError = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(receivedError.code, .networkError)
        let nsError = try XCTUnwrap(receivedError.underlyingError as NSError?)
        XCTAssertEqual(nsError.domain, NSURLErrorDomain)
        XCTAssertEqual(nsError.code, NSURLErrorTimedOut)
    }

    func testWebViewDidFailWithNonretryableError() throws {
        let url = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let view = CheckoutWebView.for(checkout: url)
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorBadURL, userInfo: nil)

        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")
        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        view.webView(view, didFail: nil, withError: error)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
        let receivedError = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(receivedError.code, .unknown)
        XCTAssertEqual(receivedError.underlyingError as NSError?, error)
    }

    func testWebContentProcessTerminationEmitsLifecycleFailure() throws {
        view.webViewWebContentProcessDidTerminate(view)

        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .webContentProcessTerminated)
        XCTAssertEqual(error.message, "Web content process terminated.")
        XCTAssertNil(error.underlyingError)
    }

    func testWebViewDoesNotEmitDidFailForCancelledRedirect() throws {
        let url = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))
        let view = CheckoutWebView.for(checkout: url)
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled, userInfo: nil)

        view.viewDelegate = mockDelegate
        view.webView(view, didFail: nil, withError: error)

        XCTAssertNil(mockDelegate.errorReceived)
    }

    func testWebViewRetriesRetryableInitialProvisionalFailureOnce() throws {
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)
        view.load(checkout: url)
        let initialNavigation = try XCTUnwrap(view.checkoutNavigation)

        view.webView(view, didFailProvisionalNavigation: initialNavigation, withError: error)

        let retryNavigation = try XCTUnwrap(view.checkoutNavigation)
        XCTAssertFalse(retryNavigation === initialNavigation)
        XCTAssertNil(mockDelegate.errorReceived)

        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")
        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation

        view.webView(view, didFailProvisionalNavigation: retryNavigation, withError: error)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
    }

    func testWebViewFailsWhenRetryLoadDoesNotReturnNavigation() throws {
        let retryView = RetryLoadReturningNilWebView()
        retryView.viewDelegate = mockDelegate
        retryView.load(checkout: url)
        let initialNavigation = try XCTUnwrap(retryView.checkoutNavigation)
        retryView.shouldReturnNil = true

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")
        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation

        retryView.webView(retryView, didFailProvisionalNavigation: initialNavigation, withError: error)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
    }

    func testWebViewDoesNotRetryCancelledProvisionalNavigation() throws {
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled, userInfo: nil)
        view.load(checkout: url)
        let navigation = try XCTUnwrap(view.checkoutNavigation)

        view.webView(view, didFailProvisionalNavigation: navigation, withError: error)

        XCTAssertNil(mockDelegate.errorReceived)
    }

    func testWebViewDoesNotRetryNonTransientProvisionalFailure() throws {
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorServerCertificateHasBadDate, userInfo: nil)
        view.load(checkout: url)
        let navigation = try XCTUnwrap(view.checkoutNavigation)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")
        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation

        view.webView(view, didFailProvisionalNavigation: navigation, withError: error)

        wait(for: [didFailWithErrorExpectation], timeout: 5)
    }

    func testPreloadStaysLoadingDuringRetryThenFailsAfterRetryExhausted() throws {
        view.load(checkout: url)
        let initialNavigation = try XCTUnwrap(view.checkoutNavigation)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: EmbeddedCheckoutProtocol.url(for: url), entryPoint: nil))
        XCTAssertEqual(CheckoutWebView.preloadCache.state, .loading)

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)
        view.webView(view, didFailProvisionalNavigation: initialNavigation, withError: error)

        let retryNavigation = try XCTUnwrap(view.checkoutNavigation)
        XCTAssertFalse(retryNavigation === initialNavigation)
        XCTAssertEqual(CheckoutWebView.preloadCache.state, .loading)

        view.webView(view, didFailProvisionalNavigation: retryNavigation, withError: error)

        XCTAssertEqual(CheckoutWebView.preloadCache.state, .failed(reason: .navigationFailed))
    }

    func testClientIsSetOnWebView() {
        let client = MockBridgeClient()
        view.client = client
        XCTAssertNotNil(view.client)
    }

    // MARK: - ec.ready handshake

    @MainActor
    func testReadyHandshakeRespondsWithUCPEnvelope() async throws {
        let id = "req-ready-1"
        let body =
            #"{"jsonrpc":"2.0","method":"ec.ready","id":"\#(id)","params":{"delegate":["window.open","payment.credential"]}}"#
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
        XCTAssertNil(result["delegate"], "Ready response no longer echoes a delegate list; delegations are announced via the ec_delegate URL param")
    }

    @MainActor
    func testReadyIsNotOverridableByMerchantClient() async throws {
        view.client = MockBridgeClient(
            responseMessage: #"{"jsonrpc":"2.0","id":"r1","result":{"hijacked":true}}"#
        )
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, "r1")
        let result = try XCTUnwrap(parsed["result"] as? [String: Any])
        XCTAssertNil(result["hijacked"], "Merchant client must not be able to answer ec.ready")
        let ucp = try XCTUnwrap(result["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "success")
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
    func testMalformedReadyParamsReturnInvalidParams() async throws {
        view.client = MockBridgeClient()
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"ready-bad","params":{"delegate":[null]}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)

        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, "ready-bad")
        let error = try XCTUnwrap(parsed["error"] as? [String: Any])
        XCTAssertEqual(error["code"] as? Int, -32602)
        XCTAssertEqual(error["message"] as? String, "Invalid params")
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
    func testDefaultsClientRejectsUnopenableScheme() async throws {
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"req-window-1","params":{"url":"unhandled-scheme://nowhere"}}"#

        let raw = await view.defaultsClient.process(body)
        let response = try XCTUnwrap(raw)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, "req-window-1")
        let resultBody = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(resultBody["ucp"] as? [String: Any])
        XCTAssertEqual(
            ucp["status"] as? String,
            "error",
            "Default handler should reject schemes that canOpenURL refuses"
        )
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

    @MainActor
    func testDefaultsClientLogsDecodeErrorForMalformedSupportedMessage() async {
        let originalLogger = OSLogger.shared
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .debug)
        OSLogger.shared = logger.logger
        defer { OSLogger.shared = originalLogger }

        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"req-window-1","params":{}}"#

        _ = await view.defaultsClient.process(body)

        let errorLogs = logger.capturedMessages
            .filter { $0.type == .error }
            .map(\.message)
            .joined(separator: "\n")
        XCTAssertTrue(errorLogs.contains("ec.window.open_request"))
    }

    // MARK: - ec.error lifecycle failure

    private func ecErrorBody(messages: String = #"[{"type":"error","code":"invalid_cart","content":"Cart is invalid","severity":"unrecoverable"}]"#) -> String {
        """
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"status":"error","version":"\(EmbeddedCheckoutProtocol.specVersion)"},"messages":\(messages)}}}
        """
    }

    func testEcErrorDeliversMappedLifecycleFailure() async throws {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: ecErrorBody()))

        await fulfillment(of: [failed], timeout: 2.0)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .invalidCart)
        XCTAssertEqual(error.message, "Cart is invalid")
    }

    func testMalformedEcErrorEnvelopeDeliversSDKError() async throws {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed
        let body = """
        {"jsonrpc":2,"method":"ec.error","params":{"error":{"ucp":{"status":"error","version":"\(EmbeddedCheckoutProtocol.specVersion)"},"messages":[]}}}
        """

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: body))

        await fulfillment(of: [failed], timeout: 2.0)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .sdkError)
        XCTAssertEqual(error.message, "Embedded checkout sent an invalid terminal error.")
    }

    func testMalformedEcErrorPayloadDeliversSDKError() async throws {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed
        let body = """
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"status":"error","version":"\(EmbeddedCheckoutProtocol.specVersion)"},"messages":{}}}}
        """

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: body))

        await fulfillment(of: [failed], timeout: 2.0)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .sdkError)
        XCTAssertEqual(error.message, "Embedded checkout sent an invalid terminal error.")
    }

    func testEcErrorSendsMerchantProtocolResponseBeforeLifecycleFailure() async {
        let response = #"{"jsonrpc":"2.0","id":"merchant-response","result":{}}"#
        let responseSent = expectation(description: "bridge response sent")
        let failed = expectation(description: "viewDelegate received failure")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        mockDelegate.didFailWithErrorExpectation = failed
        view.client = RecordingBridgeClient(response: response)

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: ecErrorBody()))

        await fulfillment(of: [responseSent, failed], timeout: 2.0, enforceOrder: true)
        XCTAssertEqual(MockCheckoutBridge.lastResponseBody, response)
    }

    func testEcErrorForwardsFullPayloadToConsumerProtocolClientBeforeLifecycleFailure() async throws {
        let consumerHandlerFired = expectation(description: "consumer protocol handler fired")
        let failed = expectation(description: "viewDelegate received failure")
        var receivedMessages: [Message] = []
        mockDelegate.didFailWithErrorExpectation = failed
        view.client = EmbeddedCheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { error in
                receivedMessages = error.messages
                consumerHandlerFired.fulfill()
            }

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: ecErrorBody()))

        await fulfillment(of: [consumerHandlerFired, failed], timeout: 2.0, enforceOrder: true)
        let received = try XCTUnwrap(receivedMessages.first)
        XCTAssertEqual(received.code, "invalid_cart")
        XCTAssertEqual(received.content, "Cart is invalid")
        XCTAssertEqual(received.severity, .unrecoverable)
    }

    func testEcErrorSelectsFirstWireOrderUnrecoverableError() async throws {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed
        let messages = #"[{"type":"error","code":"invalid_cart","content":"Invalid","severity":"recoverable"},{"type":"error","code":"cart_completed","content":"Complete","severity":"unrecoverable"},{"type":"error","code":"invalid_cart","content":"Invalid again","severity":"unrecoverable"}]"#

        view.userContentController(WKUserContentController(), didReceive: MockScriptMessage(body: ecErrorBody(messages: messages)))

        await fulfillment(of: [failed], timeout: 2.0)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .cartCompleted)
        XCTAssertEqual(error.message, "Complete")
    }

    func testEcErrorWithTransportCodeMapsToUnknown() async throws {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed

        let messages = #"[{"type":"error","code":"http_error","content":"HTTP request failed","severity":"unrecoverable"}]"#
        view.userContentController(
            WKUserContentController(),
            didReceive: MockScriptMessage(body: ecErrorBody(messages: messages))
        )

        await fulfillment(of: [failed], timeout: 2.0)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .unknown)
        XCTAssertEqual(error.message, "HTTP request failed")
    }

    func testEcErrorWithoutUnrecoverableErrorMapsToUnknown() async throws {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed

        view.userContentController(
            WKUserContentController(),
            didReceive: MockScriptMessage(body: ecErrorBody(messages: #"[{"type":"error","code":"invalid_cart","content":"Invalid","severity":"recoverable"}]"#))
        )

        await fulfillment(of: [failed], timeout: 2.0)
        let error = try XCTUnwrap(mockDelegate.errorReceived)
        XCTAssertEqual(error.code, .unknown)
        XCTAssertEqual(error.message, "Embedded checkout reported a terminal error.")
    }

    func testDuplicateEcErrorsDeliverLifecycleFailureOnce() async {
        let failed = expectation(description: "viewDelegate received failure")
        mockDelegate.didFailWithErrorExpectation = failed
        let message = MockScriptMessage(body: ecErrorBody())

        view.userContentController(WKUserContentController(), didReceive: message)
        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [failed], timeout: 2.0)
        XCTAssertEqual(mockDelegate.failureCount, 1)
    }

    // MARK: - Incoming message origin validation

    private static let readyBody = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#

    private func resetOriginValidationConfig() {
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = []
        ShopifyCheckoutKit.configuration.onMessageRejected = nil
    }

    private func stubMessageOrigin(_ origin: String) {
        let parsed = URL(string: origin)!
        view.messageOrigin = { _ in
            MessageOrigin(scheme: parsed.scheme!, host: parsed.host!, port: parsed.port)
        }
    }

    @MainActor
    func testOriginValidationAllowsAnyOriginByDefault() async {
        defer { resetOriginValidationConfig() }
        view.client = nil
        stubMessageOrigin("https://evil.example.com")
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testOriginValidationRejectsUntrustedOriginWhenAllowlistSet() {
        defer { resetOriginValidationConfig() }
        view.client = nil
        view.loadedCheckoutURL = url
        stubMessageOrigin("https://evil.example.com")
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["https://trusted.example.com"]
        let rejection = LockedValue<MessageRejection?>(nil)
        ShopifyCheckoutKit.configuration.onMessageRejected = { rejection.set($0) }
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled)
        XCTAssertEqual(rejection.get()?.origin, "https://evil.example.com")
        XCTAssertEqual(rejection.get()?.message, Self.readyBody)
        XCTAssertEqual(rejection.get()?.reason, "origin is not in the allowlist")
    }

    @MainActor
    func testOriginValidationRejectsChildFrameMessages() {
        defer { resetOriginValidationConfig() }
        view.client = nil
        stubMessageOrigin("https://checkout.example.com")
        view.messageIsMainFrame = { _ in false }
        let rejection = LockedValue<MessageRejection?>(nil)
        ShopifyCheckoutKit.configuration.onMessageRejected = { rejection.set($0) }

        view.userContentController(
            WKUserContentController(),
            didReceive: MockScriptMessage(body: Self.readyBody)
        )

        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled)
        XCTAssertEqual(rejection.get()?.message, Self.readyBody)
        XCTAssertEqual(rejection.get()?.reason, "message was sent from a child frame")
    }

    @MainActor
    func testOriginValidationAllowsConfiguredOrigin() async {
        defer { resetOriginValidationConfig() }
        view.client = nil
        view.loadedCheckoutURL = url
        stubMessageOrigin("https://trusted.example.com")
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["https://trusted.example.com"]
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testOriginValidationAllowsCheckoutOriginWhenAllowlistSet() async {
        defer { resetOriginValidationConfig() }
        view.client = nil
        view.loadedCheckoutURL = url
        // url is https://shopify1.shopify.com/checkouts/cn/123
        stubMessageOrigin("https://shopify1.shopify.com")
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["https://trusted.example.com"]
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testOriginValidationAllowsShopAppSubdomainWhenAllowlistSet() async {
        defer { resetOriginValidationConfig() }
        view.client = nil
        view.loadedCheckoutURL = url
        stubMessageOrigin("https://checkout.shop.app")
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["https://trusted.example.com"]
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testOriginValidationStarEscapeHatchAllowsAllOrigins() async {
        defer { resetOriginValidationConfig() }
        view.client = nil
        view.loadedCheckoutURL = url
        stubMessageOrigin("https://evil.example.com")
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["*"]
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [responseSent], timeout: 5.0)
        XCTAssertTrue(MockCheckoutBridge.sendResponseCalled)
    }

    @MainActor
    func testOriginValidationDefaultRejectionLogsWithoutCrashing() {
        defer { resetOriginValidationConfig() }
        view.client = nil
        view.loadedCheckoutURL = url
        stubMessageOrigin("https://evil.example.com")
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["https://trusted.example.com"]
        let message = MockScriptMessage(body: Self.readyBody)

        view.userContentController(WKUserContentController(), didReceive: message)

        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled)
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
class RetryLoadReturningNilWebView: CheckoutWebView {
    var shouldReturnNil = false

    override func load(_ request: URLRequest) -> WKNavigation? {
        if shouldReturnNil {
            return nil
        }

        return super.load(request)
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
