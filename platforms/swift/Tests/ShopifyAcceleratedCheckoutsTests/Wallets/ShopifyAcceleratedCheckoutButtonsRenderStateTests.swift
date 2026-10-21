@testable import ShopifyAcceleratedCheckouts
import SwiftUI
import XCTest

@available(iOS 17.0, *)
@MainActor
final class ShopifyAcceleratedCheckoutButtonsRenderStateTests: XCTestCase {
    // MARK: - Render State Change Callback Tests

    func testOnRenderStateChange_CalledWithErrorStateForInvalidCartID() {
        // Given: Invalid cart ID and expectation for callback
        let invalidCartID = "invalid-cart-id"
        let expectation = XCTestExpectation(description: "onRenderStateChange called with error state")
        var receivedStates: [RenderState] = []

        // When: Creating ShopifyAcceleratedCheckoutButtons with invalid ID and onRenderStateChange in SwiftUI environment
        let testView = ShopifyAcceleratedCheckoutButtons(cartID: invalidCartID)
            .onRenderStateChange { state in
                receivedStates.append(state)
                if case .error = state {
                    expectation.fulfill()
                }
            }
            .environment(\.shopifyAcceleratedCheckoutsConfiguration, ShopifyAcceleratedCheckouts.Configuration.testConfiguration)

        // Render the view to trigger onAppear
        let hostingController = UIHostingController(rootView: testView)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()

        // Then: Callback should eventually be called with error state
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(receivedStates.contains {
            if case .error = $0 {
                return true
            }; return false
        }, "onRenderStateChange should be called with .error state for invalid cart ID")
    }

    func testOnRenderStateChange_CalledWithErrorStateForEmptyCartID() {
        // Given: Empty cart ID and expectation for callback
        let emptyCartID = ""
        let expectation = XCTestExpectation(description: "onRenderStateChange called with error state")
        var receivedStates: [RenderState] = []

        // When: Creating ShopifyAcceleratedCheckoutButtons with empty cart ID in SwiftUI environment
        let testView = ShopifyAcceleratedCheckoutButtons(cartID: emptyCartID)
            .onRenderStateChange { state in
                receivedStates.append(state)
                if case .error = state {
                    expectation.fulfill()
                }
            }
            .environment(\.shopifyAcceleratedCheckoutsConfiguration, ShopifyAcceleratedCheckouts.Configuration.testConfiguration)

        // Render the view to trigger onAppear
        let hostingController = UIHostingController(rootView: testView)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()

        // Then: Callback should be called with error state
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(receivedStates.contains {
            if case .error = $0 {
                return true
            }; return false
        }, "onRenderStateChange should be called with .error state for empty cart ID")
    }

    func testOnRenderStateChange_CalledWithLoadingStateForValidCartID() {
        // Given: Valid cart ID and expectation for callback
        let validCartID = "gid://shopify/Cart/test-cart-id"
        let expectation = XCTestExpectation(description: "onRenderStateChange called with loading state")
        var receivedStates: [RenderState] = []

        // When: Creating ShopifyAcceleratedCheckoutButtons with valid cart ID in SwiftUI environment
        let testView = ShopifyAcceleratedCheckoutButtons(cartID: validCartID)
            .onRenderStateChange { state in
                receivedStates.append(state)
                if state == .loading {
                    expectation.fulfill()
                }
            }
            .environment(\.shopifyAcceleratedCheckoutsConfiguration, ShopifyAcceleratedCheckouts.Configuration.testConfiguration)

        // Render the view to trigger onAppear
        let hostingController = UIHostingController(rootView: testView)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()

        // Then: Callback should be called with loading state initially
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(receivedStates.contains(.loading), "onRenderStateChange should be called with .loading state for valid cart ID")
    }

    func testOnRenderStateChange_CalledWithLoadingStateForCartProviderWithoutCallingIt() {
        // Given: A cart provider that must only be called after a tap
        let expectation = XCTestExpectation(description: "onRenderStateChange called with loading state")
        var receivedStates: [RenderState] = []
        var providerCalls = 0

        // When: Rendering ShopifyAcceleratedCheckoutButtons with a cart provider
        let testView = ShopifyAcceleratedCheckoutButtons(variantID: "gid://shopify/ProductVariant/test-variant") { _ in
            providerCalls += 1
            return .cart("gid://shopify/Cart/test-cart-id")
        }
        .onRenderStateChange { state in
            receivedStates.append(state)
            if state == .loading {
                expectation.fulfill()
            }
        }
        .environment(\.shopifyAcceleratedCheckoutsConfiguration, ShopifyAcceleratedCheckouts.Configuration.testConfiguration)

        let hostingController = UIHostingController(rootView: testView)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()

        // Then: The buttons load without asking the app for a cart
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(receivedStates.contains(.loading))
        XCTAssertEqual(providerCalls, 0, "The cart provider must not be called while rendering")
    }

    func testBuyNowInitializer_RetainsProductContext() {
        let buttons = ShopifyAcceleratedCheckoutButtons(variantID: "gid://shopify/ProductVariant/test-variant") { _ in
            .cart("gid://shopify/Cart/test-cart-id")
        }

        XCTAssertEqual(buttons.buyNowContext?.variantID, "gid://shopify/ProductVariant/test-variant")
    }

    // MARK: - Identifier Validation Tests

    func testCheckoutIdentifier_ValidCartIDFormats() {
        // Test valid cart ID formats
        let validCartIDs = [
            "gid://shopify/Cart/test-id",
            "gid://Shopify/Cart/Z2NwLXVzLWV4YW1wbGU6MDEyMzQ1Njc4OTAxMjM0NTY3ODkw?key=example",
            "GID://SHOPIFY/CART/uppercase-test"
        ]

        for cartID in validCartIDs {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            XCTAssertTrue(identifier.parse().isValid(), "Cart ID '\(cartID)' should be valid")
        }
    }

    func testCheckoutIdentifier_InvalidCartIDFormats() {
        // Test invalid cart ID formats
        let invalidCartIDs = [
            "",
            "invalid-cart-id",
            "cart/test-id",
            "gid://shopify/Product/test-id", // Wrong type
            "gid://other/Cart/test-id" // Wrong platform
        ]

        for cartID in invalidCartIDs {
            let identifier = CheckoutIdentifier.cart(cartID: cartID)
            XCTAssertFalse(identifier.parse().isValid(), "Cart ID '\(cartID)' should be invalid")
        }
    }

    // MARK: - Render State Enum Tests

    func testRenderStateEnum_HasExpectedValues() {
        // Test that all expected render states exist and are distinct
        let loadingState: RenderState = .loading
        let renderedState: RenderState = .rendered
        let errorState: RenderState = .error(reason: "Test error")

        XCTAssertNotEqual(loadingState, renderedState)
        XCTAssertNotEqual(loadingState, errorState)
        XCTAssertNotEqual(renderedState, errorState)
    }

    func testRenderStateEnum_CaseIterable() {
        // Test that we can iterate over all render states
        let testErrorReason = "Test error"
        let allStates: [RenderState] = [.loading, .rendered, .error(reason: testErrorReason)]

        XCTAssertEqual(allStates.count, 3, "Should have exactly 3 render states")
        XCTAssertTrue(allStates.contains(.loading), "Should contain .loading state")
        XCTAssertTrue(allStates.contains(.rendered), "Should contain .rendered state")
        XCTAssertTrue(allStates.contains(.error(reason: testErrorReason)), "Should contain .error state")
    }
}
