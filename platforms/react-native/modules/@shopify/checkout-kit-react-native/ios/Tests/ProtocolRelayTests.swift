import Foundation
@testable import RNShopifyCheckoutKitProtocolRelay
import ShopifyCheckoutProtocol
import Testing

@Suite("Protocol Relay Tests")
struct ProtocolRelayTests {
    @Test func envelopeEncodesTypeAndWireCasePayload() throws {
        let payload = SnakePayload(continueURL: "https://example.com", lineItems: [])
        let envelope = DispatchEnvelope(type: "ec.start", payload: payload)
        let data = try JSONEncoder().encode(envelope)
        let json = try #require(String(data: data, encoding: .utf8))

        let parsed = try #require(
            JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any]
        )
        #expect(parsed["type"] as? String == "ec.start")

        let payloadDict = try #require(parsed["payload"] as? [String: Any])
        #expect(payloadDict["continue_url"] as? String == "https://example.com")
        #expect(payloadDict["line_items"] as? [Any] != nil)
        #expect(payloadDict["continueUrl"] == nil)
        #expect(payloadDict["lineItems"] == nil)
    }

    @MainActor
    @Test func relayDispatchesEnvelopeOnEcStart() async throws {
        var captured: String?
        let client = makeRelayClient(
            subscribedMethods: ["ec.start"],
            dispatch: { json in captured = json }
        )

        _ = await client.process(ecStartNotificationFixture)

        let json = try #require(captured)
        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        #expect(parsed["type"] as? String == "ec.start")
        let payload = try #require(parsed["payload"] as? [String: Any])
        #expect(payload["id"] as? String == "checkout-123")
        #expect(payload["currency"] as? String == "USD")
        let lineItems = try #require(payload["line_items"] as? [[String: Any]])
        #expect(lineItems.count == 1)
        let firstItem = try #require(lineItems.first?["item"] as? [String: Any])
        #expect(firstItem["image_url"] as? String == "https://example.com/image.png")
        let ucp = try #require(payload["ucp"] as? [String: Any])
        let paymentHandlers = try #require(ucp["payment_handlers"] as? [String: Any])
        #expect(paymentHandlers["com.example.loyalty_gold"] != nil)
    }

    @MainActor
    @Test func relayIgnoresMethodsNotInSubscribedList() async throws {
        var captured: String?
        let client = makeRelayClient(
            subscribedMethods: [],
            dispatch: { json in captured = json }
        )

        _ = await client.process(ecStartNotificationFixture)

        #expect(captured == nil)
    }
}

private struct SnakePayload: Codable {
    let continueURL: String
    let lineItems: [String]

    enum CodingKeys: String, CodingKey {
        case continueURL = "continue_url"
        case lineItems = "line_items"
    }
}

private let ecStartNotificationFixture = #"""
{
  "jsonrpc": "2.0",
  "method": "ec.start",
  "params": {
    "checkout": {
      "ucp": {
        "version": "2026-04-08",
        "payment_handlers": {
          "com.example.loyalty_gold": []
        }
      },
      "id": "checkout-123",
      "status": "incomplete",
      "currency": "USD",
      "line_items": [
        {
          "id": "li-1",
          "quantity": 1,
          "item": {
            "id": "product-1",
            "title": "Test Product",
            "price": 2999,
            "image_url": "https://example.com/image.png"
          },
          "totals": [
            {"type": "subtotal", "amount": 2999}
          ]
        }
      ],
      "totals": [
        {"type": "total", "amount": 2999}
      ],
      "links": [
        {"type": "privacy_policy", "url": "https://example.com/privacy"}
      ]
    }
  }
}
"""#
