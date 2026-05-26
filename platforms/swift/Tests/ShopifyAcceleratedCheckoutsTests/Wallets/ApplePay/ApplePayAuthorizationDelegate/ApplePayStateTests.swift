import PassKit
@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
final class ApplePayStateTests: XCTestCase {
    // MARK: - Individual State Transition Tests

    func test_canTransition_fromIdleState_shouldAllowOnlyStartPaymentRequest() {
        let fromState = ApplePayState.idle

        XCTAssertTrue(fromState.canTransition(to: .startPaymentRequest), "Should allow idle -> startPaymentRequest")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow idle -> idle")
        XCTAssertFalse(fromState.canTransition(to: .appleSheetPresented), "Should not allow idle -> appleSheetPresented")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow idle -> reset")
    }

    func test_canTransition_fromStartPaymentRequestState_shouldAllowAppleSheetPresentedAndReset() {
        let fromState = ApplePayState.startPaymentRequest

        XCTAssertTrue(fromState.canTransition(to: .appleSheetPresented), "Should allow startPaymentRequest -> appleSheetPresented")
        XCTAssertTrue(fromState.canTransition(to: .reset), "Should allow startPaymentRequest -> reset (failed to present)")
        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow startPaymentRequest -> completed")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow startPaymentRequest -> idle")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow startPaymentRequest -> startPaymentRequest")
    }

    func test_canTransition_fromAppleSheetPresentedState_shouldAllowPaymentAuthorizationAndInterruptAndCompleted() {
        let fromState = ApplePayState.appleSheetPresented

        XCTAssertTrue(fromState.canTransition(to: .paymentAuthorized(payment: .createMockPayment())), "Should allow appleSheetPresented -> paymentAuthorized")
        XCTAssertTrue(fromState.canTransition(to: .paymentAuthorizationFailed(error: MockError.testError)), "Should allow appleSheetPresented -> paymentAuthorizationFailed")
        XCTAssertTrue(fromState.canTransition(to: .interrupt(reason: .currencyChanged)), "Should allow appleSheetPresented -> interrupt")
        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow appleSheetPresented -> completed (user cancelled)")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow appleSheetPresented -> idle")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow appleSheetPresented -> startPaymentRequest")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow appleSheetPresented -> reset")
    }

    func test_canTransition_fromPaymentAuthorizedState_shouldAllowCartSubmissionAndFailureAndInterrupt() throws {
        let fromState = ApplePayState.paymentAuthorized(payment: .createMockPayment())

        XCTAssertTrue(try fromState.canTransition(to: ApplePayState.cartSubmittedForCompletion(redirectURL: XCTUnwrap(URL(string: "https://example.com")))), "Should allow paymentAuthorized -> cartSubmittedForCompletion")
        XCTAssertTrue(fromState.canTransition(to: ApplePayState.paymentAuthorizationFailed(error: MockError.testError)), "Should allow paymentAuthorized -> paymentAuthorizationFailed")
        XCTAssertTrue(fromState.canTransition(to: ApplePayState.interrupt(reason: .currencyChanged)), "Should allow paymentAuthorized -> interrupt")

        XCTAssertFalse(fromState.canTransition(to: ApplePayState.idle), "Should not allow paymentAuthorized -> idle")
        XCTAssertTrue(fromState.canTransition(to: ApplePayState.appleSheetPresented), "Should allow paymentAuthorized -> appleSheetPresented (when userErrors require sheet to remain open)")
        XCTAssertFalse(fromState.canTransition(to: ApplePayState.completed), "Should not allow paymentAuthorized -> completed")
        XCTAssertFalse(fromState.canTransition(to: ApplePayState.reset), "Should not allow paymentAuthorized -> reset")
    }

    func test_canTransition_fromPaymentAuthorizationFailedState_shouldAllowCompletedAndReset() {
        let fromState = ApplePayState.paymentAuthorizationFailed(error: MockError.testError)

        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow paymentAuthorizationFailed -> completed")
        XCTAssertTrue(fromState.canTransition(to: .reset), "Should allow paymentAuthorizationFailed -> reset")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow paymentAuthorizationFailed -> idle")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow paymentAuthorizationFailed -> startPaymentRequest")
        XCTAssertFalse(fromState.canTransition(to: .appleSheetPresented), "Should not allow paymentAuthorizationFailed -> appleSheetPresented")
    }

    func test_canTransition_fromCartSubmittedForCompletionState_shouldAllowOnlyCompleted() throws {
        let fromState = try ApplePayState.cartSubmittedForCompletion(redirectURL: XCTUnwrap(URL(string: "https://example.com")))

        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow cartSubmittedForCompletion -> completed")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow cartSubmittedForCompletion -> idle")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow cartSubmittedForCompletion -> startPaymentRequest")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow cartSubmittedForCompletion -> reset")
        XCTAssertFalse(fromState.canTransition(to: .presentingCheckoutKit(url: nil)), "Should not allow cartSubmittedForCompletion -> presentingCheckoutKit")
    }

    func test_canTransition_fromInterruptState_shouldAllowOnlyCompleted() {
        let fromState = ApplePayState.interrupt(reason: .currencyChanged)

        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow interrupt -> completed")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow interrupt -> idle")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow interrupt -> startPaymentRequest")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow interrupt -> reset")
        XCTAssertFalse(fromState.canTransition(to: .presentingCheckoutKit(url: nil)), "Should not allow interrupt -> presentingCheckoutKit")
    }

    func test_canTransition_fromUnexpectedErrorState_shouldAllowCompletedAndTerminalError() {
        let fromState = ApplePayState.unexpectedError(error: MockError.testError)

        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow unexpectedError -> completed")
        XCTAssertTrue(fromState.canTransition(to: .terminalError(error: MockError.testError)), "Should allow unexpectedError -> terminalError")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow unexpectedError -> idle")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow unexpectedError -> reset")
        XCTAssertFalse(fromState.canTransition(to: .presentingCheckoutKit(url: nil)), "Should not allow unexpectedError -> presentingCheckoutKit")
    }

    func test_canTransition_fromTerminalErrorState_shouldAllowOnlyCompleted() {
        let fromState = ApplePayState.terminalError(error: MockError.testError)

        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow terminalError -> completed")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow terminalError -> idle")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow terminalError -> reset")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow terminalError -> startPaymentRequest")
    }

    func test_canTransition_fromPresentingCheckoutKitState_shouldAllowOnlyCompleted() {
        let fromState = ApplePayState.presentingCheckoutKit(url: URL(string: "https://example.com"))

        XCTAssertTrue(fromState.canTransition(to: .completed), "Should allow presentingCheckoutKit -> completed")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow presentingCheckoutKit -> idle")
        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow presentingCheckoutKit -> reset")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow presentingCheckoutKit -> startPaymentRequest")
    }

    func test_canTransition_fromCompletedState_shouldAllowPresentingCheckoutKitAndReset() {
        let fromState = ApplePayState.completed

        XCTAssertTrue(fromState.canTransition(to: .presentingCheckoutKit(url: URL(string: "https://example.com"))), "Should allow completed -> presentingCheckoutKit")
        XCTAssertTrue(fromState.canTransition(to: .reset), "Should allow completed -> reset")

        XCTAssertFalse(fromState.canTransition(to: .idle), "Should not allow completed -> idle")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow completed -> startPaymentRequest")
        XCTAssertFalse(fromState.canTransition(to: .completed), "Should not allow completed -> completed")
    }

    func test_canTransition_fromResetState_shouldAllowOnlyIdle() {
        let fromState = ApplePayState.reset

        XCTAssertTrue(fromState.canTransition(to: .idle), "Should allow reset -> idle")

        XCTAssertFalse(fromState.canTransition(to: .reset), "Should not allow reset -> reset")
        XCTAssertFalse(fromState.canTransition(to: .startPaymentRequest), "Should not allow reset -> startPaymentRequest")
        XCTAssertFalse(fromState.canTransition(to: .completed), "Should not allow reset -> completed")
    }

    // MARK: - Error State Transition Tests

    func test_canTransition_fromAnyState_shouldAllowErrorStates() throws {
        let allStates: [ApplePayState] = try [
            .idle,
            .startPaymentRequest,
            .appleSheetPresented,
            .paymentAuthorized(payment: .createMockPayment()),
            .paymentAuthorizationFailed(error: MockError.testError),
            .cartSubmittedForCompletion(redirectURL: XCTUnwrap(URL(string: "https://example.com"))),
            .interrupt(reason: .currencyChanged),
            .unexpectedError(error: MockError.testError),
            .terminalError(error: MockError.testError),
            .presentingCheckoutKit(url: URL(string: "https://example.com")),
            .completed,
            .reset
        ]

        for state in allStates {
            XCTAssertTrue(
                state.canTransition(to: ApplePayState.unexpectedError(error: MockError.testError)),
                "State \(state) should allow transition to unexpectedError"
            )
            XCTAssertTrue(
                state.canTransition(to: ApplePayState.terminalError(error: MockError.testError)),
                "State \(state) should allow transition to terminalError"
            )
        }
    }

    // MARK: - End-to-End Flow Tests

    func test_canTransition_throughTypicalSuccessFlow_shouldAllowAllTransitions() throws {
        XCTAssertTrue(ApplePayState.idle.canTransition(to: .startPaymentRequest))
        XCTAssertTrue(ApplePayState.startPaymentRequest.canTransition(to: .appleSheetPresented))
        XCTAssertTrue(ApplePayState.appleSheetPresented.canTransition(to: .paymentAuthorized(payment: .createMockPayment())))
        XCTAssertTrue(try ApplePayState.paymentAuthorized(payment: .createMockPayment()).canTransition(to: .cartSubmittedForCompletion(redirectURL: XCTUnwrap(URL(string: "https://example.com")))))
        XCTAssertTrue(try ApplePayState.cartSubmittedForCompletion(redirectURL: XCTUnwrap(URL(string: "https://example.com"))).canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .presentingCheckoutKit(url: URL(string: "https://example.com"))))
        XCTAssertTrue(ApplePayState.presentingCheckoutKit(url: URL(string: "https://example.com")).canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .reset))
        XCTAssertTrue(ApplePayState.reset.canTransition(to: .idle))
    }

    func test_canTransition_throughTypicalFailureFlow_shouldAllowAllTransitions() {
        XCTAssertTrue(ApplePayState.idle.canTransition(to: .startPaymentRequest))
        XCTAssertTrue(ApplePayState.startPaymentRequest.canTransition(to: .appleSheetPresented))
        XCTAssertTrue(ApplePayState.appleSheetPresented.canTransition(to: .paymentAuthorizationFailed(error: MockError.testError)))
        XCTAssertTrue(ApplePayState.paymentAuthorizationFailed(error: MockError.testError).canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .presentingCheckoutKit(url: URL(string: "https://example.com"))))
        XCTAssertTrue(ApplePayState.presentingCheckoutKit(url: URL(string: "https://example.com")).canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .reset))
        XCTAssertTrue(ApplePayState.reset.canTransition(to: .idle))
    }

    func test_canTransition_throughInterruptFlow_shouldAllowAllTransitions() {
        XCTAssertTrue(ApplePayState.idle.canTransition(to: .startPaymentRequest))
        XCTAssertTrue(ApplePayState.startPaymentRequest.canTransition(to: .appleSheetPresented))
        XCTAssertTrue(ApplePayState.appleSheetPresented.canTransition(to: .interrupt(reason: .currencyChanged)))
        XCTAssertTrue(ApplePayState.interrupt(reason: .currencyChanged).canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .presentingCheckoutKit(url: URL(string: "https://example.com"))))
        XCTAssertTrue(ApplePayState.presentingCheckoutKit(url: URL(string: "https://example.com")).canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .reset))
        XCTAssertTrue(ApplePayState.reset.canTransition(to: .idle))
    }

    func test_canTransition_throughUserCancelFlow_shouldAllowAllTransitions() {
        XCTAssertTrue(ApplePayState.idle.canTransition(to: .startPaymentRequest))
        XCTAssertTrue(ApplePayState.startPaymentRequest.canTransition(to: .appleSheetPresented))
        XCTAssertTrue(ApplePayState.appleSheetPresented.canTransition(to: .completed))
        XCTAssertTrue(ApplePayState.completed.canTransition(to: .reset))
        XCTAssertTrue(ApplePayState.reset.canTransition(to: .idle))
    }

    // MARK: - Edge Case Tests

    func test_canTransition_withSelfTransition_shouldRejectForNonErrorStates() throws {
        let nonErrorStates: [ApplePayState] = try [
            .idle,
            .startPaymentRequest,
            .appleSheetPresented,
            .paymentAuthorized(payment: .createMockPayment()),
            .paymentAuthorizationFailed(error: MockError.testError),
            .cartSubmittedForCompletion(redirectURL: XCTUnwrap(URL(string: "https://example.com"))),
            .interrupt(reason: .currencyChanged),
            .presentingCheckoutKit(url: URL(string: "https://example.com")),
            .completed,
            .reset
        ]

        for state in nonErrorStates {
            XCTAssertFalse(state.canTransition(to: state), "State \(state) should not allow self-transition")
        }

        let errorStates: [ApplePayState] = [
            .unexpectedError(error: MockError.testError),
            .terminalError(error: MockError.testError)
        ]

        for errorState in errorStates {
            XCTAssertTrue(
                errorState.canTransition(to: ApplePayState.unexpectedError(error: MockError.networkError)),
                "Error state \(errorState) should allow transition to other unexpectedError"
            )
            XCTAssertTrue(
                errorState.canTransition(to: ApplePayState.terminalError(error: MockError.networkError)),
                "Error state \(errorState) should allow transition to other terminalError"
            )
        }
    }

    func test_canTransition_withDifferentInterruptReasons_shouldBehaveSameForAllReasons() {
        let interruptReasons: [ErrorHandler.InterruptReason] = [
            .currencyChanged,
            .outOfStock,
            .dynamicTax,
            .cartNotReady,
            .cartThrottled,
            .notEnoughStock,
            .other,
            .unhandled
        ]

        for reason in interruptReasons {
            let interruptState = ApplePayState.interrupt(reason: reason)
            XCTAssertTrue(
                interruptState.canTransition(to: .completed),
                "Interrupt with reason \(reason) should allow transition to completed"
            )
            XCTAssertFalse(
                interruptState.canTransition(to: .idle),
                "Interrupt with reason \(reason) should not allow transition to idle"
            )
        }
    }
}

// MARK: - Mock Types

@available(iOS 17.0, *)
enum MockError: Error, Equatable {
    case testError
    case networkError
    case authenticationError
}

// MARK: - Mock PKPayment

@available(iOS 17.0, *)
class MockPKPayment: PKPayment {
    // Mock implementation for testing
    // PKPayment doesn't have public initializers, so we create a simple mock subclass
}

@available(iOS 17.0, *)
extension PKPayment {
    static func createMockPayment() -> PKPayment {
        return MockPKPayment()
    }
}
