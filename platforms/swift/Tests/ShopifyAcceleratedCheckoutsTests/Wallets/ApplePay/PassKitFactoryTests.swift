@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
class PassKitFactoryTests: XCTestCase {
    var oneTimePurchaseDeliveryGroup: StorefrontAPI.CartDeliveryGroup!
    var subscriptionDeliveryGroup: StorefrontAPI.CartDeliveryGroup!

    override func setUp() {
        super.setUp()

        // Create delivery options for one-time purchase
        let standardShipping = StorefrontAPI.CartDeliveryOption(
            handle: "1234",
            title: "Standard Shipping",
            code: nil,
            deliveryMethodType: .shipping,
            description: "2 to 3 days",
            estimatedCost: StorefrontAPI.MoneyV2(amount: 10.00, currencyCode: "CAD")
        )

        let expressShipping = StorefrontAPI.CartDeliveryOption(
            handle: "12345",
            title: "Express Shipping",
            code: nil,
            deliveryMethodType: .shipping,
            description: "1 to 2 days",
            estimatedCost: StorefrontAPI.MoneyV2(amount: 20.99, currencyCode: "CAD")
        )

        oneTimePurchaseDeliveryGroup = StorefrontAPI.CartDeliveryGroup(
            id: GraphQLScalars.ID("test-one-time-group"),
            groupType: .oneTimePurchase,
            deliveryOptions: [standardShipping, expressShipping],
            selectedDeliveryOption: nil
        )

        // Create delivery options for subscription
        let subscriptionShipping = StorefrontAPI.CartDeliveryOption(
            handle: "4321",
            title: "Subscription Shipping",
            code: nil,
            deliveryMethodType: .shipping,
            description: "5 to 7 days",
            estimatedCost: StorefrontAPI.MoneyV2(amount: 5.00, currencyCode: "CAD")
        )

        subscriptionDeliveryGroup = StorefrontAPI.CartDeliveryGroup(
            id: GraphQLScalars.ID("test-subscription-group"),
            groupType: .subscription,
            deliveryOptions: [subscriptionShipping],
            selectedDeliveryOption: nil
        )
    }

    override func tearDown() {
        oneTimePurchaseDeliveryGroup = nil
        subscriptionDeliveryGroup = nil
        super.tearDown()
    }

    func testCreateShippingMethodsWithOneTimePurchaseGroup() {
        let result = PassKitFactory.shared.createShippingMethods(
            deliveryGroups: [oneTimePurchaseDeliveryGroup]
        )

        XCTAssertEqual(result.count, 2)

        let firstMethod = result[0]
        XCTAssertEqual(firstMethod.label, "Standard Shipping")
        XCTAssertEqual(firstMethod.amount, NSDecimalNumber(decimal: 10.00))
        XCTAssertEqual(firstMethod.identifier, "1234")
        XCTAssertEqual(firstMethod.detail, "2 to 3 days")

        let secondMethod = result[1]
        XCTAssertEqual(secondMethod.label, "Express Shipping")
        XCTAssertEqual(secondMethod.amount, NSDecimalNumber(decimal: 20.99))
        XCTAssertEqual(secondMethod.identifier, "12345")
        XCTAssertEqual(secondMethod.detail, "1 to 2 days")
    }

    func testCreateShippingMethodsWithEmptyDeliveryGroups() {
        let result = PassKitFactory.shared.createShippingMethods(deliveryGroups: [])
        XCTAssertTrue(result.isEmpty)
    }

    func testCreateShippingMethodsWithNilDeliveryGroups() {
        let result = PassKitFactory.shared.createShippingMethods(deliveryGroups: nil)
        XCTAssertTrue(result.isEmpty)
    }

    func testCreateShippingMethodsWithCombinedGroups() {
        let result = PassKitFactory.shared.createShippingMethods(
            deliveryGroups: [oneTimePurchaseDeliveryGroup, subscriptionDeliveryGroup]
        )

        XCTAssertEqual(result.count, 2)

        let firstCombination = result.first { $0.identifier == "1234,4321" }
        XCTAssertNotNil(firstCombination)
        XCTAssertEqual(firstCombination?.label, "Standard Shipping and Subscription Shipping")
        XCTAssertEqual(firstCombination?.amount, NSDecimalNumber(decimal: 15.00))
        XCTAssertEqual(firstCombination?.detail, "2 to 3 days and 5 to 7 days")

        let secondCombination = result.first { $0.identifier == "12345,4321" }
        XCTAssertNotNil(secondCombination)
        XCTAssertEqual(secondCombination?.label, "Express Shipping and Subscription Shipping")
        XCTAssertEqual(secondCombination?.amount, NSDecimalNumber(decimal: 25.99))
        XCTAssertEqual(secondCombination?.detail, "1 to 2 days and 5 to 7 days")
    }

