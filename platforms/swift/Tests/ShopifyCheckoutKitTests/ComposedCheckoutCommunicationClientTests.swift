@testable import ShopifyCheckoutKit
import XCTest

final class ComposedCheckoutCommunicationClientTests: XCTestCase {
    func testRunIfUnhandledReturnsMerchantResponseAndSkipsDefault() async {
        let merchant = RecordingClient(response: Self.merchantResponse)
        let defaultClient = RecordingClient(response: Self.defaultResponse)
        let client = ComposedCheckoutCommunicationClient(
            merchant: merchant,
            defaults: [
                "ec.window.open_request": DefaultClientBinding(
                    client: defaultClient,
                    policy: .runIfUnhandled
                )
            ]
        )

        let response = await client.process(Self.windowOpenRequest)
        let merchantMessages = await merchant.messages
        let defaultMessages = await defaultClient.messages

        XCTAssertEqual(response, Self.merchantResponse)
        XCTAssertEqual(merchantMessages, [Self.windowOpenRequest])
        XCTAssertEqual(defaultMessages, [])
    }

    func testRunIfUnhandledReturnsDefaultResponseWhenMerchantHasNoResponse() async {
        let merchant = RecordingClient(response: nil)
        let defaultClient = RecordingClient(response: Self.defaultResponse)
        let client = ComposedCheckoutCommunicationClient(
            merchant: merchant,
            defaults: [
                "ec.window.open_request": DefaultClientBinding(
                    client: defaultClient,
                    policy: .runIfUnhandled
                )
            ]
        )

        let response = await client.process(Self.windowOpenRequest)
        let merchantMessages = await merchant.messages
        let defaultMessages = await defaultClient.messages

        XCTAssertEqual(response, Self.defaultResponse)
        XCTAssertEqual(merchantMessages, [Self.windowOpenRequest])
        XCTAssertEqual(defaultMessages, [Self.windowOpenRequest])
    }

    func testAlwaysRunAfterMerchantRunsDefaultAndKeepsMerchantResponse() async {
        let merchant = RecordingClient(response: Self.merchantResponse)
        let defaultClient = RecordingClient(response: Self.defaultResponse)
        let client = ComposedCheckoutCommunicationClient(
            merchant: merchant,
            defaults: [
                "ec.error": DefaultClientBinding(
                    client: defaultClient,
                    policy: .alwaysRunAfterMerchant
                )
            ]
        )

        let response = await client.process(Self.errorNotification)
        let merchantMessages = await merchant.messages
        let defaultMessages = await defaultClient.messages

        XCTAssertEqual(response, Self.merchantResponse)
        XCTAssertEqual(merchantMessages, [Self.errorNotification])
        XCTAssertEqual(defaultMessages, [Self.errorNotification])
    }

    func testAlwaysRunAfterMerchantReturnsDefaultResponseWhenMerchantHasNoResponse() async {
        let merchant = RecordingClient(response: nil)
        let defaultClient = RecordingClient(response: Self.defaultResponse)
        let client = ComposedCheckoutCommunicationClient(
            merchant: merchant,
            defaults: [
                "ec.error": DefaultClientBinding(
                    client: defaultClient,
                    policy: .alwaysRunAfterMerchant
                )
            ]
        )

        let response = await client.process(Self.errorNotification)
        let merchantMessages = await merchant.messages
        let defaultMessages = await defaultClient.messages

        XCTAssertEqual(response, Self.defaultResponse)
        XCTAssertEqual(merchantMessages, [Self.errorNotification])
        XCTAssertEqual(defaultMessages, [Self.errorNotification])
    }

    func testDefaultBindingOnlyRunsForMatchingMethod() async {
        let defaultClient = RecordingClient(response: Self.defaultResponse)
        let client = ComposedCheckoutCommunicationClient(
            merchant: nil,
            defaults: [
                "ec.window.open_request": DefaultClientBinding(
                    client: defaultClient,
                    policy: .runIfUnhandled
                )
            ]
        )

        let response = await client.process(Self.errorNotification)
        let defaultMessages = await defaultClient.messages

        XCTAssertNil(response)
        XCTAssertEqual(defaultMessages, [])
    }

    private static let merchantResponse = #"{"jsonrpc":"2.0","id":"merchant","result":{}}"#
    private static let defaultResponse = #"{"jsonrpc":"2.0","id":"default","result":{}}"#
    private static let windowOpenRequest =
        #"{"jsonrpc":"2.0","method":"ec.window.open_request","id":"1","params":{"url":"https://example.com"}}"#
    private static let errorNotification =
        #"{"jsonrpc":"2.0","method":"ec.error","params":{"error":{"messages":[]}}}"#
}

private actor RecordingClient: CheckoutCommunicationProtocol {
    let response: String?
    private var receivedMessages: [String] = []

    init(response: String?) {
        self.response = response
    }

    var messages: [String] {
        receivedMessages
    }

    func process(_ message: String) async -> String? {
        receivedMessages.append(message)
        return response
    }
}
