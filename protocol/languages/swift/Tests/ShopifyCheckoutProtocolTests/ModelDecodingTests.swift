import Foundation
@testable import ShopifyCheckoutProtocol
import Testing

@Suite("Model Decoding Tests")
struct ModelDecodingTests {
    @Test func roundTripsCheckoutPayload() throws {
        let json = try fixtureString("notification")
        let data = Data(json.utf8)

        let envelope = try JSONDecoder().decode(JSONRPCRequest.self, from: data)
        let checkout = envelope.params?.checkout

        #expect(checkout != nil)
        #expect(checkout?.id == "checkout-123")
        #expect(checkout?.status == .incomplete)
        #expect(checkout?.currency == "USD")
        #expect(checkout?.totals.first?.amount == 2999)
        #expect(checkout?.links.first?.type == "privacy_policy")

        let reEncoded = try JSONEncoder().encode(checkout)
        let reDecoded = try JSONDecoder().decode(Checkout.self, from: reEncoded)

        #expect(reDecoded.id == checkout?.id)
        #expect(reDecoded.currency == checkout?.currency)
        #expect(reDecoded.lineItems.count == checkout?.lineItems.count)
    }

    @Test func decodesLineItemDetails() throws {
        let json = try fixtureString("notification")
        let data = Data(json.utf8)

        let envelope = try JSONDecoder().decode(JSONRPCRequest.self, from: data)
        let lineItem = try #require(envelope.params?.checkout?.lineItems[0])

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
}

private func fixtureString(_ name: String) throws -> String {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    return try String(contentsOf: url, encoding: .utf8)
}
