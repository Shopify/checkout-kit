import Testing
import Foundation
@testable import ShopifyCheckoutProtocol

@Suite("Codec Decode Tests")
struct CodecDecodeTests {
    @Test func decodesNotification() throws {
        let json = try fixtureString("notification")
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case .notification(let method, let checkout) = message else {
            Issue.record("Expected .notification, got \(message)")
            return
        }

        #expect(method == "ec.start")
        #expect(checkout.id == "checkout-123")
        #expect(checkout.currency == "USD")
        #expect(checkout.lineItems.count == 1)
        #expect(checkout.lineItems[0].item.title == "Test Product")
    }

    @Test func decodesRequest() throws {
        let json = try fixtureString("request")
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case .request(let id, let method, let checkout) = message else {
            Issue.record("Expected .request, got \(message)")
            return
        }

        #expect(id == "req-456")
        #expect(method == "ec.payment.credential_request")
        #expect(checkout.id == "checkout-789")
        #expect(checkout.currency == "CAD")
    }

    @Test func decodesUnknownMethod() {
        let json = """
        {"jsonrpc":"2.0","method":"ec.unknown","params":{"something":"else"}}
        """
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case .unknown(let method, _) = message else {
            Issue.record("Expected .unknown, got \(message)")
            return
        }

        #expect(method == "ec.unknown")
    }

    @Test func handlesMalformedJSON() {
        let json = "not valid json at all"
        let message = CheckoutProtocol.decode(jsonRpc: json)

        guard case .unknown(let method, _) = message else {
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
