import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

private struct TestURLPayload: EventPayload {
    let url: URL?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let raw = try container.decode(String.self, forKey: .url)
        url = URL(string: raw)
    }

    private enum CodingKeys: String, CodingKey {
        case url
    }
}

private enum TestDelegationResult: ResponsePayload {
    case success
    case rejected(reason: String)

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .success:
            try container.encode(["status": "success"], forKey: .ucp)
        case let .rejected(reason):
            try container.encode(["status": "error"], forKey: .ucp)
            try container.encode([["content": reason]], forKey: .messages)
        }
    }

    private enum CodingKeys: String, CodingKey {
        case ucp
        case messages
    }
}

private let windowOpenDescriptor = DelegationDescriptor<TestURLPayload, TestDelegationResult>(
    method: GeneratedProtocolCatalog.ecWindowOpenRequest.method,
    delegation: "window.open",
    decode: { params in
        try? JSONDecoder().decode(TestURLPayload.self, from: params)
    }
)

@Suite("Client Tests")
struct ClientTests {
    private func notificationFixture() throws -> String {
        let url = Bundle.module.url(forResource: "notification", withExtension: "json", subdirectory: "Fixtures")!
        return try String(contentsOf: url, encoding: .utf8)
    }

    private func readyFixture() throws -> String {
        let url = Bundle.module.url(forResource: "ready_response", withExtension: "json", subdirectory: "Fixtures")!
        return try String(contentsOf: url, encoding: .utf8)
    }

    @Test @MainActor func notificationDispatchesToRegisteredHandler() async throws {
        var receivedCheckout: Checkout?
        let client = CheckoutTransport.Client()
            .on(GeneratedProtocolCatalog.ecStart) { checkout in
                receivedCheckout = checkout
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(receivedCheckout != nil)
        #expect(receivedCheckout?.id == "checkout-123")
    }

    @Test @MainActor func notificationDoesNotFireUnregisteredHandler() async throws {
        var completeFired = false
        let client = CheckoutTransport.Client()
            .on(GeneratedProtocolCatalog.ecComplete) { (_: Checkout) in
                completeFired = true
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(completeFired == false)
    }

    @Test @MainActor func notificationReturnsNil() async throws {
        let client = CheckoutTransport.Client()
            .on(GeneratedProtocolCatalog.ecStart) { (_: Checkout) in }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
    }

    @Test @MainActor func multipleNotificationHandlersOnDifferentEvents() async throws {
        var startFired = false
        var completeFired = false
        let client = CheckoutTransport.Client()
            .on(GeneratedProtocolCatalog.ecStart) { (_: Checkout) in startFired = true }
            .on(GeneratedProtocolCatalog.ecComplete) { (_: Checkout) in completeFired = true }

        _ = try await client.process(notificationFixture())

        #expect(startFired == true)
        #expect(completeFired == false)
    }

    @Test @MainActor func unknownMessageReturnsNil() async {
        let client = CheckoutTransport.Client()
            .on(GeneratedProtocolCatalog.ecStart) { (_: Checkout) in }

        let response = await client.process("not valid json")

        #expect(response == nil)
    }

    @Test @MainActor func delegationRequestDispatchesToRegisteredHandler() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com/terms"}}
        """#

        let client = CheckoutTransport.Client()
            .on(windowOpenDescriptor) { payload in
                payload.url == URL(string: "https://example.com/terms") ? .success : .rejected(reason: "unexpected url")
            }

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "req-window-1")
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
    }

    @Test @MainActor func delegationRequestEncodesRejectedResult() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let client = CheckoutTransport.Client()
            .on(windowOpenDescriptor) { _ in
                .rejected(reason: "no presenter available")
            }

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "error")

        let messages = try #require(result["messages"] as? [[String: Any]])
        #expect(messages[0]["content"] as? String == "no presenter available")
    }

    @Test @MainActor func delegationRequestReturnsNilWhenHandlerNotRegistered() async {
        let client = CheckoutTransport.Client()
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let response = await client.process(request)
        #expect(response == nil)
    }

    @Test @MainActor func delegationRequestWithNullURLReturnsInvalidParamsError() async throws {
        let client = CheckoutTransport.Client()
            .on(windowOpenDescriptor) { _ in .success }
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":null}}
        """#

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "req-window-1")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == -32602)
        #expect(error["message"] as? String == "Invalid params")
    }

    @Test @MainActor func delegationRequestLastHandlerWins() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let client = CheckoutTransport.Client()
            .on(windowOpenDescriptor) { _ in .rejected(reason: "first") }
            .on(windowOpenDescriptor) { _ in .success }

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
    }

    @Test @MainActor func delegationAdvertisesDelegationInReadyResponse() async throws {
        let ready = #"""
        {"jsonrpc":"2.0","id":"ready-1","method":"ec.ready","params":{"delegate":["window.open"]}}
        """#

        let client = CheckoutTransport.Client()
            .on(windowOpenDescriptor) { _ in .success }

        let response = try #require(await client.process(ready))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        let result = try #require(parsed["result"] as? [String: Any])
        let delegate = try #require(result["delegate"] as? [String])
        #expect(delegate == ["window.open"])
    }

    @Test @MainActor func malformedReadyParamsReturnParseError() async throws {
        let ready = #"""
        {"jsonrpc":"2.0","id":"ready-bad","method":"ec.ready","params":{"delegate":[null]}}
        """#

        let client = CheckoutTransport.Client()

        let response = try #require(await client.process(ready))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-bad")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == CheckoutTransport.parseErrorCode)
        #expect(error["message"] as? String == CheckoutTransport.parseErrorMessage)
    }

    @Test @MainActor func readyReturnsResponse() async throws {
        let client = CheckoutTransport.Client()

        let response = try await client.process(readyFixture())

        let data = try #require(response?.data(using: .utf8))
        let parsed = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil)
        #expect(parsed["params"] == nil)
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == CheckoutTransport.specVersion)
        #expect(ucp["status"] as? String == "success")
    }
}
