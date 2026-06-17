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
        view = CheckoutWebView.for(checkout: url)
        mockDelegate = MockCheckoutWebViewDelegate()
        view.viewDelegate = mockDelegate
        view.checkoutBridge = MockCheckoutBridge.self
        MockCheckoutBridge.reset()
    }

    override func tearDown() async throws {
        view.viewDelegate = nil
        try await super.tearDown()
    }

    func testCorrectlyConfiguresWebview() {
        XCTAssertEqual(view.configuration.applicationNameForUserAgent, CheckoutBridge.applicationName)
        XCTAssertTrue(view.configuration.allowsInlineMediaPlayback)
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

    func test403responseOnCheckoutURLCodeDelegation() throws {
        try view.load(checkout: XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123")))
        let link = try XCTUnwrap(view.url)
        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        let urlResponse = try XCTUnwrap(HTTPURLResponse(url: link, statusCode: 403, httpVersion: nil, headerFields: nil))

        let policy = view.handleResponse(urlResponse)
        XCTAssertEqual(policy, .cancel)

        waitForExpectations(timeout: 5) { _ in
            switch self.mockDelegate.errorReceived {
            case let .some(.checkoutUnavailable(message, _)):
                XCTAssertEqual(message, "forbidden")
            default:
                XCTFail("Unhandled error case received")
            }
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

        waitForExpectations(timeout: 5) { _ in
            switch self.mockDelegate.errorReceived {
            case let .some(.checkoutUnavailable(message, _)):
                XCTAssertEqual(message, "unauthorized")
            default:
                XCTFail("Unhandled error case received")
            }
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

        waitForExpectations(timeout: 5) { _ in
            switch self.mockDelegate.errorReceived {
            case let .some(.checkoutUnavailable(message, _)):
                XCTAssertEqual(message, "not found")
            default:
                XCTFail("Unhandled error case received")
            }
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

        waitForExpectations(timeout: 5) { _ in
            switch self.mockDelegate.errorReceived {
            case let .some(.checkoutExpired(message, _)):
                XCTAssertEqual(message, "Checkout has expired.")
            default:
                XCTFail("Unhandled error case received")
            }
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

            waitForExpectations(timeout: 3) { error in
                if error != nil {
                    XCTFail("Test timed out for status code \(statusCode)")
                }

                guard let receivedError = self.mockDelegate.errorReceived else {
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

    func testWebViewDidFailWithError() throws {
        let url = try XCTUnwrap(URL(string: "http://shopify1.shopify.com/checkouts/cn/123"))
        let view = CheckoutWebView.for(checkout: url)
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut, userInfo: nil)

        let didFailWithErrorExpectation = expectation(description: "checkoutViewDidFailWithError was called")

        mockDelegate.didFailWithErrorExpectation = didFailWithErrorExpectation
        view.viewDelegate = mockDelegate

        view.webView(view, didFail: nil, withError: error)

        waitForExpectations(timeout: 5) { _ in
            switch self.mockDelegate.errorReceived {
            case let .some(.sdkError(underlying)):
                let nsError = underlying as NSError
                XCTAssertEqual(nsError.domain, NSURLErrorDomain)
                XCTAssertEqual(nsError.code, NSURLErrorTimedOut)
            default:
                XCTFail("checkoutDidFail(.sdkError) expected to throw")
            }
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
        XCTAssertEqual(ucp["version"] as? String, CheckoutProtocol.specVersion)
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
    func testWindowOpenRequestUsesConsumerOverride() async throws {
        let id = "req-window-1"
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"\#(id)","params":{"url":"https://example.com/terms"}}"#
        let responseSent = expectation(description: "response sent")
        MockCheckoutBridge.sendResponseExpectation = responseSent
        view.client = CheckoutProtocol.Client()
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
    func testWindowOpenRequestIgnoresMalformedBody() async {
        view.client = nil
        let notFired = expectation(description: "sendResponse must not fire")
        notFired.isInverted = true
        MockCheckoutBridge.sendResponseExpectation = notFired
        let message = MockScriptMessage(body: #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"r","params":{}}"#)

        view.userContentController(WKUserContentController(), didReceive: message)

        await fulfillment(of: [notFired], timeout: 1.0)
        XCTAssertFalse(MockCheckoutBridge.sendResponseCalled)
    }

    // MARK: - ec.error severity-based dismissal

    /// Builds a minimal valid `ec.error` payload with the given severity. `ErrorResponse`
    /// requires both `messages` and `ucp` to decode — Codec routes it via the typed
    /// `params.error` field, so missing fields would make the message decode to `.unknown`
    /// and bypass the handler entirely.
    private func ecErrorBody(severity: String) -> String {
        return """
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"status":"error","version":"\(CheckoutProtocol.specVersion)"},"messages":[{"type":"error","code":"session_failed","content":"Session failed","severity":"\(severity)"}]}}}
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
        view.client = CheckoutProtocol.Client()
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

@MainActor
class MockCheckoutBridge: CheckoutBridgeProtocol {
    static var sendResponseCalled = false
    static var sendResponseCount = 0
    static var lastResponseBody: String?
    static var sendResponseExpectation: XCTestExpectation?

    static func reset() {
        sendResponseCalled = false
        sendResponseCount = 0
        lastResponseBody = nil
        sendResponseExpectation = nil
    }

    @MainActor static func sendResponse(_: WKWebView, messageBody: String) async -> Bool {
        sendResponseCalled = true
        sendResponseCount += 1
        lastResponseBody = messageBody
        sendResponseExpectation?.fulfill()
        return true
    }
}
