@testable import CheckoutKitSwiftDemo
import XCTest

class E2ETestIdsTests: XCTestCase {
    func testAppReadyMarkerMatchesTheMaestroFlows() {
        XCTAssertEqual(E2ETestIds.appReady, "checkout-kit-sample-ready")
    }

    func testCartMarkersMatchTheMaestroFlows() {
        XCTAssertEqual(E2ETestIds.Cart.checkoutReady, "cart-checkout-ready")
        XCTAssertEqual(E2ETestIds.Cart.checkoutButton, "checkout-button")
        XCTAssertEqual(E2ETestIds.Cart.emptyMessage, "cart-empty-message")
    }

    func testTabMarkersMatchTheMaestroFlows() {
        XCTAssertEqual(E2ETestIds.Tabs.cart, "cart-tab")
    }
}
