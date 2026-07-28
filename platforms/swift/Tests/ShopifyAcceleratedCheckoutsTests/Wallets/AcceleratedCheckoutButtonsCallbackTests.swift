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

    private static let checkout =
        #"{"currency":"USD","id":"c-1","line_items":[],"links":[],"status":"incomplete","totals":[],"ucp":{"payment_handlers":{},"version":"2026-04-08"}}"#
    private static let startNotification =
        #"{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":\#(checkout)}}"#
    private static let completeNotification =
        #"{"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":\#(checkout)}}"#
}

private struct ResponseClient: CheckoutCommunicationProtocol {
    let response: String?

    func process(_: String) async -> String? {
        response
    }
}
