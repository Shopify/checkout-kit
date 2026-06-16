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
    var cancelExpectation: XCTestExpectation!

    // MARK: - Setup

    override func setUp() {
        super.setUp()

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

    override func tearDown() {
        viewController = nil
        mockConfiguration = nil
        mockIdentifier = nil
        errorExpectation = nil
        cancelExpectation = nil
        super.tearDown()
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

    // MARK: - Cancel Callback Tests

    @MainActor
    func testCancelCallbackInvoked() async {
        cancelExpectation = expectation(description: "Cancel callback should be invoked")
        let callbackInvokedExpectation = expectation(description: "Cancel callback invoked")

        viewController.eventHandlers = EventHandlers(
            checkoutDidCancel: { [weak self] in
                callbackInvokedExpectation.fulfill()
                self?.cancelExpectation.fulfill()
            }
        )

        viewController.eventHandlers.checkoutDidCancel?()

        await fulfillment(of: [cancelExpectation, callbackInvokedExpectation], timeout: 1.0)
    }

    func testCancelCallbackNotInvokedWhenNil() {
        XCTAssertNil(viewController.eventHandlers.checkoutDidCancel)

        viewController.eventHandlers.checkoutDidCancel?() // Should not crash

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
    func testCheckoutCancelCallback() {
        var cancelInvoked = false
        viewController.eventHandlers = EventHandlers(
            checkoutDidCancel: { cancelInvoked = true }
        )

        viewController.eventHandlers.checkoutDidCancel?()

        XCTAssertTrue(cancelInvoked, "Cancel callback should be invoked")
    }
}
