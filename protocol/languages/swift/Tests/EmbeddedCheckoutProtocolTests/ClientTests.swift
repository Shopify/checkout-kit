import Foundation
@testable import EmbeddedCheckoutProtocol
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

private let windowOpenDescriptor = RequestDescriptor<TestURLPayload, RequestMessage<TestURLPayload>, TestDelegationResult>(
    method: "ec.window.open_request",
    delegation: "window.open",
    decode: { params in
        try JSONDecoder().decode(TestURLPayload.self, from: params)
    }
)

private final class DecodeErrorRecorder: @unchecked Sendable {
    private(set) var method: String?
    private(set) var error: Error?

    func record(method: String, error: Error) {
        self.method = method
        self.error = error
    }
}

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
        var receivedCheckout: EmbeddedCheckoutProtocol.Checkout?
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { message in
                receivedCheckout = message.params.checkout
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(receivedCheckout != nil)
        #expect(receivedCheckout?.id == "checkout-123")
    }

    @Test(arguments: ["", ".123"], ["Z", "+05:30", "-04:00"])
    @MainActor func checkoutNotificationsDecodeShippingDates(fraction: String, timeZone: String) async throws {
        let descriptors = [
            EmbeddedCheckoutProtocol.Event.start,
            EmbeddedCheckoutProtocol.Event.fulfillmentChange,
            EmbeddedCheckoutProtocol.Event.totalsChange,
            EmbeddedCheckoutProtocol.Event.complete
        ]
        for descriptor in descriptors {
            var receivedCheckout: EmbeddedCheckoutProtocol.Checkout?
            let client = EmbeddedCheckoutProtocol.Client()
                .on(descriptor) { receivedCheckout = $0.params.checkout }
            let message = """
            {"jsonrpc":"2.0","method":"\(descriptor.method)","params":{"checkout":{
              "id":"checkout-1","currency":"USD","status":"incomplete",
              "line_items":[],"links":[],"totals":[{"type":"total","amount":1500}],
              "expires_at":"2026-09-15T12:00:00\(fraction)\(timeZone)",
              "fulfillment":{"methods":[{"id":"shipping","type":"shipping","line_item_ids":[],
                "groups":[{"id":"group-1","line_item_ids":[],"selected_option_id":"standard",
                  "options":[{"id":"standard","title":"Standard","totals":[],
                    "earliest_fulfillment_time":"2026-09-16T09:00:00\(fraction)\(timeZone)",
                    "latest_fulfillment_time":"2026-09-17T17:00:00\(fraction)\(timeZone)"}]}]}]},
              "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
            }}}
            """

            _ = await client.process(message)

            let checkout = try #require(receivedCheckout, "Dropped \(descriptor.method)")
            let fractionalSeconds = try #require(Double("0" + fraction))
            let expiry = try #require(ISO8601DateFormatter().date(from: "2026-09-15T12:00:00\(timeZone)"))
            let earliest = try #require(ISO8601DateFormatter().date(from: "2026-09-16T09:00:00\(timeZone)"))
            let latest = try #require(ISO8601DateFormatter().date(from: "2026-09-17T17:00:00\(timeZone)"))
            let expiresAt = try #require(checkout.expiresAt)
            #expect(abs(expiresAt.timeIntervalSince(expiry) - fractionalSeconds) < 0.000_001)
            let option = try #require(checkout.fulfillment?.methods?.first?.groups?.first?.options?.first)
            let earliestFulfillmentTime = try #require(option.earliestFulfillmentTime)
            let latestFulfillmentTime = try #require(option.latestFulfillmentTime)
            #expect(abs(earliestFulfillmentTime.timeIntervalSince(earliest) - fractionalSeconds) < 0.000_001)
            #expect(abs(latestFulfillmentTime.timeIntervalSince(latest) - fractionalSeconds) < 0.000_001)
        }
    }

    @Test @MainActor func invalidCheckoutDateReportsDecodeError() async throws {
        let recorder = DecodeErrorRecorder()
        var receivedCheckout = false
        let client = EmbeddedCheckoutProtocol.Client()
            .onDecodeError { method, error, _ in recorder.record(method: method, error: error) }
            .on(EmbeddedCheckoutProtocol.Event.start) { _ in receivedCheckout = true }
        let message = """
        {"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{
          "id":"checkout-1","currency":"USD","status":"incomplete",
          "line_items":[],"links":[],"totals":[],"expires_at":"invalid-date",
          "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
        }}}
        """

        _ = await client.process(message)

        #expect(receivedCheckout == false)
        #expect(recorder.method == "ec.start")
        let error = try #require(recorder.error as? DecodingError)
        guard case let .dataCorrupted(context) = error else {
            Issue.record("Expected an invalid date to report a data-corrupted decoding error")
            return
        }
        #expect(context.codingPath.map(\.stringValue) == ["checkout", "expires_at"])
    }

    @Test @MainActor func notificationDoesNotFireUnregisteredHandler() async throws {
        var completeFired = false
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.complete) { _ in
                completeFired = true
            }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
        #expect(completeFired == false)
    }

    @Test @MainActor func notificationReturnsNil() async throws {
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { _ in }

        let response = try await client.process(notificationFixture())

        #expect(response == nil)
    }

    @Test @MainActor func multipleNotificationHandlersOnDifferentEvents() async throws {
        var startFired = false
        var completeFired = false
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { _ in startFired = true }
            .on(EmbeddedCheckoutProtocol.Event.complete) { _ in completeFired = true }

        _ = try await client.process(notificationFixture())

        #expect(startFired == true)
        #expect(completeFired == false)
    }

    @Test @MainActor func unknownMessageReturnsNil() async {
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { _ in }

        let response = await client.process("not valid json")

        #expect(response == nil)
    }

    @Test @MainActor func notificationDecodeFailureReportsOnDecodeError() async {
        let recorder = DecodeErrorRecorder()
        let client = EmbeddedCheckoutProtocol.Client()
            .onDecodeError { method, error, _ in recorder.record(method: method, error: error) }
            .on(EmbeddedCheckoutProtocol.Event.start) { _ in }

        let bad = #"{"jsonrpc":"2.0","method":"ec.start","params":{}}"#
        _ = await client.process(bad)

        #expect(recorder.method == "ec.start")
        #expect(recorder.error != nil)
    }

    @Test @MainActor func requestDecodeFailureReportsOnDecodeError() async {
        let recorder = DecodeErrorRecorder()
        let client = EmbeddedCheckoutProtocol.Client()
            .onDecodeError { method, error, _ in recorder.record(method: method, error: error) }
            .on(windowOpenDescriptor) { _ in .success }
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":null}}
        """#

        _ = await client.process(request)

        #expect(recorder.method == "ec.window.open_request")
        #expect(recorder.error != nil)
    }

    @Test @MainActor func notificationDecodeFailureReportsOnDecodeErrorRegisteredAfterOn() async {
        let recorder = DecodeErrorRecorder()
        let client = EmbeddedCheckoutProtocol.Client()
            .on(EmbeddedCheckoutProtocol.Event.start) { _ in }
            .onDecodeError { method, error, _ in recorder.record(method: method, error: error) }

        let bad = #"{"jsonrpc":"2.0","method":"ec.start","params":{}}"#
        _ = await client.process(bad)

        #expect(recorder.method == "ec.start")
        #expect(recorder.error != nil)
    }

    @Test @MainActor func requestDecodeFailureReportsOnDecodeErrorRegisteredAfterOn() async {
        let recorder = DecodeErrorRecorder()
        let client = EmbeddedCheckoutProtocol.Client()
            .on(windowOpenDescriptor) { _ in .success }
            .onDecodeError { method, error, _ in recorder.record(method: method, error: error) }
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":null}}
        """#

        _ = await client.process(request)

        #expect(recorder.method == "ec.window.open_request")
        #expect(recorder.error != nil)
    }

    @Test @MainActor func delegationRequestDispatchesToRegisteredHandler() async throws {
        let request = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com/terms"}}
        """#

        let client = EmbeddedCheckoutProtocol.Client()
            .on(windowOpenDescriptor) { message in
                message.params.url == URL(string: "https://example.com/terms") ? .success : .rejected(reason: "unexpected url")
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
            .on(EmbeddedCheckoutProtocol.Event.ready) { _ in
                EmbeddedCheckoutProtocol.ReadyResult(
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
                .on(EmbeddedCheckoutProtocol.Event.ready) { _ in
                    EmbeddedCheckoutProtocol.ReadyResult(
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
                .on(EmbeddedCheckoutProtocol.Event.auth) { _ in
                    EmbeddedCheckoutProtocol.AuthResult(
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
                .on(EmbeddedCheckoutProtocol.Event.paymentCredential) { message in
                    receivedCheckoutID = message.params.checkout.id
                    return EmbeddedCheckoutProtocol.CredentialResult(
                        checkout: nil,
                        ucp: EmbeddedCheckoutProtocol.InstrumentsChangeResultUcp(
                            capabilities: nil,
                            mapOrder: nil,
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
            .on(EmbeddedCheckoutProtocol.Event.ready) { _ in
                EmbeddedCheckoutProtocol.ReadyResult(
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
