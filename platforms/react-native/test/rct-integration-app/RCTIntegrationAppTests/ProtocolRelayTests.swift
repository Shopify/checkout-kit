import Foundation
@testable import RNShopifyCheckoutKit
import XCTest

final class ProtocolRelayTests: XCTestCase {
    func testEnvelopeEncodesTypeAndWireCasePayload() throws {
        let payload = SnakePayload(continueURL: "https://example.com", lineItems: [])
        let envelope = DispatchEnvelope(type: "ec.start", payload: payload)
        let data = try JSONEncoder().encode(envelope)
        let json = try XCTUnwrap(String(data: data, encoding: .utf8))

        let parsed = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["type"] as? String, "ec.start")

        let payloadDict = try XCTUnwrap(parsed["payload"] as? [String: Any])
        XCTAssertEqual(payloadDict["continue_url"] as? String, "https://example.com")
        XCTAssertTrue(payloadDict["line_items"] is [Any])
        XCTAssertNil(payloadDict["continueUrl"])
        XCTAssertNil(payloadDict["lineItems"])
    }

    @MainActor
    func testRelayDispatchesEnvelopeOnEcStart() async throws {
        var captured: String?
        let client = makeRelayClient(
            subscribedMethods: ["ec.start"],
            dispatch: { json in captured = json }
        )

        _ = await client.process(ecStartNotificationFixture)

        let json = try XCTUnwrap(captured)
        let parsed = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["type"] as? String, "ec.start")
        let payload = try XCTUnwrap(parsed["payload"] as? [String: Any])
        XCTAssertEqual(payload["id"] as? String, "checkout-123")
        XCTAssertEqual(payload["currency"] as? String, "USD")
        let lineItems = try XCTUnwrap(payload["line_items"] as? [[String: Any]])
        XCTAssertEqual(lineItems.count, 1)
        let firstItem = try XCTUnwrap(lineItems.first?["item"] as? [String: Any])
        XCTAssertEqual(firstItem["image_url"] as? String, "https://example.com/image.png")
        let ucp = try XCTUnwrap(payload["ucp"] as? [String: Any])
        let paymentHandlers = try XCTUnwrap(ucp["payment_handlers"] as? [String: Any])
        XCTAssertNotNil(paymentHandlers["com.example.loyalty_gold"])
    }

    @MainActor
    func testRelayDispatchesEnvelopeForEveryPublicCheckoutStateEvent() async throws {
        let methods = [
            "ec.complete",
            "ec.fulfillment.change",
            "ec.line_items.change",
            "ec.messages.change",
            "ec.start",
            "ec.totals.change",
        ]

        for method in methods {
            var captured: String?
            let client = makeRelayClient(
                subscribedMethods: [method],
                dispatch: { json in captured = json }
            )

            _ = await client.process(checkoutNotificationFixture(method: method))

            let json = try XCTUnwrap(captured)
            let parsed = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
            XCTAssertEqual(parsed["type"] as? String, method)
            let payload = try XCTUnwrap(parsed["payload"] as? [String: Any])
            XCTAssertEqual(payload["id"] as? String, "checkout-123")
        }
    }

    @MainActor
    func testRelayDispatchesEnvelopeOnEcError() async throws {
        var captured: String?
        let client = makeRelayClient(
            subscribedMethods: ["ec.error"],
            dispatch: { json in captured = json }
        )

        _ = await client.process(ecErrorNotificationFixture)

        let json = try XCTUnwrap(captured)
        let parsed = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        XCTAssertEqual(parsed["type"] as? String, "ec.error")
        let payload = try XCTUnwrap(parsed["payload"] as? [String: Any])
        let messages = try XCTUnwrap(payload["messages"] as? [[String: Any]])
        XCTAssertEqual(messages.first?["content"] as? String, "Something went wrong")
        let ucp = try XCTUnwrap(payload["ucp"] as? [String: Any])
        XCTAssertEqual(ucp["status"] as? String, "error")
    }

    @MainActor
    func testRelayIgnoresMethodsNotInSubscribedList() async {
        var captured: String?
        let client = makeRelayClient(
            subscribedMethods: [],
            dispatch: { json in captured = json }
        )

        _ = await client.process(ecStartNotificationFixture)

        XCTAssertNil(captured)
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

private func checkoutNotificationFixture(method: String) -> String {
    ecStartNotificationFixture.replacingOccurrences(
        of: "\"method\": \"ec.start\"",
        with: "\"method\": \"\(method)\""
    )
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

private let ecErrorNotificationFixture = #"""
{
  "jsonrpc": "2.0",
  "method": "ec.error",
  "params": {
    "error": {
      "ucp": {
        "version": "2026-04-08",
        "status": "error"
      },
      "messages": [
        {
          "type": "error",
          "content": "Something went wrong",
          "severity": "recoverable"
        }
      ]
    }
  }
}
"""#
