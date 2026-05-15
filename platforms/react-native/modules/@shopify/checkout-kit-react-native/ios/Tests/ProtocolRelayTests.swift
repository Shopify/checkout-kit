/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation
@testable import RNShopifyCheckoutKitCasingTransform
import ShopifyCheckoutProtocol
import Testing

@Suite("Protocol Relay Tests")
struct ProtocolRelayTests {
    @Test func envelopeEncodesTypeAndCamelCasePayload() throws {
        let payload = SnakePayload(continueURL: "https://example.com", lineItems: [])
        let envelope = DispatchEnvelope(type: "ec.start", payload: payload)
        let json = try CasingTransform.encodeForJS(envelope)

        let parsed = try #require(
            JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any]
        )
        #expect(parsed["type"] as? String == "ec.start")

        let payloadDict = try #require(parsed["payload"] as? [String: Any])
        #expect(payloadDict["continueUrl"] as? String == "https://example.com")
        #expect(payloadDict["lineItems"] as? [Any] != nil)
        #expect(payloadDict["continue_url"] == nil)
        #expect(payloadDict["line_items"] == nil)
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
        let lineItems = try #require(payload["lineItems"] as? [[String: Any]])
        #expect(lineItems.count == 1)
        let firstItem = try #require(lineItems.first?["item"] as? [String: Any])
        #expect(firstItem["imageUrl"] as? String == "https://example.com/image.png")
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
        "payment_handlers": {}
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
