@testable import ShopifyAcceleratedCheckouts
@testable import ShopifyCheckoutKit
import XCTest

@available(iOS 17.0, *)
@MainActor
final class ShopPayCallbackTests: XCTestCase {
    // MARK: - Properties

    var viewController: ShopPayViewController!
    var mockConfiguration: ShopifyAcceleratedCheckouts.Configuration!
    var mockIdentifier: CheckoutIdentifier!
    var errorExpectation: XCTestExpectation!
    var dismissExpectation: XCTestExpectation!

    // MARK: - Setup

    override func setUp() async throws {
        try await super.setUp()

        mockConfiguration = ShopifyAcceleratedCheckouts.Configuration(
            storefrontDomain: "test-shop.myshopify.com",
            storefrontAccessToken: "test-token"
        )

        mockIdentifier = .cart(cartID: "gid://Shopify/Cart/test-cart-id")

        viewController = ShopPayViewController(
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

    @MainActor
    func testErrorCallbackInvoked() async {
        errorExpectation = expectation(description: "Error callback should be invoked")
        let callbackInvokedExpectation = expectation(description: "Error callback invoked")

        viewController.eventHandlers = EventHandlers(
            checkoutDidFail: { [weak self] _ in
                callbackInvokedExpectation.fulfill()
                self?.errorExpectation.fulfill()
            }
        )

        let mockError = CheckoutError.sdkError(underlying: NSError(domain: "TestError", code: 0, userInfo: nil))
        viewController.eventHandlers.checkoutDidFail?(mockError)

        await fulfillment(of: [errorExpectation, callbackInvokedExpectation], timeout: 1.0)
    }

    func testErrorCallbackNotInvokedWhenNil() {
        XCTAssertNil(viewController.eventHandlers.checkoutDidFail)

        let mockError = CheckoutError.sdkError(underlying: NSError(domain: "TestError", code: 0, userInfo: nil))
        viewController.eventHandlers.checkoutDidFail?(mockError) // Should not crash

        XCTAssertTrue(true, "Should not crash when callback is nil")
    }

    // MARK: - Dismiss Callback Tests

    @MainActor
    func testDismissCallbackInvoked() async {
        dismissExpectation = expectation(description: "Dismiss callback should be invoked")
        let callbackInvokedExpectation = expectation(description: "Dismiss callback invoked")

        viewController.eventHandlers = EventHandlers(
            checkoutDidDismiss: { [weak self] in
                callbackInvokedExpectation.fulfill()
                self?.dismissExpectation.fulfill()
            }
        )

        viewController.eventHandlers.checkoutDidDismiss?()

        await fulfillment(of: [dismissExpectation, callbackInvokedExpectation], timeout: 1.0)
    }

    func testDismissCallbackNotInvokedWhenNil() {
        XCTAssertNil(viewController.eventHandlers.checkoutDidDismiss)

        viewController.eventHandlers.checkoutDidDismiss?() // Should not crash

        XCTAssertTrue(true, "Should not crash when callback is nil")
    }

    // MARK: - Delegate Tests

    @MainActor
    func testCheckoutFailCallback() {
        var failInvoked = false
        viewController.eventHandlers = EventHandlers(
            checkoutDidFail: { _ in failInvoked = true }
        )

        let mockError = CheckoutError.sdkError(underlying: NSError(domain: "TestError", code: 0, userInfo: nil))
        viewController.eventHandlers.checkoutDidFail?(mockError)

        XCTAssertTrue(failInvoked, "Fail callback should be invoked")
    }

    @MainActor
    func testCheckoutDismissCallback() {
        var dismissInvoked = false
        viewController.eventHandlers = EventHandlers(
            checkoutDidDismiss: { dismissInvoked = true }
        )

        viewController.eventHandlers.checkoutDidDismiss?()

        XCTAssertTrue(dismissInvoked, "Dismiss callback should be invoked")
    }
}
