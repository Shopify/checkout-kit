import Combine
import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class PreloadObservabilityTests: XCTestCase {
    private var url = URL(string: "https://shopify1.shopify.com/checkouts/cn/123")!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        CheckoutWebView.invalidate()
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        try await super.tearDown()
    }

    func testNewCacheStartsIdleWithoutReason() {
        guard case let .idle(reason) = PreloadCache().state else {
            return XCTFail("expected .idle")
        }

        XCTAssertNil(reason)
    }

    func testPreloadReturnsHandleInLoadingState() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        guard case .loading = preload?.state else {
            return XCTFail("expected .loading, got \(String(describing: preload?.state))")
        }
    }

    func testHTTPPreloadTransitionsToNavigationFailure() throws {
        let insecureURL = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))

        let preload = ShopifyCheckoutKit.preload(checkout: insecureURL)

        XCTAssertEqual(
            preload?.state,
            .failed(reason: .navigationFailed, message: "Checkout URL must use HTTPS.")
        )
    }

    func testManualInvalidateTransitionsToIdle() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        ShopifyCheckoutKit.invalidate()

        guard case let .idle(reason) = preload?.state else {
            return XCTFail("expected .idle, got \(String(describing: preload?.state))")
        }
        XCTAssertEqual(reason, .invalidated)
    }

    func testOnStateChangeReceivesTransitions() {
        var states: [PreloadState] = []

        let preload = ShopifyCheckoutKit.preload(checkout: url)
        preload?.onStateChange = { states.append($0) }
        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .idle(reason: .invalidated)])
        }
    }

    func testNewObserverReplacesPrevious() {
        var firstStates: [PreloadState] = []
        var secondStates: [PreloadState] = []

        let first = ShopifyCheckoutKit.preload(checkout: url)
        first?.onStateChange = { firstStates.append($0) }
        let second = ShopifyCheckoutKit.preload(checkout: url)
        second?.onStateChange = { secondStates.append($0) }

        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime((first, second)) {
            XCTAssertEqual(firstStates, [.loading])
            XCTAssertEqual(secondStates, [.loading, .idle(reason: .invalidated)])
        }
    }

    func testPublishedStateReceivesTransitions() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        var states: [PreloadState] = []
        let cancellable = preload?.$state.sink { states.append($0) }

        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime((preload, cancellable)) {
            XCTAssertEqual(states, [.loading, .idle(reason: .invalidated)])
        }
    }

    func testReadyTransitionOnDidFinish() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.webView(view, didFinish: nil)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .ready)
        }
    }

    func testRepeatDidFinishDoesNotReNotifyReadyState() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        var states: [PreloadState] = []
        preload?.onStateChange = { states.append($0) }

        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.webView(view, didFinish: nil)
        view.webView(view, didFinish: nil)

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .ready])
        }
    }

    func testExpiryTransitionsToIdleWithExpiredReason() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        CheckoutWebView.preloadCache.expire()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .expired))
        }
    }

    func testWebContentUnavailableTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        CheckoutWebView.preloadCache.keepAliveDidFail()

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(reason: .webContentUnavailable, message: "Preload keep-alive failed.")
            )
        }
    }

    func testHTTPErrorTransitionsToFailed() throws {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))
        view.load(checkout: url)
        let link = view.url ?? url

        let response = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 500, httpVersion: nil, headerFields: nil))
        _ = view.handleResponse(response)

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(
                    reason: .httpError(statusCode: 500),
                    message: "HTTP response returned status code 500."
                )
            )
        }
    }

    func testNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFail: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(reason: .navigationFailed, message: "Navigation failed (error code: -1001).")
            )
        }
    }

    func testProvisionalNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFailProvisionalNavigation: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(
                preload?.state,
                .failed(reason: .navigationFailed, message: "Navigation failed (error code: -1001).")
            )
        }
    }

    func testProvisionalNavigationCancelledDoesNotTransition() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled)
        view.webView(view, didFailProvisionalNavigation: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .loading)
        }
    }

    func testViewLookupWithDifferentKeyTransitionsHandleToIdle() throws {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        _ = CheckoutWebView.preloadCache.store(
            CheckoutWebView(entryPoint: nil),
            for: PreloadKey(url: url, entryPoint: nil)
        )

        let otherURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/other"))
        _ = CheckoutWebView.preloadCache.view(for: PreloadKey(url: otherURL, entryPoint: nil))

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .invalidated))
        }
    }

    func testExpireClearsCacheBeforeNotifyingSoReentrantPreloadSurvives() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        preload?.onStateChange = { state in
            if case .idle(reason: .expired) = state {
                _ = CheckoutWebView.preloadCache.store(
                    CheckoutWebView(entryPoint: nil),
                    for: PreloadKey(url: self.url, entryPoint: nil)
                )
            }
        }

        CheckoutWebView.preloadCache.expire()

        withExtendedLifetime(preload) {
            XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
        }
    }

    func testDisablingPreloadViaConfigTransitionsToIdle() async {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        ShopifyCheckoutKit.configuration.preloading.enabled = false

        for _ in 0 ..< 20 where preload?.state != .idle(reason: .invalidated) {
            await Task.yield()
        }

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle(reason: .invalidated))
        }
    }

    func testMemoryPressureEvictsIdlePreload() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        CheckoutWebView.preloadCache.evict()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .evicted)
            XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
        }
    }

    func testMemoryPressureSparesPresentedCheckout() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        view.isPresented = true
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        CheckoutWebView.preloadCache.evict()

        withExtendedLifetime(preload) {
            XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
            XCTAssertNotEqual(preload?.state, .evicted)
        }
    }
}