    func testFixedDiscountAcrossMultipleLinesUsesAllocatedTotalOnce() throws {
        let cart = try makeDiscountCart(
            applications: """
            [{"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"7.00","currencyCode":"USD"},"code":"SAVE7"}]
            """,
            lineSubtotals: ["30.00", "70.00"],
            totalAmount: "93.00"
        )

        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(items.first?.amount, NSDecimalNumber(string: "100.00"))
        XCTAssertEqual(items.filter { $0.label == "SAVE7" }.count, 1)
        XCTAssertEqual(items.first { $0.label == "SAVE7" }?.amount, NSDecimalNumber(string: "-7.00"))
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "93.00"))
        XCTAssertEqual(items.dropLast().reduce(Decimal(0)) { $0 + $1.amount.decimalValue }, 93)
    }

    func testPercentageDiscountUsesAllocatedMoneyAmount() throws {
        let cart = try makeDiscountCart(
            applications: """
            [{"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"17.49","currencyCode":"USD"},"code":"PERCENT15"}]
            """,
            lineSubtotals: ["116.60"],
            totalAmount: "99.11"
        )

        let discounts = try PassKitFactory.shared.createDiscountAllocations(cart: cart)
        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(discounts.count, 1)
        XCTAssertEqual(discounts.first?.amount, Decimal(string: "17.49"))
        XCTAssertEqual(discounts.first?.currencyCode, "USD")
        XCTAssertEqual(items.first { $0.label == "PERCENT15" }?.amount, NSDecimalNumber(string: "-17.49"))
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "99.11"))
    }

    func testAutomaticAndCustomDiscountsShareGeneralLabelAndPreserveCodeLabels() throws {
        let cart = try makeDiscountCart(
            applications: """
            [
                {"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"4.00","currencyCode":"USD"}},
                {"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"1.50","currencyCode":"USD"}},
                {"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"3.00","currencyCode":"USD"},"code":"SAVE"},
                {"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"2.00","currencyCode":"USD"},"code":"SAVE"}
            ]
            """,
            totalAmount: "89.50"
        )

        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(items.first { $0.label == "order_summary.discount".localizedString }?.amount, NSDecimalNumber(string: "-5.50"))
        XCTAssertEqual(items.first { $0.label == "SAVE" }?.amount, NSDecimalNumber(string: "-5.00"))
        XCTAssertEqual(items.filter { $0.amount.decimalValue < 0 }.count, 2)
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "89.50"))
    }

    func testZeroAllocationDoesNotAddDiscountSummaryRow() throws {
        let cart = try makeDiscountCart(
            applications: """
            [{"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"0.00","currencyCode":"USD"},"code":"ZERO"}]
            """,
            totalAmount: "100.00"
        )

        let discounts = try PassKitFactory.shared.createDiscountAllocations(cart: cart)
        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(discounts.first?.amount, 0)
        XCTAssertFalse(items.contains { $0.label == "ZERO" })
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "100.00"))
    }

    func testEmptyApplicationsDoNotAddDiscounts() throws {
        let cart = try makeDiscountCart(
            applications: "[]",
            totalAmount: "100.00"
        )

        XCTAssertTrue(try PassKitFactory.shared.createDiscountAllocations(cart: cart).isEmpty)
    }

    func testSummaryUsesAuthoritativeCartTotal() throws {
        let cart = try makeDiscountCart(
            applications: """
            [{"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"10.00","currencyCode":"USD"},"code":"SAVE10"}]
            """,
            totalAmount: "95.25"
        )

        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(items.last?.label, "Test Shop")
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "95.25"))
    }

    func testFreeShippingDeductsShippingApplicationOnce() throws {
        let cart = try makeDiscountCart(
            applications: """
            [{"targetType":"SHIPPING_LINE","totalAllocatedAmount":{"amount":"10.00","currencyCode":"USD"},"code":"FREESHIP"}]
            """,
            shippingGroups: [("10.00", false)],
            totalAmount: "100.00"
        )

        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(items.first { $0.label == "order_summary.shipping".localizedString }?.amount, NSDecimalNumber(string: "10.00"))
        XCTAssertEqual(items.first { $0.label == "FREESHIP" }?.amount, NSDecimalNumber(string: "-10.00"))
        XCTAssertEqual(items.dropLast().reduce(Decimal(0)) { $0 + $1.amount.decimalValue }, 100)
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "100.00"))
    }

    func testPartialShippingDiscountPreservesEstimatedShippingCost() throws {
        let cart = try makeDiscountCart(
            applications: """
            [{"targetType":"SHIPPING_LINE","totalAllocatedAmount":{"amount":"4.00","currencyCode":"USD"},"code":"SHIP4"}]
            """,
            shippingGroups: [("10.00", false)],
            totalAmount: "106.00"
        )

        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")
        let shippingMethods = PassKitFactory.shared.createShippingMethods(deliveryGroups: cart.deliveryGroups.nodes)

        XCTAssertEqual(items.first { $0.label == "order_summary.shipping".localizedString }?.amount, NSDecimalNumber(string: "10.00"))
        XCTAssertEqual(items.first { $0.label == "SHIP4" }?.amount, NSDecimalNumber(string: "-4.00"))
        XCTAssertEqual(shippingMethods.first?.amount, NSDecimalNumber(string: "10.00"))
        XCTAssertEqual(items.dropLast().reduce(Decimal(0)) { $0 + $1.amount.decimalValue }, 106)
    }

    func testCombinedProductAndShippingCodeAcrossDeliveryGroupsCountsEachApplicationOnce() throws {
        let cart = try makeDiscountCart(
            applications: """
            [
                {"targetType":"LINE_ITEM","totalAllocatedAmount":{"amount":"5.00","currencyCode":"USD"},"code":"COMBINED"},
                {"targetType":"SHIPPING_LINE","totalAllocatedAmount":{"amount":"4.00","currencyCode":"USD"},"code":"COMBINED"}
            ]
            """,
            shippingGroups: [("8.00", false), ("2.00", true)],
            totalAmount: "101.00"
        )

        let items = PassKitFactory.shared.mapToApplePayLineItems(cart: cart, merchantName: "Test Shop")

        XCTAssertEqual(items.first { $0.label == "order_summary.shipping_one_time_purchase".localizedString }?.amount, NSDecimalNumber(string: "8.00"))
        XCTAssertEqual(items.first { $0.label == "order_summary.shipping_subscription".localizedString }?.amount, NSDecimalNumber(string: "2.00"))
        XCTAssertEqual(items.filter { $0.label == "COMBINED" }.count, 1)
        XCTAssertEqual(items.first { $0.label == "COMBINED" }?.amount, NSDecimalNumber(string: "-9.00"))
        XCTAssertEqual(items.dropLast().reduce(Decimal(0)) { $0 + $1.amount.decimalValue }, 101)
        XCTAssertEqual(items.last?.amount, NSDecimalNumber(string: "101.00"))
    }

    private func makeDiscountCart(
        applications: String,
        lineSubtotals: [String] = ["100.00"],
        shippingGroups: [(amount: String, subscription: Bool)] = [],
        totalAmount: String
    ) throws -> StorefrontAPI.Cart {
        let lines = lineSubtotals.enumerated().map { index, subtotal in
            """
            {
                "id":"gid://shopify/CartLine/\(index)",
                "quantity":2,
                "merchandise":null,
                "cost":{
                    "totalAmount":{"amount":"\(subtotal)","currencyCode":"USD"},
                    "subtotalAmount":{"amount":"\(subtotal)","currencyCode":"USD"}
                }
            }
            """
        }
        let groups = shippingGroups.enumerated().map { index, group in
            let option = """
            {
                "handle":"shipping-\(index)",
                "title":"Shipping \(index)",
                "deliveryMethodType":"SHIPPING",
                "estimatedCost":{"amount":"\(group.amount)","currencyCode":"USD"}
            }
            """
            return """
            {
                "id":"gid://shopify/CartDeliveryGroup/\(index)",
                "groupType":"\(group.subscription ? "SUBSCRIPTION" : "ONE_TIME_PURCHASE")",
                "deliveryOptions":[\(option)],
                "selectedDeliveryOption":\(option)
            }
            """
        }
        let json = """
        {
            "id":"gid://shopify/Cart/discount-test",
            "checkoutUrl":"https://test-shop.myshopify.com/checkout",
            "totalQuantity":\(lineSubtotals.count * 2),
            "deliveryGroups":{"nodes":[\(groups.joined(separator: ","))]},
            "lines":{"nodes":[\(lines.joined(separator: ","))]},
            "cost":{"totalAmount":{"amount":"\(totalAmount)","currencyCode":"USD"}},
            "discountApplications":\(applications)
        }
        """
        return try JSONDecoder().decode(StorefrontAPI.Cart.self, from: Data(json.utf8))
    }
}
