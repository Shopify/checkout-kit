/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

@testable import ShopifyCheckoutKit
import ShopifyCheckoutProtocol
import WebKit
import XCTest

class CheckoutWebViewTests: XCTestCase {
    private var view: CheckoutWebView!
    private var mockDelegate: MockCheckoutWebViewDelegate!
    private var url = URL(string: "http://shopify1.shopify.com/checkouts/cn/123")!

    override func setUp() {
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        CheckoutWebView.invalidate()
        view = CheckoutWebView.for(checkout: url)
        mockDelegate = MockCheckoutWebViewDelegate()
        view.viewDelegate = mockDelegate
        view.checkoutBridge = MockCheckoutBridge.self
        MockCheckoutBridge.reset()
    }

    override func tearDown() {
        view.viewDelegate = nil
        CheckoutWebView.invalidate()
        super.tearDown()
    }

    func testCorrectlyConfiguresWebview() {
        XCTAssertEqual(view.configuration.applicationNameForUserAgent, CheckoutBridge.applicationName)
        XCTAssertTrue(view.configuration.allowsInlineMediaPlayback)
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

    func testPreloadSendsPrefetchHeader() throws {
        let webView = LoadedRequestObservableWebView()

        try webView.load(
            checkout: XCTUnwrap(URL(string: "https://checkout-sdk.myshopify.io")),
            isPreload: true
        )

        let secPurposeHeader = webView.lastLoadedURLRequest?.value(forHTTPHeaderField: "Shopify-Purpose")
        XCTAssertEqual(secPurposeHeader, "prefetch")
    }

    func testNoPreloadDoesNotSendPrefetchHeader() throws {
        let webView = LoadedRequestObservableWebView()

        try webView.load(
            checkout: XCTUnwrap(URL(string: "https://checkout-sdk.myshopify.io")),
            isPreload: false
        )

        let secPurposeHeader = webView.lastLoadedURLRequest?.value(forHTTPHeaderField: "Shopify-Purpose")
        XCTAssertEqual(secPurposeHeader, nil)
        XCTAssertFalse(webView.isPreloadRequest)
    }

    func testInstrumentRequestWithPreloadingTag() throws {
        let webView = LoadedRequestObservableWebView()

        try webView.load(
            checkout: XCTUnwrap(URL(string: "https://checkout-sdk.myshopify.io")),
            isPreload: true
        )

        webView.timer = Date()
        webView.webView(webView, didFinish: nil)

        XCTAssertTrue(webView.isPreloadRequest)
        XCTAssertEqual(webView.lastInstrumentationPayload?.name, "checkout_finished_loading")
        XCTAssertEqual(webView.lastInstrumentationPayload?.type, .histogram)
        XCTAssertEqual(webView.lastInstrumentationPayload?.tags, ["preloading": "true"])
    }

    func testDoesNotInstrumentRequestWithPreloadingTag() throws {
        let webView = LoadedRequestObservableWebView()

        try webView.load(
            checkout: XCTUnwrap(URL(string: "https://checkout-sdk.myshopify.io")),
            isPreload: false
        )

        webView.timer = Date()
        webView.webView(webView, didFinish: nil)

        XCTAssertFalse(webView.isPreloadRequest)
        XCTAssertEqual(webView.lastInstrumentationPayload?.name, "checkout_finished_loading")
        XCTAssertEqual(webView.lastInstrumentationPayload?.type, .histogram)
        XCTAssertEqual(webView.lastInstrumentationPayload?.tags, ["preloading": "false"])
    }

    func testDoesNotInstrumentPreloadingTagIfDisabled() throws {
        let webView = LoadedRequestObservableWebView()
        ShopifyCheckoutKit.configuration.preloading.enabled = false

        try webView.load(
            checkout: XCTUnwrap(URL(string: "https://checkout-sdk.myshopify.io")),
            isPreload: true
        )

        webView.timer = Date()
        webView.webView(webView, didFinish: nil)

        XCTAssertEqual(webView.lastInstrumentationPayload?.tags, ["preloading": "false"])
    }

    func testDetachBridgeCalledOnInit() throws {
        ShopifyCheckoutKit.configuration.preloading.enabled = false
        let url = URL(string: "http://shopify1.shopify.com/checkouts/cn/123")
        let view = try CheckoutWebView.for(checkout: XCTUnwrap(url))
        XCTAssertTrue(view.isBridgeAttached)
        let secondView = try CheckoutWebView.for(checkout: XCTUnwrap(url))
        XCTAssertFalse(view.isBridgeAttached)
        XCTAssertTrue(secondView.isBridgeAttached)
    }

    func testCacheIsClearedOnInvalidate() throws {
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        let url = URL(string: "http://shopify1.shopify.com/checkouts/cn/123")
        let view = try CheckoutWebView.for(checkout: XCTUnwrap(url))
        XCTAssertTrue(view.isBridgeAttached)
        XCTAssertTrue(CheckoutWebView.hasCacheEntry())

        ShopifyCheckoutKit.invalidate()
        XCTAssertFalse(CheckoutWebView.hasCacheEntry())
        XCTAssertFalse(view.isBridgeAttached)
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

    func testAcknowledgeReadyRespondsToReadyRequest() throws {
        let id = "req-ready-1"
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"\#(id)","params":{"delegate":[]}}"#
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

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

    func testAcknowledgeReadyDoesNotInvokeClient() {
        view.client = MockBridgeClient(responseMessage: "client-response")
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

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

    func testReadyAckFiresWhenNoClientIsAttached() {
        view.client = nil
        let body = #"{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"#
        let message = MockScriptMessage(body: body)

        view.userContentController(WKUserContentController(), didReceive: message)

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

        await fulfillment(of: [responseSent], timeout: 2.0)

        let response = try XCTUnwrap(MockCheckoutBridge.lastResponseBody)
        let parsed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["id"] as? String, id)
        let resultBody = try XCTUnwrap(parsed["result"] as? [String: Any])
        let ucp = try XCTUnwrap(resultBody["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "error")
        let messages = try XCTUnwrap(resultBody["messages"] as? [[String: Any]])
        XCTAssertEqual(messages.first?["content"] as? String, "consumer override")
        XCTAssertEqual(messages.first?["code"] as? String, "window_open_rejected_error")
    }

    @MainActor
    func testDefaultsClientRejectsUnopenableScheme() async throws {
        let body = #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"req-window-1","params":{"url":"unhandled-scheme://nowhere"}}"#

        let raw = await CheckoutWebView.defaultsClient.process(body)
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
}

class LoadedRequestObservableWebView: CheckoutWebView {
    var lastLoadedURLRequest: URLRequest?
    var lastInstrumentationPayload: InstrumentationPayload?

    override func load(_ request: URLRequest) -> WKNavigation? {
        lastLoadedURLRequest = request
        return nil
    }

    override func instrument(_ payload: InstrumentationPayload) {
        lastInstrumentationPayload = payload
    }
}

class MockCheckoutBridge: CheckoutBridgeProtocol {
    static var instrumentCalled = false
    static var sendMessageCalled = false
    static var sendResponseCalled = false
    static var lastResponseBody: String?
    static var sendResponseExpectation: XCTestExpectation?

    static func reset() {
        instrumentCalled = false
        sendMessageCalled = false
        sendResponseCalled = false
        lastResponseBody = nil
        sendResponseExpectation = nil
    }

    static func instrument(_: WKWebView, _: InstrumentationPayload) {
        instrumentCalled = true
    }

    static func sendMessage(_: WKWebView, messageName _: String, messageBody _: String?) {
        sendMessageCalled = true
    }

    static func sendResponse(_: WKWebView, messageBody: String) {
        sendResponseCalled = true
        lastResponseBody = messageBody
        sendResponseExpectation?.fulfill()
    }
}
