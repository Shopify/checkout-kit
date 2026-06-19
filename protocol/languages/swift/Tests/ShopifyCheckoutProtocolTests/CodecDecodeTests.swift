import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("Codec Decode Tests")
struct CodecDecodeTests {
    @Test func decodesNotification() throws {
        let json = try fixtureString("notification")
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .notification(method, payload) = message else {
            Issue.record("Expected .notification, got \(message)")
            return
        }
        let checkout = try #require(payload as? Checkout)

        #expect(method == "ec.start")
        #expect(checkout.id == "checkout-123")
        #expect(checkout.currency == "USD")
        #expect(checkout.lineItems.count == 1)
        #expect(checkout.lineItems[0].item.title == "Test Product")
    }

    @Test func decodesErrorNotification() throws {
        let json = #"""
        {"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"version":"2026-04-08","status":"error"},"messages":[{"type":"error","code":"unrecoverable","content":"Boom.","severity":"recoverable"}]}}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .notification(method, payload) = message else {
            Issue.record("Expected .notification, got \(message)")
            return
        }
        let error = try #require(payload as? ErrorResponse)

        #expect(method == "ec.error")
        #expect(error.ucp.version == "2026-04-08")
        #expect(error.ucp.status == .error)
        #expect(error.messages.first?.content == "Boom.")
    }

    @Test func decodesRequestCarriesRawParams() throws {
        let json = try fixtureString("request")
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .request(id, method, params) = message else {
            Issue.record("Expected .request, got \(message)")
            return
        }

        #expect(id == "req-456")
        #expect(method == "ec.payment.credential_request")

        let parsed = try #require(
            JSONSerialization.jsonObject(with: params) as? [String: Any]
        )
        let checkout = try #require(parsed["checkout"] as? [String: Any])
        #expect(checkout["id"] as? String == "checkout-789")
        #expect(checkout["currency"] as? String == "CAD")
    }

    @Test func decodesWindowOpenRequestAsRawRequest() throws {
        let json = try fixtureString("window_open_request")
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .request(id, method, params) = message else {
            Issue.record("Expected .request, got \(message)")
            return
        }

        #expect(id == "req-window-1")
        #expect(method == "ec.window.open_request")

        let parsed = try #require(JSONSerialization.jsonObject(with: params) as? [String: Any])
        #expect(parsed["url"] as? String == "https://example.com/terms")
    }

    @Test func windowOpenRequestDropsUnknownParamsBeforeDispatch() throws {
        let json = #"""
        {"jsonrpc":"2.0","id":"req-window-1","method":"ec.window.open_request","params":{"url":"https://example.com/terms","unknown":"value"}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .request(_, _, params) = message else {
            Issue.record("Expected .request, got \(message)")
            return
        }

        let parsed = try #require(JSONSerialization.jsonObject(with: params) as? [String: Any])
        #expect(parsed["url"] as? String == "https://example.com/terms")
        #expect(parsed["unknown"] == nil)
    }

    @Test func decodesMalformedWindowOpenParamsAsInvalidParamsError() {
        let json = #"""
        {"jsonrpc":"2.0","id":"req-window-bad","method":"ec.window.open_request","params":{"url":null}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .error(id, code, responseMessage) = message else {
            Issue.record("Expected .error, got \(message)")
            return
        }

        #expect(id == "req-window-bad")
        #expect(code == -32602)
        #expect(responseMessage == "Invalid params")
    }

    @Test func decodesUnknownMethod() {
        let json = """
        {"jsonrpc":"2.0","method":"ec.unknown","params":{"something":"else"}}
        """
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .unknown(method, _) = message else {
            Issue.record("Expected .unknown, got \(message)")
            return
        }

        #expect(method == "ec.unknown")
    }

    @Test func decodesReadyRequestWithNumericID() {
        let json = #"""
        {"jsonrpc":"2.0","id":1,"method":"ec.ready","params":{"delegate":[]}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .ready(id, delegations) = message else {
            Issue.record("Expected .ready, got \(message)")
            return
        }

        #expect(id == .int(1))
        #expect(delegations.isEmpty)
    }

    @Test func decodesReadyRequestWithNullID() {
        let json = #"""
        {"jsonrpc":"2.0","id":null,"method":"ec.ready","params":{"delegate":[]}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .ready(id, delegations) = message else {
            Issue.record("Expected .ready, got \(message)")
            return
        }

        #expect(id == .null)
        #expect(delegations.isEmpty)
    }

    @Test func decodesReadyRequestWithMissingParamsAsEmptyDelegations() {
        let json = #"""
        {"jsonrpc":"2.0","id":"ready-no-params","method":"ec.ready"}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .ready(id, delegations) = message else {
            Issue.record("Expected .ready, got \(message)")
            return
        }

        #expect(id == "ready-no-params")
        #expect(delegations.isEmpty)
    }

    @Test func decodesMalformedReadyParamsAsParseError() {
        let json = #"""
        {"jsonrpc":"2.0","id":"ready-bad","method":"ec.ready","params":{"delegate":[null]}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .error(id, code, responseMessage) = message else {
            Issue.record("Expected .error, got \(message)")
            return
        }

        #expect(id == "ready-bad")
        #expect(code == CheckoutTransport.parseErrorCode)
        #expect(responseMessage == CheckoutTransport.parseErrorMessage)
    }

    @Test func decodesNullReadyParamsAsParseError() {
        let json = #"""
        {"jsonrpc":"2.0","id":"ready-null","method":"ec.ready","params":null}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .error(id, code, responseMessage) = message else {
            Issue.record("Expected .error, got \(message)")
            return
        }

        #expect(id == "ready-null")
        #expect(code == CheckoutTransport.parseErrorCode)
        #expect(responseMessage == CheckoutTransport.parseErrorMessage)
    }

    @Test func rejectsFractionalJSONRPCID() {
        let json = #"""
        {"jsonrpc":"2.0","id":1.5,"method":"ec.ready","params":{"delegate":[]}}
        """#
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .unknown(method, _) = message else {
            Issue.record("Expected .unknown for fractional id, got \(message)")
            return
        }

        #expect(method == "")
    }

    @Test func handlesMalformedJSON() {
        let json = "not valid json at all"
        let message = CheckoutTransport.decode(jsonRpc: json)

        guard case let .unknown(method, _) = message else {
            Issue.record("Expected .unknown for malformed JSON, got \(message)")
            return
        }

        #expect(method == "")
    }
}

private func fixtureString(_ name: String) throws -> String {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    return try String(contentsOf: url, encoding: .utf8)
}
