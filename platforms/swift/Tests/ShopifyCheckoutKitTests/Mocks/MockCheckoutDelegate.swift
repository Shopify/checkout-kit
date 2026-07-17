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
    private(set) var didDismissCount = 0
    private(set) var didFailErrors: [CheckoutError] = []

    func checkoutDidDismiss() {
        didDismissCount += 1
    }

    func checkoutDidFail(error: CheckoutError) {
        didFailErrors.append(error)
    }
}
