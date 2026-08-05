import Combine
import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

@MainActor
class PreloadObservabilityTests: XCTestCase {
    private var url = URL(string: "http://shopify1.shopify.com/checkouts/cn/123")!

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

    func testPreloadReturnsHandleInLoadingState() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        guard case .loading = preload?.state else {
            return XCTFail("expected .loading, got \(String(describing: preload?.state))")
        }
    }

    func testManualInvalidateTransitionsToIdle() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        ShopifyCheckoutKit.invalidate()

        guard case .idle = preload?.state else {
            return XCTFail("expected .idle, got \(String(describing: preload?.state))")
        }
    }

    func testOnStateChangeReceivesTransitions() {
        var states: [PreloadState] = []

        let preload = ShopifyCheckoutKit.preload(checkout: url)
        preload?.onStateChange = { states.append($0) }
        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .idle])
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
            XCTAssertEqual(secondStates, [.loading, .idle])
        }
    }

    func testPublishedStateReceivesTransitions() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        var states: [PreloadState] = []
        let cancellable = preload?.$state.sink { states.append($0) }

        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime((preload, cancellable)) {
            XCTAssertEqual(states, [.loading, .idle])
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

    func testExpiryTransitionsToExpired() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        CheckoutWebView.preloadCache.expire()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .expired)
        }
    }

    func testKeepAliveFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        CheckoutWebView.preloadCache.keepAliveDidFail()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .failed(reason: .keepAliveLost))
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
            XCTAssertEqual(preload?.state, .failed(reason: .httpError(statusCode: 500)))
        }
    }

    func testWebContentProcessTerminationTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.webViewWebContentProcessDidTerminate(view)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .failed(reason: .keepAliveLost))
        }
    }

    func testNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFail: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .failed(reason: .navigationFailed))
        }
    }

    func testProvisionalNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFailProvisionalNavigation: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .failed(reason: .navigationFailed))
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

        let otherURL = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/other"))
        _ = CheckoutWebView.preloadCache.view(for: PreloadKey(url: otherURL, entryPoint: nil))

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle)
        }
    }

    func testExpireClearsCacheBeforeNotifyingSoReentrantPreloadSurvives() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        preload?.onStateChange = { state in
            if case .expired = state {
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

        for _ in 0 ..< 20 where preload?.state != .idle {
            await Task.yield()
        }

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload?.state, .idle)
        }
    }
}
