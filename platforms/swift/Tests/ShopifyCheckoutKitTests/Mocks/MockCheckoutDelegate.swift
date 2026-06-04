@testable import ShopifyCheckoutKit
import XCTest

actor MockBridgeClient: CheckoutCommunicationProtocol {
    let responseMessage: String?
    private(set) var receivedMessages: [String] = []

    init(responseMessage: String? = nil) {
        self.responseMessage = responseMessage
    }

    func process(_ message: String) async -> String? {
        receivedMessages.append(message)
        return responseMessage
    }
}

final class MockCheckoutDelegate: CheckoutDelegate {
    private(set) var didCancelCount = 0
    private(set) var didFailErrors: [CheckoutError] = []

    func checkoutDidCancel() {
        didCancelCount += 1
    }

    func checkoutDidFail(error: CheckoutError) {
        didFailErrors.append(error)
    }
}
