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

private let windowOpenDescriptor = RequestDescriptor<TestURLPayload, TestDelegationResult>(
    method: EmbeddedCheckoutProtocol.Event.windowOpenRequest.method,
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

    private func requestFixture() throws -> String {
        let url = Bundle.module.url(forResource: "request", withExtension: "json", subdirectory: "Fixtures")!
        return try String(contentsOf: url, encoding: .utf8)
    }

    @Test @MainActor func notificationDispatchesToRegisteredHandler() async throws {
        var receivedCheckout: Checkout?
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { checkout in
                receivedCheckout = checkout
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(receivedCheckout != nil)
        #expect(receivedCheckout?.id == "checkout-123")
    }

    @Test @MainActor func notificationDoesNotFireUnregisteredHandler() async throws {
        var completeFired = false
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.complete) { (_: Checkout) in
                completeFired = true
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(completeFired == false)
    }

    @Test @MainActor func notificationReturnsNil() async throws {
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { (_: Checkout) in }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
    }

    @Test @MainActor func multipleNotificationHandlersOnDifferentEvents() async throws {
        var startFired = false
        var completeFired = false
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { (_: Checkout) in startFired = true }
            .on(EmbeddedCheckoutProtocol.Event.complete) { (_: Checkout) in completeFired = true }

        _ = try await client.process(notificationFixture())

        #expect(startFired == true)
        #expect(completeFired == false)
    }

    @Test @MainActor func unknownMessageReturnsNil() async {
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { (_: Checkout) in }

        let response = await client.process("not valid json")

        #expect(response == nil)
    }

    @Test @MainActor func delegationRequestDispatchesToRegisteredHandler() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com/terms"}}
        """#

        let client = EmbeddedCheckoutProtocol.Client()
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

        let client = EmbeddedCheckoutProtocol.Client()
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
        let client = EmbeddedCheckoutProtocol.Client()
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let response = await client.process(request)
        #expect(response == nil)
    }

    @Test @MainActor func requestWithUndecodableParamsReturnsInvalidParamsError() async throws {
        let client = EmbeddedCheckoutProtocol.Client()
            .on(windowOpenDescriptor) { _ in .success }
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":null}}
        """#

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "req-window-1")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == EmbeddedCheckoutProtocol.invalidParamsCode)
        #expect(error["message"] as? String == EmbeddedCheckoutProtocol.invalidParamsMessage)
    }

    @Test @MainActor func delegationRequestLastHandlerWins() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let client = EmbeddedCheckoutProtocol.Client()
            .on(windowOpenDescriptor) { _ in .rejected(reason: "first") }
            .on(windowOpenDescriptor) { _ in .success }

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
    }

    @Test @MainActor func readyRequestDispatchesToRegisteredHandler() async throws {
        let response = try await EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.ready) { _ in
                ReadyResult(
                    checkout: nil,
                    credential: nil,
                    ucp: .success(),
                    upgrade: nil,
                    continueURL: nil,
                    messages: nil
                )
            }
            .process(readyFixture())

        let data = try #require(response?.data(using: .utf8))
        let parsed = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil)
        #expect(parsed["params"] == nil)
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == EmbeddedCheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
    }

    @Test @MainActor func malformedReadyParamsReturnInvalidParamsError() async throws {
        let ready = #"""
        {"jsonrpc":"2.0","id":"ready-bad","method":"ec.ready","params":{"delegate":[null]}}
        """#

        let response = try #require(
            await EmbeddedCheckoutProtocol.Client()
                .on(EmbeddedCheckoutProtocol.ready) { _ in
                    ReadyResult(
                        checkout: nil,
                        credential: nil,
                        ucp: .success(),
                        upgrade: nil,
                        continueURL: nil,
                        messages: nil
                    )
                }
                .process(ready)
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-bad")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == EmbeddedCheckoutProtocol.invalidParamsCode)
        #expect(error["message"] as? String == EmbeddedCheckoutProtocol.invalidParamsMessage)
    }

    @Test @MainActor func authRequestDispatchesToRegisteredHandler() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"auth-1","method":"ec.auth","params":{"type":"shop"}}
        """#

        let response = try #require(
            await EmbeddedCheckoutProtocol.Client()
                .on(EmbeddedCheckoutProtocol.auth) { _ in
                    AuthResult(
                        credential: "tok-xyz",
                        ucp: .success(),
                        continueURL: nil,
                        messages: nil
                    )
                }
                .process(request)
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "auth-1")
        let result = try #require(parsed["result"] as? [String: Any])
        #expect(result["credential"] as? String == "tok-xyz")
    }

    @Test @MainActor func paymentCredentialRequestDispatchesWithDecodedCheckout() async throws {
        var receivedCheckoutID: String?
        let response = try #require(
            await EmbeddedCheckoutProtocol.Client()
                .on(EmbeddedCheckoutProtocol.paymentCredential) { checkout in
                    receivedCheckoutID = checkout.id
                    return CredentialResult(
                        checkout: nil,
                        ucp: InstrumentsChangeResultUcp(
                            capabilities: nil,
                            paymentHandlers: nil,
                            services: nil,
                            status: .success,
                            version: EmbeddedCheckoutProtocol.specVersion
                        ),
                        continueURL: nil,
                        messages: nil
                    )
                }
                .process(requestFixture())
        )
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(receivedCheckoutID == "checkout-789")
        #expect(parsed["id"] as? String == "req-456")
        #expect(parsed["result"] != nil)
    }

    @Test @MainActor func delegationsReflectsOnlyDelegationCarryingHandlers() {
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.ready) { _ in
                ReadyResult(
                    checkout: nil,
                    credential: nil,
                    ucp: .success(),
                    upgrade: nil,
                    continueURL: nil,
                    messages: nil
                )
            }
            .on(windowOpenDescriptor) { _ in .success }

        #expect(client.delegations == ["window.open"])
    }
}
