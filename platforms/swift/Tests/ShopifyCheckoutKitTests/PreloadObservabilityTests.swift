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

        guard case .loading = preload.state else {
            return XCTFail("expected .loading, got \(preload.state)")
        }
    }

    func testManualInvalidateTransitionsToIdle() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        ShopifyCheckoutKit.invalidate()

        guard case .idle = preload.state else {
            return XCTFail("expected .idle, got \(preload.state)")
        }
    }

    func testOnStateChangeReceivesTransitions() {
        var states: [PreloadState] = []

        let preload = ShopifyCheckoutKit.preload(checkout: url) { states.append($0) }
        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime(preload) {
            XCTAssertEqual(states, [.loading, .idle])
        }
    }

    func testNewObserverReplacesPrevious() {
        var firstStates: [PreloadState] = []
        var secondStates: [PreloadState] = []

        let first = ShopifyCheckoutKit.preload(checkout: url) { firstStates.append($0) }
        let second = ShopifyCheckoutKit.preload(checkout: url) { secondStates.append($0) }

        ShopifyCheckoutKit.invalidate()

        withExtendedLifetime((first, second)) {
            XCTAssertEqual(firstStates, [.loading])
            XCTAssertEqual(secondStates, [.idle])
        }
    }

    func testReadyTransitionOnDidFinish() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        view.webView(view, didFinish: nil)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload.state, .ready)
        }
    }

    func testExpiryTransitionsToExpired() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        CheckoutWebView.preloadCache.expire()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload.state, .expired)
        }
    }

    func testKeepAliveFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)

        CheckoutWebView.preloadCache.keepAliveDidFail()

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload.state, .failed(reason: .keepAliveLost))
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
            XCTAssertEqual(preload.state, .failed(reason: .httpError(statusCode: 500)))
        }
    }

    func testNavigationFailureTransitionsToFailed() {
        let preload = ShopifyCheckoutKit.preload(checkout: url)
        let view = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(view, for: PreloadKey(url: url, entryPoint: nil))

        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        view.webView(view, didFail: nil, withError: error)

        withExtendedLifetime(preload) {
            XCTAssertEqual(preload.state, .failed(reason: .navigationFailed))
        }
    }
}
