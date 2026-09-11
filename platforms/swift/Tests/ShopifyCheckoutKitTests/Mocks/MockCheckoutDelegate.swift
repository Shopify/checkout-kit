@testable import ShopifyCheckoutKit
import XCTest

struct MockBridgeClient: CheckoutCommunicationProtocol {
    var responseMessage: String?
    var receivedMessages: [String] = []

    func process(_: String) async -> String? {
        return responseMessage
    }
}

@MainActor
final class MockCheckoutDelegate: CheckoutDelegate {
    private(set) var startEvents: [CheckoutStartEvent] = []
    private(set) var updateEvents: [CheckoutUpdateEvent] = []
    private(set) var completeEvents: [CheckoutCompleteEvent] = []
    private(set) var clickedLinks: [CheckoutLink] = []
    var linkAction: CheckoutLinkAction = .open
    private(set) var didDismissCount = 0
    private(set) var failureEvents: [CheckoutFailureEvent] = []

    func checkoutDidStart(_ event: CheckoutStartEvent) {
        startEvents.append(event)
    }

    func checkoutDidUpdate(_ event: CheckoutUpdateEvent) {
        updateEvents.append(event)
    }

    func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
        completeEvents.append(event)
    }

    func checkoutAction(for link: CheckoutLink) -> CheckoutLinkAction {
        clickedLinks.append(link)
        return linkAction
    }

    func checkoutDidDismiss() {
        didDismissCount += 1
    }

    func checkoutDidFail(_ event: CheckoutFailureEvent) {
        failureEvents.append(event)
    }
}
