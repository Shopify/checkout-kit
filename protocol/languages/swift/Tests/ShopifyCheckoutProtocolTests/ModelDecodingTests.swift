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
