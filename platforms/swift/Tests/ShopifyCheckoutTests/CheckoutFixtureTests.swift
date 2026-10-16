#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation
import ShopifyCheckoutKit
import XCTest

/// Fixtures the way apps build them: protocol model initializers, or a decoded JSON snapshot.
/// Uses a non-testable import of Checkout Kit.
final class CheckoutFixtureTests: XCTestCase {
    func testSnapshotBuildsFromProtocolModelInitializers() {
        let lineItem = LineItem(
            id: "line-1",
            item: Item(id: "gid://shopify/ProductVariant/1", price: 2500, title: "T-shirt"),
            quantity: 1,
            totals: [LineItemTotal(amount: 2500, type: "subtotal")]
        )
        let checkout = Checkout(
            id: "fixture-checkout",
            status: .incomplete,
            currency: "USD",
            lineItems: [lineItem],
            totals: [CheckoutTotal(amount: 2500, type: "total")]
        )
        let renamed = lineItem.with { $0.parentID = "line-0" }

        XCTAssertEqual(CheckoutUpdateEvent(checkout: checkout).checkout.lineItems.first?.item.title, "T-shirt")
        XCTAssertEqual(renamed.parentID, "line-0")
        XCTAssertNil(lineItem.parentID)
    }

    func testSnapshotDecodesFromJSONWithLineItemsAndTotals() throws {
        let checkout = try JSONDecoder().decode(Checkout.self, from: Data("""
        {
          "id": "fixture-checkout",
          "currency": "USD",
          "status": "incomplete",
          "line_items": [
            {
              "id": "line-1",
              "item": {"id": "gid://shopify/ProductVariant/1", "title": "T-shirt", "price": 2500},
              "quantity": 1,
              "totals": [{"type": "subtotal", "amount": 2500}]
            }
          ],
          "links": [],
          "totals": [{"type": "total", "amount": 2500}]
        }
        """.utf8))

        XCTAssertEqual(checkout.id, "fixture-checkout")
        XCTAssertEqual(checkout.status, .incomplete)
        XCTAssertEqual(checkout.lineItems.first?.item.title, "T-shirt")
        XCTAssertEqual(checkout.totals.first?.amount, 2500)
        XCTAssertEqual(CheckoutUpdateEvent(checkout: checkout).checkout.id, "fixture-checkout")
    }
}
