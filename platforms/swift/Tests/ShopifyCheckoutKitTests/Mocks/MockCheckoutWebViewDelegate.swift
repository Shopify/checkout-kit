@testable import ShopifyCheckoutKit
import XCTest

class MockCheckoutWebViewDelegate: CheckoutWebViewDelegate {
    var errorReceived: CheckoutError?
    var failureCount = 0

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
        failureCount += 1
        errorReceived = error
        didFailWithErrorExpectation?.fulfill()
    }
}
