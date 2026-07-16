import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import WebKit
import XCTest

/// Slot-ownership rules for the single-slot preload cache.
///
/// The cache holds at most one entry. A view may fire navigation and protocol
/// events both while it is the cached preload and after it has been presented
/// (the entry is retained across presentation so a buyer can reopen the sheet).
/// Every cache mutation triggered by a view must therefore be gated on whether
/// that view is the current slot occupant — an event from any other view must
/// leave the slot untouched.
@MainActor
class PreloadCacheTests: XCTestCase {
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

    // MARK: - A view's own terminal events clear the slot it occupies

    func test_HTTPErrorOnSlotOccupantClearsSlot() {
        let entry = storeCacheEntry()
        entry.load(checkout: url)

        _ = entry.handleResponse(httpResponse(url: entry.url ?? url, statusCode: 500))

        XCTAssertFalse(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_NavigationFailureOnSlotOccupantClearsSlot() {
        let entry = storeCacheEntry()

        entry.webView(entry, didFail: nil, withError: timeoutError())

        XCTAssertFalse(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_CompleteOnSlotOccupantClearsSlot() async {
        let entry = storeCacheEntry()

        _ = await entry.defaultsClient.process(ecCompleteBody())

        XCTAssertFalse(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_UnrecoverableErrorOnSlotOccupantClearsSlot() async {
        let entry = storeCacheEntry()

        _ = await entry.defaultsClient.process(ecErrorBody(severity: "unrecoverable"))

        XCTAssertFalse(CheckoutWebView.preloadCache.contains(entry))
    }

    // MARK: - Events from a non-occupant view must not touch the slot

    func test_HTTPErrorOnForeignViewPreservesSlot() {
        let entry = storeCacheEntry()
        let foreign = CheckoutWebView(entryPoint: nil)
        foreign.load(checkout: url)

        _ = foreign.handleResponse(httpResponse(url: foreign.url ?? url, statusCode: 500))

        XCTAssertTrue(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_NavigationFailureOnForeignViewPreservesSlot() {
        let entry = storeCacheEntry()
        let foreign = CheckoutWebView(entryPoint: nil)

        foreign.webView(foreign, didFail: nil, withError: timeoutError())

        XCTAssertTrue(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_CompleteOnForeignViewPreservesSlot() async {
        let entry = storeCacheEntry()
        let foreign = CheckoutWebView(entryPoint: nil)

        _ = await foreign.defaultsClient.process(ecCompleteBody())

        XCTAssertTrue(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_UnrecoverableErrorOnForeignViewPreservesSlot() async {
        let entry = storeCacheEntry()
        let foreign = CheckoutWebView(entryPoint: nil)

        _ = await foreign.defaultsClient.process(ecErrorBody(severity: "unrecoverable"))

        XCTAssertTrue(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_ProvisionalFailureOnForeignViewPreservesSlot() {
        let entry = storeCacheEntry()
        let foreign = CheckoutWebView(entryPoint: nil)

        foreign.webView(foreign, didFailProvisionalNavigation: nil, withError: timeoutError())

        XCTAssertTrue(CheckoutWebView.preloadCache.contains(entry))
    }

    func test_DidFinishOnForeignViewPreservesSlot() {
        let entry = storeCacheEntry()
        let foreign = CheckoutWebView(entryPoint: nil)

        foreign.webView(foreign, didFinish: nil)

        XCTAssertTrue(CheckoutWebView.preloadCache.contains(entry))
    }

    // MARK: - Helpers

    private func storeCacheEntry() -> CheckoutWebView {
        let entry = CheckoutWebView(entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(entry, for: PreloadKey(url: url, entryPoint: nil))
        return entry
    }

    private func httpResponse(url link: URL, statusCode: Int) -> HTTPURLResponse {
        HTTPURLResponse(url: link, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
    }

    private func timeoutError() -> NSError {
        NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
    }

    private func ecCompleteBody() -> String {
        """
        {"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":{"currency":"USD","id":"c-1","line_items":[],"links":[],"status":"completed","totals":[],"ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}}}}
        """
    }

    private func ecErrorBody(severity: String) -> String {
        """
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"status":"error","version":"\(EmbeddedCheckoutProtocol.specVersion)"},"messages":[{"type":"error","code":"session_failed","content":"Session failed","severity":"\(severity)"}]}}}
        """
    }
}
