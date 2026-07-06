import Foundation
@testable import EmbeddedCheckoutProtocol
import Testing

@Suite("Model Decoding Tests")
struct ModelDecodingTests {
    @Test func roundTripsCheckoutPayload() throws {
        let json = try fixtureString("notification")
        let data = Data(json.utf8)

        let envelope = try JSONDecoder().decode(JSONRPCRequest<JSONRPCCheckoutParams>.self, from: data)
        let checkout = envelope.params.checkout

        #expect(checkout.id == "checkout-123")
        #expect(checkout.status == .incomplete)
        #expect(checkout.currency == "USD")
        #expect(checkout.totals.first?.amount == 2999)
        #expect(checkout.links.first?.type == "privacy_policy")

        let reEncoded = try JSONEncoder().encode(checkout)
        let reDecoded = try JSONDecoder().decode(Checkout.self, from: reEncoded)

        #expect(reDecoded.id == checkout.id)
        #expect(reDecoded.currency == checkout.currency)
        #expect(reDecoded.lineItems.count == checkout.lineItems.count)
    }

    @Test func decodesLineItemDetails() throws {
        let json = try fixtureString("notification")
        let data = Data(json.utf8)

        let envelope = try JSONDecoder().decode(JSONRPCRequest<JSONRPCCheckoutParams>.self, from: data)
        let lineItem = envelope.params.checkout.lineItems[0]

        #expect(lineItem.id == "li-1")
        #expect(lineItem.quantity == 1)
        #expect(lineItem.item.title == "Test Product")
        #expect(lineItem.item.price == 2999)
    }

    @Test func decodesAllMessageTypes() throws {
        let cases: [(wireValue: String, expected: MessageType)] = [
            ("error", .error),
            ("warning", .warning),
            ("info", .info),
        ]

        for testCase in cases {
            let json = """
            {"content":"\(testCase.wireValue) message","type":"\(testCase.wireValue)"}
            """
            let message = try JSONDecoder().decode(Message.self, from: Data(json.utf8))

            #expect(message.content == "\(testCase.wireValue) message")
            #expect(message.type == testCase.expected)
        }
    }

    @Test func decodesCheckoutExtensionFields() throws {
        let json = """
        {
          "id": "checkout-123",
          "currency": "USD",
          "discounts": {
            "codes": ["SUMMER20"],
            "applied": [
              {
                "amount": 500,
                "code": "SUMMER20",
                "method": "across",
                "title": "Summer sale",
                "allocations": [
                  {
                    "amount": 500,
                    "path": "$.line_items[0]"
                  }
                ]
              }
            ]
          },
          "fulfillment": {
            "available_methods": [
              {
                "line_item_ids": ["li-1"],
                "type": "shipping"
              }
            ],
            "methods": [
              {
                "id": "pickup-main",
                "line_item_ids": ["li-1"],
                "type": "pickup"
              }
            ]
          },
          "line_items": [],
          "links": [],
          "status": "incomplete",
          "totals": [],
          "ucp": {
            "payment_handlers": {},
            "version": "2026-04-08"
          }
        }
        """
        let checkout = try JSONDecoder().decode(Checkout.self, from: Data(json.utf8))

        #expect(checkout.discounts?.codes == ["SUMMER20"])
        #expect(checkout.discounts?.applied?.first?.method == .across)
        #expect(checkout.discounts?.applied?.first?.allocations?.first?.path == "$.line_items[0]")
        #expect(checkout.fulfillment?.availableMethods?.first?.type == .shipping)
        #expect(checkout.fulfillment?.methods?.first?.id == "pickup-main")
        #expect(checkout.fulfillment?.methods?.first?.type == .pickup)
    }

    @Test func decodesOrderLineItemQuantity() throws {
        let json = """
        {
          "id": "li-1",
          "item": {
            "id": "sku-1",
            "price": 1000,
            "title": "Socks"
          },
          "quantity": {
            "fulfilled": 1,
            "original": 2,
            "total": 2
          },
          "status": "partial",
          "totals": []
        }
        """
        let lineItem = try JSONDecoder().decode(OrderLineItem.self, from: Data(json.utf8))
        let quantity: LineItemQuantity = lineItem.quantity

        #expect(quantity.fulfilled == 1)
        #expect(quantity.original == 2)
        #expect(quantity.total == 2)
        #expect(lineItem.status == .partial)
    }

    @Test func decodesEmbeddedColorSchemes() throws {
        let json = """
        {
          "color_scheme": ["light", "dark"],
          "delegate": ["window.open"]
        }
        """
        let config = try JSONDecoder().decode(EmbeddedTransportConfig.self, from: Data(json.utf8))
        let colorScheme: [EmbeddedColorScheme]? = config.colorScheme

        #expect(colorScheme == [.light, .dark])
        #expect(config.delegate == ["window.open"])
    }

    @Test func preservesUnknownExtensionKeysOnCheckout() throws {
        let json = """
        {
          "id": "checkout-123",
          "currency": "USD",
          "line_items": [],
          "links": [],
          "status": "incomplete",
          "totals": [],
          "ucp": {"payment_handlers": {}, "version": "2026-04-08"},
          "signals": {"dev.ucp.buyer_ip": "203.0.113.7", "com.example.device_id": "abc-123"},
          "com.example.foo": "bar"
        }
        """
        let checkout = try JSONDecoder().decode(Checkout.self, from: Data(json.utf8))
        let reEncoded = try JSONEncoder().encode(checkout)
        let object = try #require(try JSONSerialization.jsonObject(with: reEncoded) as? [String: Any])

        #expect(object["com.example.foo"] as? String == "bar")

        let signals = try #require(object["signals"] as? [String: Any])
        #expect(signals["dev.ucp.buyer_ip"] as? String == "203.0.113.7")
        #expect(signals["com.example.device_id"] as? String == "abc-123")
    }
}

private func fixtureString(_ name: String) throws -> String {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    return try String(contentsOf: url, encoding: .utf8)
}
