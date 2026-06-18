import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

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
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { checkout in
                receivedCheckout = checkout
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(receivedCheckout != nil)
        #expect(receivedCheckout?.id == "checkout-123")
    }

    @Test @MainActor func notificationDoesNotFireUnregisteredHandler() async throws {
        var completeFired = false
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { (_: Checkout) in
                completeFired = true
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(completeFired == false)
    }

    @Test @MainActor func notificationReturnsNil() async throws {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
    }

    @Test @MainActor func multipleNotificationHandlersOnDifferentEvents() async throws {
        var startFired = false
        var completeFired = false
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in startFired = true }
            .on(CheckoutProtocol.complete) { (_: Checkout) in completeFired = true }

        _ = try await client.process(notificationFixture())

        #expect(startFired == true)
        #expect(completeFired == false)
    }

    @Test @MainActor func unknownMessageReturnsNil() async {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { (_: Checkout) in }

        let response = await client.process("not valid json")

        #expect(response == nil)
    }

    @Test @MainActor func windowOpenRequestDispatchesToRegisteredHandler() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com/terms"}}
        """#

        var receivedURL: URL?
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { payload in
                receivedURL = payload.url
                return .success
            }

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])

        #expect(parsed["id"] as? String == "req-window-1")
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
        #expect(receivedURL == URL(string: "https://example.com/terms"))
    }

    @Test @MainActor func windowOpenRequestEncodesRejectedResult() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { _ in
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

    @Test @MainActor func windowOpenRequestReturnsNilWhenHandlerNotRegistered() async {
        let client = CheckoutProtocol.Client()
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let response = await client.process(request)
        #expect(response == nil)
    }

    @Test @MainActor func windowOpenRequestWithNullURLReturnsInvalidParamsError() async throws {
        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { _ in .success }
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

    @Test @MainActor func windowOpenRequestLastHandlerWins() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com"}}
        """#

        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { _ in .rejected(reason: "first") }
            .on(CheckoutProtocol.windowOpen) { _ in .success }

        let response = try #require(await client.process(request))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["status"] as? String == "success")
    }

    @Test @MainActor func windowOpenRequestAdvertisesDelegationInReadyResponse() async throws {
        let ready = #"""
        {"jsonrpc":"2.0","id":"ready-1","method":"ec.ready","params":{"delegate":["window.open"]}}
        """#

        let client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { _ in .success }

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

        let client = CheckoutProtocol.Client()

        let response = try #require(await client.process(ready))
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(response.utf8)) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-bad")
        let error = try #require(parsed["error"] as? [String: Any])
        #expect(error["code"] as? Int == CheckoutProtocol.parseErrorCode)
        #expect(error["message"] as? String == CheckoutProtocol.parseErrorMessage)
    }

    @Test @MainActor func readyReturnsResponse() async throws {
        let client = CheckoutProtocol.Client()

        let response = try await client.process(readyFixture())

        let data = try #require(response?.data(using: .utf8))
        let parsed = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(parsed["id"] as? String == "ready-1")
        #expect(parsed["method"] == nil)
        #expect(parsed["params"] == nil)
        let result = try #require(parsed["result"] as? [String: Any])
        let ucp = try #require(result["ucp"] as? [String: Any])
        #expect(ucp["version"] as? String == CheckoutProtocol.specVersion)
        #expect(ucp["status"] as? String == "success")
    }
}
