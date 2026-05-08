import Testing
import Foundation
@testable import ShopifyCheckoutProtocol

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
        let lineItem = envelope.params!.checkout!.lineItems[0]

        #expect(lineItem.id == "li-1")
        #expect(lineItem.quantity == 1)
        #expect(lineItem.item.title == "Test Product")
        #expect(lineItem.item.price == 2999)
    }
}

private func fixtureString(_ name: String) throws -> String {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    return try String(contentsOf: url, encoding: .utf8)
}
