@testable import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import UIKit
import XCTest

@available(iOS 16.0, *)
@MainActor
final class WalletControllerTests: XCTestCase {
    var mockStorefront: TestStorefrontAPI!
    var controller: MockWalletController!
    override func setUp() async throws {
        try await super.setUp()
        mockStorefront = TestStorefrontAPI()
    }

    override func tearDown() async throws {
        mockStorefront = nil
        controller = nil
        try await super.tearDown()
    }

    class MockWalletController: WalletController {
        var mockTopViewController: UIViewController?

        override func getTopViewController() -> UIViewController? {
            return mockTopViewController
        }
    }

    struct MockClient: CheckoutCommunicationProtocol {
        func process(_: String) async -> String? {
            return nil
        }
    }

    // MARK: - fetchCartByCheckoutIdentifier Tests - Cart Identifier

    func test_fetchCartByCheckoutIdentifier_withCartIdentifier_shouldSucceed() async throws {
        let expectedCart = StorefrontAPI.Cart.testCart
        mockStorefront.cartResult = .success(expectedCart)

        controller = MockWalletController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        let result = try await controller.fetchCartByCheckoutIdentifier()
        XCTAssertEqual(result.id, expectedCart.id)
    }

    func test_fetchCartByCheckoutIdentifier_withCartIdentifierReturningNil_shouldThrowError() async throws {
        mockStorefront.cartResult = .success(nil)

        controller = MockWalletController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier()) { error in
            guard case let ShopifyAcceleratedCheckouts.Error.cartAcquisition(identifier) = error else {
                XCTFail("Expected cartAcquisition error, got: \(error)")
                return
            }

            if case let .cart(cartID) = identifier {
                XCTAssertEqual(cartID, "gid://Shopify/Cart/test-cart-id")
            } else {
                XCTFail("Expected cart identifier, got: \(identifier)")
            }
        }
    }

    func test_fetchCartByCheckoutIdentifier_withCartIdentifierStorefrontError_shouldThrowError() async throws {
        let storefrontError = NSError(domain: "StorefrontError", code: 500, userInfo: nil)
        mockStorefront.cartResult = .failure(storefrontError)

        controller = MockWalletController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier()) { error in
            XCTAssertEqual((error as NSError).domain, "StorefrontError")
            XCTAssertEqual((error as NSError).code, 500)
        }
    }

    // MARK: - fetchCartByCheckoutIdentifier Tests - Variant Identifier

    func test_fetchCartByCheckoutIdentifier_withVariantIdentifier_shouldSucceed() async throws {
        let expectedCart = StorefrontAPI.Cart.testCart
        mockStorefront.cartCreateResult = Result<StorefrontAPI.Cart, Error>.success(expectedCart)

        controller = MockWalletController(
            identifier: .variant(variantID: "gid://Shopify/ProductVariant/test-variant-id", quantity: 2),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        let result = try await controller.fetchCartByCheckoutIdentifier()
        XCTAssertEqual(result.id, expectedCart.id)
        XCTAssertNil(mockStorefront.cartCreateSellingPlanID)
    }

    func test_fetchCartByCheckoutIdentifier_withSubscriptionVariant_forwardsSellingPlanID() async throws {
        let expectedCart = StorefrontAPI.Cart.testCart
        mockStorefront.cartCreateResult = .success(expectedCart)

        controller = MockWalletController(
            identifier: .subscriptionVariant(
                variantID: "gid://Shopify/ProductVariant/test-variant-id",
                quantity: 2,
                sellingPlanID: "gid://Shopify/SellingPlan/test-selling-plan-id"
            ),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        let result = try await controller.fetchCartByCheckoutIdentifier()

        XCTAssertEqual(result.id, expectedCart.id)
        XCTAssertEqual(mockStorefront.cartCreateItems?.count, 2)
        XCTAssertEqual(
            mockStorefront.cartCreateSellingPlanID?.rawValue,
            "gid://Shopify/SellingPlan/test-selling-plan-id"
        )
    }

    func test_fetchCartByCheckoutIdentifier_withVariantIdentifierZeroQuantity_shouldSucceed() async throws {
        let expectedCart = StorefrontAPI.Cart.testCart
        mockStorefront.cartCreateResult = Result<StorefrontAPI.Cart, Error>.success(expectedCart)

        controller = MockWalletController(
            identifier: .variant(variantID: "gid://Shopify/ProductVariant/test-variant-id", quantity: 0),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        let result = try await controller.fetchCartByCheckoutIdentifier()
        XCTAssertEqual(result.id, expectedCart.id)
    }

    func test_fetchCartByCheckoutIdentifier_withVariantIdentifierCartCreateFails_shouldThrowError() async throws {
        let cartCreateError = NSError(domain: "CartCreateError", code: 400, userInfo: nil)
        mockStorefront.cartCreateResult = Result<StorefrontAPI.Cart, Error>.failure(cartCreateError)

        controller = MockWalletController(
            identifier: .variant(variantID: "gid://Shopify/ProductVariant/test-variant-id", quantity: 2),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier()) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "CartCreateError")
            XCTAssertEqual(nsError.code, 400)
        }
    }

    // MARK: - fetchCartByCheckoutIdentifier Tests - Invariant Identifier

    func test_fetchCartByCheckoutIdentifier_withInvariantIdentifier_shouldThrowError() async throws {
        controller = MockWalletController(
            identifier: .invariant(reason: "Invalid identifier"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier()) { error in
            guard case let ShopifyAcceleratedCheckouts.Error.cartAcquisition(identifier) = error else {
                XCTFail("Expected cartAcquisition error, got: \(error)")
                return
            }

            if case let .invariant(reason) = identifier {
                XCTAssertEqual(reason, "Invalid identifier")
            } else {
                XCTFail("Expected invariant identifier, got: \(identifier)")
            }
        }
    }

    // MARK: - present Tests

    func test_present_withValidParameters_shouldSucceed() async throws {
        controller = MockWalletController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        // Mock the top view controller
        let mockViewController = await MainActor.run { UIViewController() }
        controller.mockTopViewController = mockViewController

        let testURL = try XCTUnwrap(URL(string: "https://test.myshopify.com/checkout"))

        try await controller.present(url: testURL, client: MockClient())

        XCTAssertNotNil(controller.checkoutViewController)
    }
}
