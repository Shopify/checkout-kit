@testable import ShopifyCheckoutKit
import XCTest

final class CheckoutDiagnosticsTests: XCTestCase {
    @MainActor
    func testEachSubscriberReceivesEmittedEvents() {
        let diagnostics = CheckoutDiagnostics()
        var firstEvents = [CheckoutDiagnosticEvent]()
        var secondEvents = [CheckoutDiagnosticEvent]()
        let firstSubscription = diagnostics.subscribe { firstEvents.append($0) }
        let secondSubscription = diagnostics.subscribe { secondEvents.append($0) }
        let rejection = CheckoutMessageRejection(
            origin: "https://example.com",
            reason: .originNotAllowed
        )

        diagnostics.emit(.messageRejected(rejection))

        XCTAssertEqual(firstEvents, [.messageRejected(rejection)])
        XCTAssertEqual(secondEvents, [.messageRejected(rejection)])
        firstSubscription.cancel()
        secondSubscription.cancel()
    }

    @MainActor
    func testSubscriptionDoesNotReplayEarlierEvents() {
        let diagnostics = CheckoutDiagnostics()
        let rejection = CheckoutMessageRejection(
            origin: "https://example.com",
            reason: .originNotAllowed
        )
        diagnostics.emit(.messageRejected(rejection))

        var received = [CheckoutDiagnosticEvent]()
        let subscription = diagnostics.subscribe { received.append($0) }

        diagnostics.emit(.messageRejected(rejection))

        XCTAssertEqual(received, [.messageRejected(rejection)])
        subscription.cancel()
    }

    @MainActor
    func testCancelledSubscriptionReceivesNoLaterEvents() {
        let diagnostics = CheckoutDiagnostics()
        var received = [CheckoutDiagnosticEvent]()
        let subscription = diagnostics.subscribe { received.append($0) }

        subscription.cancel()
        subscription.cancel()
        diagnostics.emit(
            .messageRejected(
                CheckoutMessageRejection(
                    origin: "https://example.com",
                    reason: .originNotAllowed
                )
            )
        )

        XCTAssertTrue(received.isEmpty)
    }

    @MainActor
    func testReleasedSubscriptionReceivesNoLaterEvents() {
        let diagnostics = CheckoutDiagnostics()
        var received = [CheckoutDiagnosticEvent]()
        var subscription: CheckoutDiagnostics.Subscription? = diagnostics.subscribe {
            received.append($0)
        }

        subscription = nil
        diagnostics.emit(
            .messageRejected(
                CheckoutMessageRejection(
                    origin: "https://example.com",
                    reason: .originNotAllowed
                )
            )
        )

        XCTAssertNil(subscription)
        XCTAssertTrue(received.isEmpty)
    }
}
