import PassKit
#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
@testable import ShopifyAcceleratedCheckouts
@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@available(iOS 17.0, *)
@MainActor
class ApplePayViewControllerTests: XCTestCase {
    var viewController: MockApplePayViewController!
    var mockConfiguration: ApplePayConfigurationWrapper!
    var mockStorefront: TestStorefrontAPI!
    var mockAuthorizationDelegate: MockApplePayAuthorizationDelegate!

    override func setUp() async throws {
        try await super.setUp()

        // Create mock shop settings
        let paymentSettings = PaymentSettings(
            countryCode: "US",
            acceptedCardBrands: [.visa, .mastercard]
        )
        let primaryDomain = Domain(
            host: "test-shop.myshopify.com",
            url: "https://test-shop.myshopify.com"
        )
        let shopSettings = ShopSettings(
            name: "Test Shop",
            primaryDomain: primaryDomain,
            paymentSettings: paymentSettings
        )

        // Create common configuration
        let commonConfig = ShopifyAcceleratedCheckouts.Configuration(
            storefrontDomain: "test-shop.myshopify.com",
            storefrontAccessToken: "test-token"
        )

        // Create Apple Pay configuration
        let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
            merchantIdentifier: "test.merchant",
            contactFields: []
        )

        // Create configuration wrapper
        mockConfiguration = ApplePayConfigurationWrapper(
            common: commonConfig,
            applePay: applePayConfig,
            shopSettings: shopSettings
        )

        // Create mock storefront
        mockStorefront = TestStorefrontAPI()

        // Create system under test first
        let identifier = CheckoutIdentifier.cart(cartID: "gid://Shopify/Cart/test-cart-id")
        viewController = MockApplePayViewController(
            identifier: identifier,
            configuration: mockConfiguration
        )

        // Create mock authorization delegate with the created viewController
        mockAuthorizationDelegate = MockApplePayAuthorizationDelegate(
            configuration: mockConfiguration,
            controller: viewController
        )

