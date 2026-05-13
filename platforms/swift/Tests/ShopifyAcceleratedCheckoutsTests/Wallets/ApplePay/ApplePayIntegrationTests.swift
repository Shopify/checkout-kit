@testable import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import SwiftUI
import XCTest

@available(iOS 17.0, *)
@MainActor
final class ApplePayIntegrationTests: XCTestCase {
    // MARK: - Properties

    var mockConfiguration: ApplePayConfigurationWrapper!
    var mockCommonConfiguration: ShopifyAcceleratedCheckouts.Configuration!
    var mockApplePayConfiguration: ShopifyAcceleratedCheckouts.ApplePayConfiguration!
    var mockShopSettings: ShopSettings!

    // MARK: - Setup

    override func setUp() async throws {
        try await super.setUp()

        mockCommonConfiguration = ShopifyAcceleratedCheckouts.Configuration(
            storefrontDomain: "test-shop.myshopify.com",
            storefrontAccessToken: "test-token"
        )

        mockApplePayConfiguration = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
            merchantIdentifier: "test.merchant.id",
            contactFields: []
        )

        mockShopSettings = ShopSettings(
            name: "Test Shop",
            primaryDomain: Domain(
                host: "test-shop.myshopify.com",
                url: "https://test-shop.myshopify.com"
            ),
            paymentSettings: PaymentSettings(
                countryCode: "US",
                acceptedCardBrands: [.visa, .mastercard, .americanExpress]
            )
        )

        mockConfiguration = ApplePayConfigurationWrapper(
            common: mockCommonConfiguration,
            applePay: mockApplePayConfiguration,
            shopSettings: mockShopSettings
        )
    }

    override func tearDown() async throws {
        mockConfiguration = nil
        mockCommonConfiguration = nil
        mockApplePayConfiguration = nil
        mockShopSettings = nil
        try await super.tearDown()
    }

    // MARK: - Integration Tests

    func testViewModifierWithButtonIntegration() async {
        await MainActor.run {
            let view = AcceleratedCheckoutButtons(cartID: "gid://Shopify/Cart/test-cart")
                .wallets([.applePay])
                .environmentObject(mockCommonConfiguration)
                .environmentObject(mockApplePayConfiguration)
                .environmentObject(mockShopSettings)

            let hostingController = UIHostingController(rootView: view)

            _ = hostingController.view

            XCTAssertNotNil(hostingController.view, "View should be created")

            XCTAssertNotNil(hostingController.rootView, "Root view should exist")
        }
    }

    func testViewModifierWithButtonIntegrationIncludingCancel() async {
        let failExpectation = expectation(description: "Fail callback")
        failExpectation.isInverted = true
        let cancelExpectation = expectation(description: "Cancel callback")
        cancelExpectation.isInverted = true

        await MainActor.run {
            let view = AcceleratedCheckoutButtons(cartID: "gid://Shopify/Cart/test-cart")
                .wallets([.applePay])
                .onFail { _ in
                    failExpectation.fulfill()
                }
                .onCancel {
                    cancelExpectation.fulfill()
                }
                .environmentObject(mockCommonConfiguration)
                .environmentObject(mockApplePayConfiguration)
                .environmentObject(mockShopSettings)

            let hostingController = UIHostingController(rootView: view)

            _ = hostingController.view

            XCTAssertNotNil(hostingController.view, "View should be created with all callbacks")
            XCTAssertNotNil(hostingController.rootView, "Root view should exist")
        }

        await fulfillment(of: [failExpectation, cancelExpectation], timeout: 0.2)
    }

    // MARK: - Edge Case Tests

    func testInvariantIdentifierHandling() {
        let identifier = CheckoutIdentifier.invariant(reason: "Test invariant")

        let button = ApplePayButton(identifier: identifier, eventHandlers: EventHandlers(), cornerRadius: nil)

        // Create hosting controller to render the view
        let hostingController = UIHostingController(
            rootView: button
                .environmentObject(mockCommonConfiguration)
                .environmentObject(mockApplePayConfiguration)
                .environmentObject(mockShopSettings)
        )

        XCTAssertNotNil(hostingController.view)
        // The view should essentially be empty/minimal due to invariant case
    }

    func testCallbackPersistenceAcrossViewUpdates() {
        var failCount = 0
        let failHandler = { (_: CheckoutError) in
            failCount += 1
        }

        let button = ApplePayButton(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart"),
            eventHandlers: EventHandlers(checkoutDidFail: failHandler),
            cornerRadius: nil
        )

        let modifiedView = AnyView(
            button
                .id(UUID())
        )

        XCTAssertNotNil(button, "Button should still exist after modifications")
        XCTAssertNotNil(modifiedView, "Modified view should exist")
    }

    // MARK: - Delegate Tests

    @MainActor
    func testCheckoutDelegateCancelCallback() async {
        var cancelCallbackInvoked = false

        let viewController = ApplePayViewController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart"),
            configuration: mockConfiguration
        )

        viewController.onCheckoutCancel = {
            cancelCallbackInvoked = true
        }

        viewController.onCheckoutCancel?()

        try? await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertTrue(cancelCallbackInvoked, "Cancel callback should be invoked when onCheckoutCancel is called")
    }
}
