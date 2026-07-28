@testable import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import XCTest

@available(iOS 16.0, *)
@MainActor
final class AcceleratedCheckoutButtonsCallbackTests: XCTestCase {
    func testCallbackAddedBeforeConnectIsPreserved() async {
        var started = false
        let expectedResponse = #"{"jsonrpc":"2.0","id":"advanced","result":{}}"#
        let buttons = AcceleratedCheckoutButtons(cartID: "gid://shopify/Cart/test")
            .onStart { _ in started = true }
            .connect(ResponseClient(response: expectedResponse))

        let response = await buttons.clientContainer.client.process(Self.startNotification)

        XCTAssertTrue(started)
        XCTAssertEqual(response, expectedResponse)
    }

    func testCallbackAddedAfterConnectIsPreserved() async {
        var completed = false
        let expectedResponse = #"{"jsonrpc":"2.0","id":"advanced","result":{}}"#
        let buttons = AcceleratedCheckoutButtons(cartID: "gid://shopify/Cart/test")
            .connect(ResponseClient(response: expectedResponse))
            .onComplete { _ in completed = true }

        let response = await buttons.clientContainer.client.process(Self.completeNotification)

        XCTAssertTrue(completed)
        XCTAssertEqual(response, expectedResponse)
    }

    func testWindowOpenCallbackHandlesRequest() async throws {
        var receivedURL: String?
        let buttons = AcceleratedCheckoutButtons(cartID: "gid://shopify/Cart/test")
            .onWindowOpen { request in
                receivedURL = request.url
                return .success()
            }

        let response = await buttons.clientContainer.client.process(Self.windowOpenRequest)
        let responseData = try XCTUnwrap(response?.data(using: .utf8))
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: responseData) as? [String: Any])
        let result = try XCTUnwrap(object["result"] as? [String: Any])
        let ucp = try XCTUnwrap(result["ucp"] as? [String: Any])

        XCTAssertEqual(receivedURL, "https://example.com/terms")
        XCTAssertEqual(ucp["status"] as? String, "success")
    }

    private static let checkout =
        #"{"currency":"USD","id":"c-1","line_items":[],"links":[],"status":"incomplete","totals":[],"ucp":{"payment_handlers":{},"version":"2026-04-08"}}"#
    private static let startNotification =
        #"{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":\#(checkout)}}"#
    private static let completeNotification =
        #"{"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":\#(checkout)}}"#
    private static let windowOpenRequest =
        #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"window-1","params":{"url":"https://example.com/terms"}}"#
}

private struct ResponseClient: CheckoutCommunicationProtocol {
    let response: String?

    func process(_: String) async -> String? {
        response
    }
}
