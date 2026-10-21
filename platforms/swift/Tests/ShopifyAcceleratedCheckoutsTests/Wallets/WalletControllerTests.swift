#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
@testable import ShopifyAcceleratedCheckouts
@testable import ShopifyCheckoutKit
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

    // MARK: - fetchCartByCheckoutIdentifier Tests - Cart Identifier

    func test_fetchCartByCheckoutIdentifier_withCartIdentifier_shouldSucceed() async throws {
        let expectedCart = StorefrontAPI.Cart.testCart
        mockStorefront.cartResult = .success(expectedCart)

        controller = MockWalletController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        let result = try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)
        XCTAssertEqual(result.id, expectedCart.id)
    }

    func test_fetchCartByCheckoutIdentifier_withCartIdentifierReturningNil_shouldThrowError() async throws {
        mockStorefront.cartResult = .success(nil)

        controller = MockWalletController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)) { error in
            guard case ShopifyAcceleratedCheckouts.Error.cartAcquisition = error else {
                XCTFail("Expected cartAcquisition error, got: \(error)")
                return
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

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)) { error in
            XCTAssertEqual((error as NSError).domain, "StorefrontError")
            XCTAssertEqual((error as NSError).code, 500)
        }
    }

    // MARK: - fetchCartByCheckoutIdentifier Tests - Cart Provider

    func test_fetchCartByCheckoutIdentifier_withCartProvider_shouldResolveAndLoadCart() async throws {
        let expectedCart = StorefrontAPI.Cart.testCart
        mockStorefront.cartResult = .success(expectedCart)
        var providerCalls = 0

        controller = MockWalletController(
            cartSource: .provider { _ in
                providerCalls += 1
                return .cart("gid://Shopify/Cart/test-cart-id")
            },
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        let result = try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)
        XCTAssertEqual(result.id, expectedCart.id)
        XCTAssertEqual(providerCalls, 1)
    }

    func test_fetchCartByCheckoutIdentifier_withCartProviderReturningInvalidID_shouldThrowCartAcquisition() async throws {
        mockStorefront.cartResult = .success(StorefrontAPI.Cart.testCart)

        controller = MockWalletController(
            cartSource: .provider { _ in .cart("gid://Shopify/ProductVariant/test-variant-id") },
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)) { error in
            guard case ShopifyAcceleratedCheckouts.Error.cartAcquisition = error else {
                XCTFail("Expected cartAcquisition error, got: \(error)")
                return
            }
        }
    }

    func test_fetchCartByCheckoutIdentifier_whenCartProviderThrows_shouldRethrowItsError() async throws {
        controller = MockWalletController(
            cartSource: .provider { _ in throw NSError(domain: "CartProviderError", code: 400, userInfo: nil) },
            storefront: mockStorefront,
            configuration: .testConfiguration
        )

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "CartProviderError")
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

        await XCTAssertThrowsErrorAsync(try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)) { error in
            guard case ShopifyAcceleratedCheckouts.Error.cartAcquisition = error else {
                XCTFail("Expected cartAcquisition error, got: \(error)")
                return
            }
        }
    }

    func test_cartAcquisition_withProviderAccessKey_shouldRetainOnlyDiagnosticCartID() async {
        let secret = "synthetic-cart-secret"
        for cartID in [
            "gid://shopify/Cart/missing?key=\(secret)#synthetic-fragment",
            "invalid-cart?key=\(secret)"
        ] {
            mockStorefront.cartResult = .success(nil)
            controller = MockWalletController(
                cartSource: .provider { _ in .cart(cartID) },
                storefront: mockStorefront,
                configuration: .testConfiguration
            )
            do {
                _ = try await controller.fetchCartByCheckoutIdentifier(wallet: .applePay)
                XCTFail("Expected cart acquisition to fail")
            } catch {
                guard let acquisitionError = error as? ShopifyAcceleratedCheckouts.Error else {
                    XCTFail("Expected cart acquisition error")
                    continue
                }
                guard case let .cartAcquisition(diagnosticID) = acquisitionError else {
                    XCTFail("Expected cart acquisition error")
                    continue
                }
                XCTAssertEqual(diagnosticID, cartID.hasPrefix("gid://shopify/Cart/") ? "gid://shopify/Cart/missing" : nil)
                let diagnostics = [
                    String(describing: error),
                    String(reflecting: error),
                    error.localizedDescription,
                    acquisitionError.toString()
                ]
                for diagnostic in diagnostics {
                    XCTAssertFalse(diagnostic.contains(secret))
                    XCTAssertFalse(diagnostic.contains("synthetic-fragment"))
                    XCTAssertFalse(diagnostic.contains(cartID))
                }
            }
        }
    }

    // MARK: - present Tests

    func testPresentedCheckoutForwardsPublicEventsWithoutProtocolClient() async throws {
        var events: [String] = []
        let buttons = ShopifyAcceleratedCheckoutButtons(cartID: "gid://shopify/Cart/test-cart-id")
            .onStart { _ in events.append("start") }
            .onUpdate { event in
                events.append("update")
                XCTAssertEqual(event.checkout.totals.first?.amount, 1600)
            }
            .onComplete { _ in events.append("complete") }
            .onLinkClick { _ in .cancel }
            .onFail { error in
                events.append("fail")
                XCTAssertEqual(error.code, .sdkError)
            }
            .onDismiss { events.append("dismiss") }
        controller = MockWalletController(
            identifier: .cart(cartID: "gid://shopify/Cart/test-cart-id"),
            storefront: mockStorefront,
            configuration: .testConfiguration
        )
        controller.eventHandlers = buttons.eventHandlers
        controller.mockTopViewController = UIViewController()
        try await controller.present(url: XCTUnwrap(URL(string: "https://example.com/checkout")))

        let webController = try XCTUnwrap(controller.checkoutViewController?.viewControllers.first as? CheckoutWebViewController)
        let checkoutView = try XCTUnwrap(webController.checkoutView)
        let client = try XCTUnwrap(checkoutView.client)
        func message(_ method: String, total: Int = 1000) -> String {
            """
            {"jsonrpc":"2.0","method":"\(method)","params":{"checkout":{
              "id":"checkout-1","currency":"USD","status":"incomplete",
              "line_items":[],"links":[],"totals":[{"type":"total","amount":\(total)}],
              "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
            }}}
            """
        }
        _ = await client.process(message("ec.start"))
        _ = await client.process(message("ec.totals.change", total: 1600))
        _ = await client.process(message("ec.complete", total: 1600))
        let link = try CheckoutLink(url: XCTUnwrap(URL(string: "https://example.com/help")))
        XCTAssertEqual(checkoutView.linkActionProvider?(link), .cancel)
        webController.checkoutViewDidFailWithError(error: CheckoutError(code: .sdkError, message: "Synthetic failure"))
        webController.close()

        XCTAssertEqual(events, ["start", "update", "complete", "fail", "dismiss"])
    }

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

        try await controller.present(url: testURL)

        XCTAssertNotNil(controller.checkoutViewController)
    }
}
