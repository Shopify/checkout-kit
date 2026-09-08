@testable import ShopifyCheckoutKit
import XCTest

struct MockBridgeClient: CheckoutCommunicationProtocol {
    var responseMessage: String?
    var receivedMessages: [String] = []

    func process(_: String) async -> String? {
        return responseMessage
    }
}

final class MockCheckoutDelegate: CheckoutDelegate {
    private(set) var didStartCheckouts: [Checkout] = []
    private(set) var didUpdateCheckouts: [Checkout] = []
    private(set) var didCompleteCheckouts: [Checkout] = []
    private(set) var didDismissCount = 0
    private(set) var didFailErrors: [CheckoutError] = []

    func checkoutDidStart(_ checkout: Checkout) {
        didStartCheckouts.append(checkout)
    }

    func checkoutDidUpdate(_ checkout: Checkout) {
        didUpdateCheckouts.append(checkout)
    }

    func checkoutDidComplete(_ checkout: Checkout) {
        didCompleteCheckouts.append(checkout)
    }

    func checkoutDidDismiss() {
        didDismissCount += 1
    }

    func checkoutDidFail(error: CheckoutError) {
        didFailErrors.append(error)
    }
}
