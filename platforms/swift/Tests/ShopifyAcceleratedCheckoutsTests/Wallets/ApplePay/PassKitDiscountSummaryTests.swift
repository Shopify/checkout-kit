import PassKit
@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
final class PassKitDiscountSummaryTests: XCTestCase {
    private func money(_ amount: Decimal) -> StorefrontAPI.MoneyV2 {
        .init(amount: amount, currencyCode: "USD")
    }

    private func cart() -> StorefrontAPI.Cart {
        let application = StorefrontAPI.CartDiscountApplication(targetSelection: .all, targetType: .lineItem, value: .percentage(.init(percentage: 10)))
        let automatic = StorefrontAPI.CartDiscountAllocation.automatic(.init(discountApplication: application, discountedAmount: money(2), targetType: .lineItem))
        let custom = StorefrontAPI.CartDiscountAllocation.custom(.init(discountApplication: application, discountedAmount: money(1), targetType: .lineItem))
        let lineCode = StorefrontAPI.CartDiscountAllocation.code(.init(code: "SAVE", discountApplication: application, discountedAmount: money(3), targetType: .lineItem))
        let cartCode = StorefrontAPI.CartDiscountAllocation.code(.init(code: "SAVE", discountApplication: application, discountedAmount: money(4), targetType: .lineItem))
        let deliveryTypes: [(StorefrontAPI.CartDeliveryGroupType, Decimal)] = [(.oneTimePurchase, 5), (.subscription, 7)]
        let groups: [StorefrontAPI.CartDeliveryGroup] = deliveryTypes.map { type, price in
            let option = StorefrontAPI.CartDeliveryOption(
                handle: "\(price)",
                title: "Shipping",
                code: nil,
                deliveryMethodType: .shipping,
                description: nil,
                estimatedCost: money(price)
            )
            return .init(id: .init("group-\(price)"), groupType: type, deliveryOptions: [option], selectedDeliveryOption: option)
        }
        return .init(
            id: .init("cart"),
            checkoutUrl: .init(URL(string: "https://example.com/checkout")!),
            totalQuantity: 1,
            buyerIdentity: nil,
            deliveryGroups: .init(nodes: groups),
            delivery: nil,
            lines: .init(nodes: [.init(
                id: .init("line"),
                quantity: 1,
                merchandise: nil,
                cost: .init(totalAmount: money(94), subtotalAmount: money(100)),
                discountAllocations: [automatic, custom, lineCode]
            )]),
            cost: .init(totalAmount: money(115), subtotalAmount: money(100), totalTaxAmount: money(10), totalDutyAmount: money(3)),
            discountCodes: [.init(code: "SAVE", applicable: true), .init(code: "FREESHIP", applicable: true), .init(code: "EXPIRED", applicable: false)],
            discountAllocations: [cartCode]
        )
    }

    func testDiscountAllocationsAvoidDuplicatingCodesAndPreserveCurrency() throws {
        let allocations = try PassKitFactory.shared.createDiscountAllocations(cart: cart())
        XCTAssertEqual(allocations.count, 5)
        XCTAssertTrue(allocations.allSatisfy { $0.currencyCode == "USD" })
        XCTAssertEqual(allocations.filter { $0.code == "SAVE" }.map(\.amount).reduce(0, +), 7)
        XCTAssertEqual(allocations.filter { $0.code == nil }.map(\.amount).reduce(0, +), 3)
        XCTAssertEqual(allocations.filter { $0.code == "FREESHIP" }.map(\.amount), [0])
        XCTAssertFalse(allocations.contains { $0.code == "EXPIRED" })
    }

    func testSummaryGroupsDiscountsAndSeparatesSubscriptionShipping() {
        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart(), merchantName: "Example")
        let amounts = Dictionary(uniqueKeysWithValues: items.map { ($0.label, $0.amount.decimalValue) })
        XCTAssertEqual(items.count, 8)
        XCTAssertEqual(amounts["order_summary.subtotal".localizedString], 100)
        XCTAssertEqual(amounts["order_summary.shipping_one_time_purchase".localizedString], 5)
        XCTAssertEqual(amounts["order_summary.shipping_subscription".localizedString], 7)
        XCTAssertEqual(amounts["order_summary.duties".localizedString], 3)
        XCTAssertEqual(amounts["order_summary.taxes".localizedString], 10)
        XCTAssertEqual(amounts["SAVE"], -7)
        XCTAssertEqual(amounts["order_summary.discount".localizedString], -3)
        XCTAssertNil(amounts["FREESHIP"])
        XCTAssertEqual(items.last?.label, "Example")
        XCTAssertEqual(items.last?.amount.decimalValue, 115)
        XCTAssertEqual(items.dropLast().map { $0.amount.decimalValue }.reduce(0, +), 115)
        XCTAssertTrue(items.allSatisfy { $0.type == .final })
    }

    func testMissingCartCannotProducePaymentItemsOrDiscounts() {
        XCTAssertTrue(PassKitFactory.shared.mapToApplePayLineItems(cart: nil, merchantName: "Example").isEmpty)
        XCTAssertThrowsError(try PassKitFactory.shared.createDiscountAllocations(cart: nil))
    }
}
