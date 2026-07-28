@testable import ShopifyCheckoutKit
import XCTest

@MainActor
class CheckoutViewControllerTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutViewController: CheckoutViewController!

    override func setUp() async throws {
        try await super.setUp()
        checkoutURL = URL(string: "https://www.shopify.com")
        checkoutViewController = CheckoutViewController(checkout: checkoutURL)
    }

    func testInit() {
        XCTAssertNotNil(checkoutViewController)
    }
}

@MainActor
class ShopifyCheckoutTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration = Configuration()
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = Configuration()
        try await super.tearDown()
    }

    func testOnDismiss() {
        var dismissActionCalled = false

        let sheet = shopifyCheckout.onDismiss {
            dismissActionCalled = true
        }
        sheet.onDismissAction?()
        XCTAssertTrue(dismissActionCalled)
    }

    func testOnFail() {
        var actionCalled = false
        var actionData: CheckoutError?
        let error: CheckoutError = .checkoutUnavailable(message: "error", code: CheckoutUnavailable.httpError(statusCode: 500))

        let sheet = shopifyCheckout.onFail { failure in
            actionCalled = true
            actionData = failure
        }

        sheet.onFailAction?(error)
        XCTAssertTrue(actionCalled)
        XCTAssertNotNil(actionData)
    }

    func testConnect() {
        let client = MockBridgeClient()
        let sheet = shopifyCheckout.connect(client)
        XCTAssertNotNil(sheet.client)
    }

    func testLifecycleCallbacksAndConnectedClientAreComposed() async {
        var receivedMethods: [String] = []
        let advancedResponse = #"{"jsonrpc":"2.0","id":"advanced","result":{}}"#
        let advanced = TestCommunicationClient(response: advancedResponse) { message in
            let data = Data(message.utf8)
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            if let method = object?["method"] as? String {
                receivedMethods.append(method)
            }
        }
        var callbackMethods: [String] = []
        let sheet = shopifyCheckout
            .onStart { _ in callbackMethods.append("ec.start") }
            .onComplete { _ in callbackMethods.append("ec.complete") }
            .onTotalsChange { _ in callbackMethods.append("ec.totals.change") }
            .onLineItemsChange { _ in callbackMethods.append("ec.line_items.change") }
            .onMessagesChange { _ in callbackMethods.append("ec.messages.change") }
            .onFulfillmentChange { _ in callbackMethods.append("ec.fulfillment.change") }
            .onError { _ in callbackMethods.append("ec.error") }
            .connect(advanced)

        let checkout = #"{"currency":"USD","id":"c-1","line_items":[],"links":[],"status":"incomplete","totals":[],"ucp":{"payment_handlers":{},"version":"2026-04-08"}}"#
        let messages = [
            #"{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":\#(checkout)}}"#,
            #"{"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":\#(checkout)}}"#,
            #"{"jsonrpc":"2.0","method":"ec.totals.change","params":{"checkout":\#(checkout)}}"#,
            #"{"jsonrpc":"2.0","method":"ec.line_items.change","params":{"checkout":\#(checkout)}}"#,
            #"{"jsonrpc":"2.0","method":"ec.messages.change","params":{"checkout":\#(checkout)}}"#,
            #"{"jsonrpc":"2.0","method":"ec.fulfillment.change","params":{"checkout":\#(checkout)}}"#,
            #"{"jsonrpc":"2.0","method":"ec.error","params":{"error":{"messages":[],"ucp":{"status":"error","version":"2026-04-08"}}}}"#
        ]

        for message in messages {
            let response = await sheet.connectedClient.process(message)
            XCTAssertEqual(response, advancedResponse)
        }

        XCTAssertEqual(callbackMethods, receivedMethods)
        XCTAssertEqual(callbackMethods.count, messages.count)
    }

    func testWindowOpenCallbackHandlesRequestBeforeConnectedClient() async throws {
        var receivedURL: String?
        var advancedClientCalled = false
        let advanced = TestCommunicationClient(response: nil) { _ in
            advancedClientCalled = true
        }
        let sheet = shopifyCheckout
            .connect(advanced)
            .onWindowOpen { request in
                receivedURL = request.url
                return .success()
            }

        let response = await sheet.connectedClient.process(Self.windowOpenRequest)
        let responseData = try XCTUnwrap(response?.data(using: .utf8))
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: responseData) as? [String: Any])
        let result = try XCTUnwrap(object["result"] as? [String: Any])
        let ucp = try XCTUnwrap(result["ucp"] as? [String: Any])

        XCTAssertEqual(receivedURL, "https://example.com/terms")
        XCTAssertEqual(object["id"] as? String, "window-1")
        XCTAssertEqual(ucp["status"] as? String, "success")
        XCTAssertFalse(advancedClientCalled)
    }

    private static let windowOpenRequest =
        #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"window-1","params":{"url":"https://example.com/terms"}}"#
}

private struct TestCommunicationClient: CheckoutCommunicationProtocol {
    let response: String?
    let onProcess: @MainActor @Sendable (String) -> Void

    func process(_ message: String) async -> String? {
        await onProcess(message)
        return response
    }
}

@MainActor
class CheckoutConfigurableTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration = Configuration()
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = Configuration()
        try await super.tearDown()
    }

    func testBackgroundColor() {
        let color = UIColor.red
        shopifyCheckout.backgroundColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, color)
    }

    func testAppearance() {
        let appearance = ShopifyCheckoutKit.Configuration.Appearance.app(.light)
        shopifyCheckout.appearance(appearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, appearance)
    }

    func testAppearanceDecoratesCheckoutURLAfterModifierRuns() throws {
        let sheet = shopifyCheckout.appearance(.storefront)
        let items = try XCTUnwrap(URLComponents(url: sheet.decoratedCheckoutURL, resolvingAgainstBaseURL: false)?.queryItems)

        XCTAssertEqual(items.first(where: { $0.name == "ec_color_scheme" })?.value, "light")
        XCTAssertEqual(items.first(where: { $0.name == "ck_branding" })?.value, "shop")
    }

    func testTintColor() {
        let color = UIColor.blue
        shopifyCheckout.tintColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, color)
    }

    func testTitle() {
        let title = "Test Title"
        shopifyCheckout.title(title)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, title)
    }

    func testCloseButtonTintColor() {
        let color = UIColor.green
        shopifyCheckout.closeButtonTintColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, color)
    }

    func testCloseButtonTintColorNil() {
        shopifyCheckout.closeButtonTintColor(nil)
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }
}