        // Inject mocks
        viewController.storefront = mockStorefront
        viewController.setMockAuthorizationDelegate(mockAuthorizationDelegate)
    }

    override func tearDown() async throws {
        viewController = nil
        mockConfiguration = nil
        mockStorefront = nil
        mockAuthorizationDelegate = nil
        try await super.tearDown()
    }

    class MockApplePayAuthorizationDelegate: ApplePayAuthorizationDelegate {
        var transitionHistory: [ApplePayState] = []
        var onTransition: ((ApplePayState) -> Void)?
        var setCartCalls: [StorefrontAPI.Types.Cart] = []
        var shouldThrowOnTransition = false
        var shouldThrowOnSetCart = false

        override func transition(to state: ApplePayState) async throws {
            transitionHistory.append(state)
            onTransition?(state)
            if shouldThrowOnTransition {
                throw NSError(domain: "MockError", code: 1, userInfo: nil)
            }
            // Don't call super to avoid actual state machine logic
        }

        override func setCart(to cart: StorefrontAPI.Types.Cart?) throws {
            if let cart {
                setCartCalls.append(cart)
            }
            if shouldThrowOnSetCart {
                throw NSError(domain: "MockError", code: 1, userInfo: nil)
            }
            // Don't call super to avoid actual cart setting logic
        }

        func resetMocks() {
            transitionHistory.removeAll()
            setCartCalls.removeAll()
            shouldThrowOnTransition = false
            shouldThrowOnSetCart = false
        }
    }

    class MockApplePayViewController: ApplePayViewController {
        var mockAuthorizationDelegate: MockApplePayAuthorizationDelegate!
        var mockTopViewController: UIViewController?

        override var authorizationDelegate: ApplePayAuthorizationDelegate {
            return mockAuthorizationDelegate
        }

        override func getTopViewController() -> UIViewController? {
            return mockTopViewController
        }

        /// Helper methods for test setup
        func setMockAuthorizationDelegate(_ mock: MockApplePayAuthorizationDelegate) {
            mockAuthorizationDelegate = mock
        }
    }

    /// Drives the real Apple Pay state machine without network access or real-time retry delays.
    class StatefulApplePayViewController: ApplePayViewController {
        let mockTopViewController = UIViewController()
        private var observingAuthorizationDelegate: ObservingApplePayAuthorizationDelegate!

        init(
            identifier: CheckoutIdentifier,
            configuration: ApplePayConfigurationWrapper,
            storefront: StorefrontAPIProtocol
        ) {
            super.init(identifier: identifier, configuration: configuration)
            self.storefront = storefront
            observingAuthorizationDelegate = ObservingApplePayAuthorizationDelegate(
                configuration: configuration,
                controller: self,
                clock: MockClock()
            )
        }

        override var authorizationDelegate: ApplePayAuthorizationDelegate {
            observingAuthorizationDelegate
        }

        var onTransition: ((ApplePayState) -> Void)? {
            get { observingAuthorizationDelegate.onTransition }
            set { observingAuthorizationDelegate.onTransition = newValue }
        }

        override func getTopViewController() -> UIViewController? {
            mockTopViewController
        }
    }

    final class ObservingApplePayAuthorizationDelegate: ApplePayAuthorizationDelegate {
        var onTransition: ((ApplePayState) -> Void)?

        override func transition(to nextState: ApplePayState) async throws {
            try await super.transition(to: nextState)
            onTransition?(nextState)
        }
    }

    final class PersonalDataStorefrontAPI: MockStorefrontAPI, @unchecked Sendable {
        override func cartRemovePersonalData(id _: GraphQLScalars.ID) async throws {}
    }

    final class SuccessfulPaymentAuthorizationController: PaymentAuthorizationController {
        var delegate: (any PKPaymentAuthorizationControllerDelegate)?

        func present() async -> Bool {
            true
        }

        func dismiss(completion: (@Sendable () -> Void)?) {
            completion?()
        }
    }

    // MARK: - Callback Properties

    // MARK: - Delegate

    @MainActor
    func test_checkoutDidDismiss_whenInvoked_invokesOnDismissCallback() async {
        let dismissCallbackExpectation = XCTestExpectation(description: "Dismiss callback should be invoked")
        viewController.onCheckoutDismiss = { dismissCallbackExpectation.fulfill() }

        viewController.onCheckoutDismiss?()

        await fulfillment(of: [dismissCallbackExpectation], timeout: 1.0)
    }

    func testWebCheckoutCompletionFinishesApplePayAndForwardsCallback() async throws {
        let forwarded = expectation(description: "Public completion callback")
        let finished = expectation(description: "Apple Pay completion transition")
        viewController.eventHandlers.checkoutDidComplete = { event in
            XCTAssertEqual(event.checkout.id, "checkout-1")
            forwarded.fulfill()
        }
        mockAuthorizationDelegate.onTransition = { state in
            XCTAssertEqual(state, .completed)
            finished.fulfill()
        }
        viewController.mockTopViewController = UIViewController()
        try await viewController.present(url: XCTUnwrap(URL(string: "https://example.com/checkout")))
        let webController = try XCTUnwrap(viewController.checkoutViewController?.viewControllers.first as? CheckoutWebViewController)
        let client = try XCTUnwrap(webController.checkoutView?.client)

        // Only a decoded completion event should finish the Apple Pay state machine.
        _ = await client.process(#"{"jsonrpc":"2.0","method":"ec.complete","params":{}}"#)
        _ = await client.process("""
        {"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":{
          "id":"checkout-1","currency":"USD","status":"completed",
          "line_items":[],"links":[],"totals":[{"type":"total","amount":1000}],
          "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
        }}}
        """)

        await fulfillment(of: [forwarded, finished], timeout: 1)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory, [.completed])
    }

    func test_checkoutDidDismiss_whenPresentedCheckoutDismisses_invokesOnDismissCallback() async throws {
        let dismissCallbackExpectation = expectation(description: "Dismiss callback should be invoked")
        viewController.eventHandlers.checkoutDidDismiss = { dismissCallbackExpectation.fulfill() }
        viewController.mockTopViewController = UIViewController()

        let checkoutURL = try XCTUnwrap(URL(string: "https://test-shop.myshopify.com/checkout"))
        try await viewController.present(url: checkoutURL)

        let checkoutViewController = try XCTUnwrap(viewController.checkoutViewController)
        let webViewController = try XCTUnwrap(
            checkoutViewController.viewControllers.first as? CheckoutWebViewController
        )
        webViewController.close()

        await fulfillment(of: [dismissCallbackExpectation], timeout: 1.0)
    }

    func test_checkoutDidDismiss_whenApplePayAlreadyIdle_forwardsDismissalWithoutTransitioning() async {
        var dismissalCount = 0
        viewController.eventHandlers.checkoutDidDismiss = { dismissalCount += 1 }
        XCTAssertEqual(mockAuthorizationDelegate.state, .idle)

        viewController.checkoutDidDismiss()
        for _ in 0 ..< 10 {
            await Task.yield()
        }

        XCTAssertEqual(dismissalCount, 1)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory, [])
    }

    func test_checkoutDidDismiss_whilePresentingCheckoutKit_forwardsDismissalAndResetsApplePayToIdle() async throws {
        let controller = StatefulApplePayViewController(
            identifier: .cart(cartID: "gid://Shopify/Cart/test-cart-id"),
            configuration: mockConfiguration,
            storefront: PersonalDataStorefrontAPI()
        )
        let paymentController = SuccessfulPaymentAuthorizationController()
        controller.authorizationDelegate.paymentControllerFactory = { _ in paymentController }
        try controller.authorizationDelegate.setCart(to: StorefrontAPI.Cart.testCart())
        try await controller.authorizationDelegate.transition(to: .startPaymentRequest)
        try await controller.authorizationDelegate.transition(to: .paymentAuthorized(payment: PKPayment()))
        let redirectURL = try XCTUnwrap(URL(string: "https://test-shop.myshopify.com/thank-you"))
        try await controller.authorizationDelegate.transition(to: .cartSubmittedForCompletion(redirectURL: redirectURL))
        try await controller.authorizationDelegate.transition(to: .completed)
        guard case .presentingCheckoutKit = controller.authorizationDelegate.state else {
            return XCTFail("Expected Checkout Kit to be presented")
        }

        var dismissalCount = 0
        var transitions: [ApplePayState] = []
        let idleExpectation = expectation(description: "Apple Pay should return to idle")
        controller.eventHandlers.checkoutDidDismiss = { dismissalCount += 1 }
        controller.onTransition = { state in
            transitions.append(state)
            if state == .idle { idleExpectation.fulfill() }
        }

        controller.checkoutDidDismiss()

        XCTAssertEqual(dismissalCount, 1)
        await fulfillment(of: [idleExpectation], timeout: 1.0)
        // Transitions nest (completed -> reset -> idle) and the hook runs after each returns, so innermost reports first.
        XCTAssertEqual(transitions, [.idle, .reset, .completed])
        XCTAssertEqual(controller.authorizationDelegate.state, .idle)
    }

    // MARK: - WalletController Inheritance

    func test_configuration_whenInitialized_usesCorrectStorefront() {
        XCTAssertEqual(
            viewController.configuration.storefrontDomain,
            "test-shop.myshopify.com"
        )
        XCTAssertEqual(viewController.configuration.storefrontAccessToken, "test-token")
    }

    func test_createOrfetchCart_whenCalled_usesFetchCartByCheckoutIdentifier() async throws {
        let mockCart = StorefrontAPI.Cart.testCart()
        mockStorefront.cartResult = .success(mockCart)

        let cart = try await viewController.createOrfetchCart()

        XCTAssertEqual(cart.id, mockCart.id)
    }

    // MARK: - startPayment()

    func test_onPress_whenSuccess_callsCorrectTransition() async {
        let mockCart = StorefrontAPI.Cart.testCart()
        mockStorefront.cartResult = .success(mockCart)
        XCTAssertNil(viewController.cart)

        await viewController.onPress()

        XCTAssertNotNil(viewController.cart)
        XCTAssertEqual(viewController.cart?.id, mockCart.id)

        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.first, .startPaymentRequest)
    }

    @MainActor
    func test_onPress_whenCreateOrFetchCartFails_callsOnCheckoutFailAndCompletedTransition() async throws {
        let expectedError = NSError(domain: "TestError", code: 500, userInfo: nil)
        mockStorefront.cartResult = .failure(expectedError)

        let onCheckoutFailExpectation = XCTestExpectation(description: "onCheckoutFail should be called")
        var receivedError: CheckoutError?
        viewController.onCheckoutFail = { error in
            receivedError = error
            onCheckoutFailExpectation.fulfill()
        }

        await viewController.onPress()

        await fulfillment(of: [onCheckoutFailExpectation], timeout: 1.0)

        XCTAssertNil(viewController.cart)
        let error = try XCTUnwrap(receivedError)
        XCTAssertEqual(error.code, .sdkError)
        let nsError = try XCTUnwrap(error.underlyingError as NSError?)
        XCTAssertEqual(nsError.domain, "TestError")
        XCTAssertEqual(nsError.code, 500)

        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 2)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .terminalError(error: expectedError)
        )
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.last, .completed)
    }

    @MainActor
    func test_onPress_whenCartIsNil_callsOnCheckoutFailAndCompletedTransition() async throws {
        mockStorefront.cartResult = .success(nil)

        let onCheckoutFailExpectation = XCTestExpectation(description: "onCheckoutFail should be called")
        var receivedError: CheckoutError?
        viewController.onCheckoutFail = { error in
            receivedError = error
            onCheckoutFailExpectation.fulfill()
        }

        await viewController.onPress()

        await fulfillment(of: [onCheckoutFailExpectation], timeout: 1.0)

        XCTAssertNil(viewController.cart)
        let error = try XCTUnwrap(receivedError)
        XCTAssertEqual(error.code, .sdkError)
        XCTAssertTrue(error.underlyingError is ShopifyAcceleratedCheckouts.Error)

        // WalletController.fetchCartByCheckoutIdentifier throws when cart is nil
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 2)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .terminalError(
                error: ShopifyAcceleratedCheckouts.Error.cartAcquisition(
                    identifier: CheckoutIdentifier.cart(cartID: "gid://Shopify/Cart/test-cart-id")
                )
            )
        )
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.last, .completed)
    }

    // MARK: - createOrfetchCart() Error

    func test_createOrfetchCart_whenStorefrontAPIError_handlesError() async throws {
        let storefrontError = StorefrontAPI.Errors.response(
            requestName: "testRequest",
            message: "Test error",
            payload: .cartPrepareForCompletion(
                StorefrontAPI.CartPrepareForCompletionPayload(
                    result: nil,
                    userErrors: []
                )
            )
        )
        mockStorefront.cartResult = .failure(storefrontError)

        // The actual implementation should handle StorefrontAPI.Errors through handleStorefrontError
        // We're not testing the internal implementation details, just that it eventually throws or handles appropriately
        await XCTAssertThrowsErrorAsync(try await viewController.createOrfetchCart()) { error in
            XCTAssertTrue(error is StorefrontAPI.Errors)
        }

        // For StorefrontAPI errors (default case), .unexpectedError transition should happen
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .unexpectedError(error: storefrontError)
        )
    }

    @MainActor
    func test_createOrfetchCart_whenNSError_callsTerminalErrorTransition() async throws {
        let nsError = NSError(domain: "TestError", code: 400, userInfo: nil)
        mockStorefront.cartResult = .failure(nsError)

        await XCTAssertThrowsErrorAsync(try await viewController.createOrfetchCart()) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "TestError")
            XCTAssertEqual(nsError.code, 400)
        }

        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .terminalError(error: nsError)
        )
    }

    func test_createOrfetchCart_whenGenericError_callsTerminalErrorTransition() async throws {
        let genericError = NSError(domain: "GenericError", code: 400, userInfo: nil)
        mockStorefront.cartResult = .failure(genericError)

        await XCTAssertThrowsErrorAsync(try await viewController.createOrfetchCart()) { error in
            XCTAssertEqual((error as NSError).domain, "GenericError")
            XCTAssertEqual((error as NSError).code, 400)
        }

        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .terminalError(error: genericError)
        )
    }

    func test_createOrfetchCart_whenSuccess_noTransitions() async throws {
        let mockCart = StorefrontAPI.Cart.testCart()
        mockStorefront.cartResult = .success(mockCart)

        let result = try await viewController.createOrfetchCart()
        XCTAssertEqual(result.id, mockCart.id)

        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 0)
    }

    // MARK: - Error Handling

    @MainActor
    func test_onPress_whenAuthorizationDelegateConfigured_shouldCallTransition() async {
        // This tests defensive coding when dependencies might be misconfigured
        let mockCart = StorefrontAPI.Cart.testCart()
        mockStorefront.cartResult = .success(mockCart)

        await viewController.onPress()

        XCTAssertNotNil(viewController.cart)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
    }

    @MainActor
    func test_createOrfetchCart_whenStorefrontUserErrorWithNilCart_throwsAndCallsTerminalError() async {
        let userError = StorefrontAPI.CartUserError(
            code: .invalid,
            message: "Invalid product variant",
            field: ["lineItems"]
        )
        let storefrontError = StorefrontAPI.Errors.userError(userErrors: [userError], cart: nil)
        mockStorefront.cartResult = .failure(storefrontError)

        await XCTAssertThrowsErrorAsync(try await viewController.createOrfetchCart()) { error in
            XCTAssertTrue(error is StorefrontAPI.Errors)
        }

        // When cart is nil, handleStorefrontError rethrows the error without calling any transitions
        // The error bubbles up and the method throws, but no state transitions occur
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 0)
    }

    @MainActor
    func test_createOrfetchCart_whenStorefrontWarningWithNilCart_throwsAndCallsTerminalError() async {
        let storefrontError = StorefrontAPI.Errors.warning(type: .outOfStock, cart: nil)
        mockStorefront.cartResult = .failure(storefrontError)

        await XCTAssertThrowsErrorAsync(try await viewController.createOrfetchCart()) { error in
            XCTAssertTrue(error is StorefrontAPI.Errors)
        }

        // When cart is nil, handleStorefrontError rethrows the error without calling any transitions
        // The error bubbles up and the method throws, but no state transitions occur
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 0)
    }

    @MainActor
    func test_createOrfetchCart_whenStorefrontUserErrorWithCart_handlesUnhandledErrorAction() async throws {
        let mockCart = StorefrontAPI.Cart.testCart()
        let userError = StorefrontAPI.CartUserError(
            code: .invalid,
            message: "Test user error",
            field: ["test"]
        )
        let storefrontError = StorefrontAPI.Errors.userError(
            userErrors: [userError],
            cart: mockCart
        )
        mockStorefront.cartResult = .failure(storefrontError)

        let result = try await viewController.createOrfetchCart()

        // Should return the cart from the error
        XCTAssertEqual(result.id, mockCart.id)

        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .interrupt(reason: .unhandled)
        )
    }

    @MainActor
    func test_createOrfetchCart_whenStorefrontUserErrorWithEmailField_handlesEmailErrorAction() async throws {
        let mockCart = StorefrontAPI.Cart.testCart()
        let userError = StorefrontAPI.CartUserError(
            code: .invalid,
            message: "Invalid email address",
            field: ["buyerIdentity", "email"]
        )
        let storefrontError = StorefrontAPI.Errors.userError(
            userErrors: [userError],
            cart: mockCart
        )
        mockStorefront.cartResult = .failure(storefrontError)

        let result = try await viewController.createOrfetchCart()

        XCTAssertEqual(result.id, mockCart.id)

        // Invalid email errors trigger an interrupt to fallback to Checkout Kit
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 1)
        XCTAssertEqual(
            mockAuthorizationDelegate.transitionHistory.first,
            .interrupt(reason: .other)
        )
    }

    @MainActor
    func test_onPress_whenMultipleErrorScenarios_allHandledCorrectly() async {
        // Test multiple consecutive errors are handled properly
        let genericError = NSError(domain: "TestError", code: 123, userInfo: nil)
        mockStorefront.cartResult = .failure(genericError)

        let firstFailExpectation = XCTestExpectation(description: "First onCheckoutFail call")
        viewController.onCheckoutFail = { _ in firstFailExpectation.fulfill() }

        await viewController.onPress()
        await fulfillment(of: [firstFailExpectation], timeout: 1.0)
        XCTAssertNil(viewController.cart)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 2)

        mockAuthorizationDelegate.resetMocks()
        let anotherError = NSError(domain: "AnotherError", code: 400, userInfo: nil)
        mockStorefront.cartResult = .failure(anotherError)

        let secondFailExpectation = XCTestExpectation(description: "Second onCheckoutFail call")
        viewController.onCheckoutFail = { _ in secondFailExpectation.fulfill() }

        await viewController.onPress()
        await fulfillment(of: [secondFailExpectation], timeout: 1.0)
        XCTAssertNil(viewController.cart)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 2)
    }

    @MainActor
    func test_onPress_whenAuthorizationDelegateTransitionThrows_handlesError() async throws {
        let mockCart = try StorefrontAPI.Cart.testCart(
            checkoutUrl: XCTUnwrap(URL(string: "https://test-shop.myshopify.com/checkout"))
        )
        mockStorefront.cartResult = .success(mockCart)

        mockAuthorizationDelegate.shouldThrowOnTransition = true

        await viewController.onPress()

        // Should have attempted the transition, and since delegate throws, onPress catch block is triggered
        // This results in 2 transitions: .startPaymentRequest (attempted) + .completed (error handling)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.count, 2)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.first, .startPaymentRequest)
        XCTAssertEqual(mockAuthorizationDelegate.transitionHistory.last, .completed)
    }

    // MARK: - Actor Isolation Tests (Double-Tap Race Condition)

    func test_onPress_whenDoubleTapped_doesNotCrashFromConcurrentActorHops() async throws {
        let expectedError = NSError(domain: "TestError", code: 500, userInfo: nil)
        mockStorefront.cartResult = .failure(expectedError)

        let onCheckoutFailExpectation = XCTestExpectation(description: "onCheckoutFail should be called")
        onCheckoutFailExpectation.expectedFulfillmentCount = 2

        await MainActor.run {
            viewController.onCheckoutFail = { _ in
                onCheckoutFailExpectation.fulfill()
            }
        }

        let vc = try XCTUnwrap(viewController)
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await vc.onPress() }
            group.addTask { await vc.onPress() }
            group.addTask { await vc.onPress() }
            group.addTask { await vc.onPress() }
            group.addTask { await vc.onPress() }
            group.addTask { await vc.onPress() }
        }

        await fulfillment(of: [onCheckoutFailExpectation], timeout: 1.0)
    }
}
