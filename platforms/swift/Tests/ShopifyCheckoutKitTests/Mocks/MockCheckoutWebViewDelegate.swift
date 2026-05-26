@testable import ShopifyCheckoutKit
import XCTest

class MockCheckoutWebViewDelegate: CheckoutWebViewDelegate {
    var errorReceived: CheckoutError?

    var didStartNavigationExpectation: XCTestExpectation?
    var didFinishNavigationExpectation: XCTestExpectation?
    var didFailWithErrorExpectation: XCTestExpectation?

    func checkoutViewDidStartNavigation() {
        didStartNavigationExpectation?.fulfill()
    }

    func checkoutViewDidFinishNavigation() {
        didFinishNavigationExpectation?.fulfill()
    }

    func checkoutViewDidFailWithError(error: CheckoutError) {
        errorReceived = error
        didFailWithErrorExpectation?.fulfill()
    }
}
