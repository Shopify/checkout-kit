@testable import ShopifyAcceleratedCheckouts
@testable import ShopifyCheckoutKit
import XCTest

@available(iOS 17.0, *)
@MainActor
final class ApplePayCallbackTests: XCTestCase {
    // MARK: - Properties

    var viewController: ApplePayViewController!
    var mockConfiguration: ApplePayConfigurationWrapper!
    var mockIdentifier: CheckoutIdentifier!
    var errorExpectation: XCTestExpectation!
    var dismissExpectation: XCTestExpectation!

    // MARK: - Setup

    override func setUp() async throws {
        try await super.setUp()

        // Create mock configuration
        let commonConfig = ShopifyAcceleratedCheckouts.Configuration(
            storefrontDomain: "test-shop.myshopify.com",
            storefrontAccessToken: "test-token"
        )

        let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
            merchantIdentifier: "test.merchant.id",
            contactFields: []
        )

        let shopSettings = ShopSettings(
            name: "Test Shop",
            primaryDomain: Domain(
                host: "test-shop.myshopify.com",
                url: "https://test-shop.myshopify.com"
            ),
            paymentSettings: PaymentSettings(countryCode: "US", acceptedCardBrands: [.visa, .mastercard])
        )

        mockConfiguration = ApplePayConfigurationWrapper(
            common: commonConfig,
            applePay: applePayConfig,
            shopSettings: shopSettings
        )

        mockIdentifier = .cart(cartID: "gid://Shopify/Cart/test-cart-id")

        // Create SUT
        viewController = ApplePayViewController(
            identifier: mockIdentifier,
            configuration: mockConfiguration
        )
    }

    override func tearDown() async throws {
        viewController = nil
        mockConfiguration = nil
        mockIdentifier = nil
        errorExpectation = nil
        dismissExpectation = nil
        try await super.tearDown()
    }

    // MARK: - Error Callback Tests

    func testErrorCallbackInvoked() async {
        errorExpectation = expectation(description: "Error callback should be invoked")
        let callbackInvokedExpectation = expectation(description: "Error callback invoked")

        await MainActor.run {
            viewController.onCheckoutFail = { [weak self] _ in
                callbackInvokedExpectation.fulfill()
                self?.errorExpectation.fulfill()
            }
        }

        await MainActor.run {
            let mockError = CheckoutError.sdkError(underlying: NSError(domain: "TestError", code: 0, userInfo: nil))
            viewController.onCheckoutFail?(mockError)
        }

        await fulfillment(of: [errorExpectation, callbackInvokedExpectation], timeout: 1.0)
    }

    func testErrorCallbackNotInvokedWhenNil() async {
        await MainActor.run {
            XCTAssertNil(viewController.onCheckoutFail)
        }

        await MainActor.run {
            let mockError = CheckoutError.sdkError(underlying: NSError(domain: "TestError", code: 0, userInfo: nil))
            viewController.onCheckoutFail?(mockError) // Should not crash
        }

        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        XCTAssertTrue(true, "Should not crash when callback is nil")
    }

    // MARK: - Dismiss Callback Tests

    func testDismissCallbackInvoked() async {
        dismissExpectation = expectation(description: "Dismiss callback should be invoked")
        let callbackInvokedExpectation = expectation(description: "Dismiss callback invoked")

        await MainActor.run {
            viewController.onCheckoutDismiss = { [weak self] in
                callbackInvokedExpectation.fulfill()
                self?.dismissExpectation.fulfill()
            }
        }

        await MainActor.run {
            viewController.onCheckoutDismiss?()
        }

        await fulfillment(of: [dismissExpectation, callbackInvokedExpectation], timeout: 1.0)
    }

    func testDismissCallbackNotInvokedWhenNil() async {
        let isNil = await MainActor.run {
            viewController.onCheckoutDismiss == nil
        }
        XCTAssertTrue(isNil, "onDismiss should be nil")

        await MainActor.run {
            viewController.onCheckoutDismiss?() // Should not crash
        }

        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        XCTAssertTrue(true, "Should not crash when callback is nil")
    }

    // MARK: - No Callback Tests

    @MainActor
    func testNoFailCallbackWhenCheckoutIsDismissed() async {
        var errorInvoked = false
        var dismissInvoked = false

        viewController.onCheckoutFail = { _ in
            errorInvoked = true
        }
        viewController.onCheckoutDismiss = {
            dismissInvoked = true
        }

        viewController.onCheckoutDismiss?()

        try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
        XCTAssertFalse(errorInvoked, "Error callback should not be invoked")
        XCTAssertTrue(dismissInvoked, "Dismiss callback should be invoked")
    }

    // MARK: - Thread Safety Tests

    @MainActor
    func testCallbackThreadSafety() async {
        let iterations = 10 // Even distribution between error and dismissal
        let errorExpectations = (0 ..< iterations / 2).map { _ in expectation(description: "Error") }
        let dismissExpectations = (0 ..< iterations / 2).map { _ in expectation(description: "Dismiss") }

        var errorIndex = 0
        var dismissIndex = 0

        viewController.onCheckoutFail = { _ in
            if errorIndex < errorExpectations.count {
                errorExpectations[errorIndex].fulfill()
                errorIndex += 1
            }
        }
        viewController.onCheckoutDismiss = {
            if dismissIndex < dismissExpectations.count {
                dismissExpectations[dismissIndex].fulfill()
                dismissIndex += 1
            }
        }

        for i in 0 ..< iterations {
            if i % 2 == 0 {
                let mockError = CheckoutError.sdkError(underlying: NSError(domain: "TestError", code: 0, userInfo: nil))
                viewController.onCheckoutFail?(mockError)
            } else {
                viewController.onCheckoutDismiss?()
            }

            // Give time for callback to execute
            try? await Task.sleep(nanoseconds: 50_000_000) // 0.05 seconds
        }

        // Wait for all expectations
        await fulfillment(of: errorExpectations + dismissExpectations, timeout: 2.0)
    }

    // MARK: - Edge Case Tests

    func testMultipleDismissCallbackAssignments() async {
        let firstCallbackExpectation = expectation(description: "First dismiss callback")
        firstCallbackExpectation.isInverted = true
        let secondCallbackExpectation = expectation(description: "Second dismiss callback")

        await MainActor.run {
            // First assignment
            viewController.onCheckoutDismiss = {
                firstCallbackExpectation.fulfill()
            }

            // Second assignment (should replace first)
            viewController.onCheckoutDismiss = {
                secondCallbackExpectation.fulfill()
            }
        }

        await MainActor.run {
            viewController.onCheckoutDismiss?()
        }

        await fulfillment(of: [secondCallbackExpectation], timeout: 1.0)
        await fulfillment(of: [firstCallbackExpectation], timeout: 0.2)
    }
}

// Mock types are no longer needed since we're testing callbacks directly
