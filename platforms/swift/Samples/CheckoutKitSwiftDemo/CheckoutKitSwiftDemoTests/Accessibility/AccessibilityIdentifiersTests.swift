@testable import CheckoutKitSwiftDemo
import XCTest

class AccessibilityIdentifiersTests: XCTestCase {
    func testAppReadyMarkerMatchesTheMaestroFlows() {
        XCTAssertEqual(AccessibilityIdentifiers.appReady, "checkout-kit-sample-ready")
    }

    func testCartMarkersMatchTheMaestroFlows() {
        XCTAssertEqual(AccessibilityIdentifiers.Cart.checkoutReady, "cart-checkout-ready")
        XCTAssertEqual(AccessibilityIdentifiers.Cart.checkoutButton, "checkout-button")
    }
}
