import Foundation
@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 16.0, *)
@MainActor
final class RetryTests: XCTestCase {
    private enum TestError: Error {
        case transient
        case permanent
    }

    private func retryEveryError(_: Error) -> Bool {
        true
    }

    private func retryNonTestErrors(_ error: Error) -> Bool {
        !(error is TestError)
    }

    func testSuccessDoesNotSleep() async throws {
        let clock = RecordingClock()
        let value = try await withRetry(clock: clock, shouldRetry: retryEveryError) { "success" }
        XCTAssertEqual(value, "success")
        let sleeps = await clock.sleeps
        XCTAssertEqual(sleeps, [])
    }

    func testTransientErrorsRetryWithExactBackoff() async throws {
        let clock = RecordingClock()
        var attempts = 0
        let value = try await withRetry(clock: clock, shouldRetry: retryEveryError) {
            attempts += 1
            if attempts < 3 { throw TestError.transient }
            return "success"
        }
        XCTAssertEqual(value, "success")
        XCTAssertEqual(attempts, 3)
        let sleeps = await clock.sleeps
        XCTAssertEqual(sleeps, [1_000_000_000, 2_000_000_000])
    }

    func testRetryLimitAndZeroRetriesPreserveLastError() async {
        for retries in [0, 3] {
            let clock = RecordingClock()
            var attempts = 0
            do {
                let _: Void = try await withRetry(maxRetryCount: retries, clock: clock, shouldRetry: retryEveryError) {
                    attempts += 1
                    throw TestError.transient
                }
                XCTFail("Expected exhaustion")
            } catch {
                XCTAssertEqual(error as? TestError, .transient)
            }
            XCTAssertEqual(attempts, retries + 1)
            let sleeps = await clock.sleeps
            XCTAssertEqual(sleeps.count, retries)
        }
    }

    func testPermanentAndCancellationErrorsNeverRetry() async {
        let errors: [Error] = [TestError.permanent, CancellationError(), URLError(.cancelled)]
        for expected in errors {
            let clock = RecordingClock()
            var attempts = 0
            do {
                let _: Void = try await withRetry(clock: clock, shouldRetry: retryNonTestErrors) {
                    attempts += 1
                    throw expected
                }
                XCTFail("Expected the operation error")
            } catch {
                XCTAssertEqual(String(reflecting: type(of: error)), String(reflecting: type(of: expected)))
            }
            XCTAssertEqual(attempts, 1)
            let sleeps = await clock.sleeps
            XCTAssertTrue(sleeps.isEmpty)
        }
    }

    func testCancelledCallerDoesNotStartOperation() async {
        var attempts = 0
        let task = Task {
            try await withRetry(shouldRetry: retryEveryError) {
                attempts += 1
            }
        }
        task.cancel()
        do {
            try await task.value
            XCTFail("Expected cancellation")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
        XCTAssertEqual(attempts, 0)
    }

    func testCallerCancellationInterruptsBackoff() async {
        let sleeping = expectation(description: "Backoff started")
        let finished = expectation(description: "Cancellation finished promptly")
        let clock = SleepingClock(onSleep: { sleeping.fulfill() })
        var attempts = 0
        let task = Task {
            defer { finished.fulfill() }
            let _: Void = try await withRetry(clock: clock, shouldRetry: retryEveryError) {
                attempts += 1
                throw TestError.transient
            }
        }
        await fulfillment(of: [sleeping], timeout: 1)
        task.cancel()
        await fulfillment(of: [finished], timeout: 1)
        do {
            try await task.value
            XCTFail("Expected cancellation")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
        XCTAssertEqual(attempts, 1)
    }

    func testPersonalDataRemovalRetriesOnlyTransientTransportFailures() {
        XCTAssertTrue(StorefrontRetryPolicy.personalDataRemoval(URLError(.timedOut)))
        XCTAssertTrue(StorefrontRetryPolicy.personalDataRemoval(GraphQLError.httpError(statusCode: 429, data: Data())))
        XCTAssertTrue(StorefrontRetryPolicy.personalDataRemoval(GraphQLError.httpError(statusCode: 503, data: Data())))
        XCTAssertFalse(StorefrontRetryPolicy.personalDataRemoval(URLError(.cancelled)))
        XCTAssertFalse(StorefrontRetryPolicy.personalDataRemoval(GraphQLError.httpError(statusCode: 401, data: Data())))
        XCTAssertFalse(StorefrontRetryPolicy.personalDataRemoval(TestError.permanent))
    }

    func testPaymentUpdateRetriesOnlyExplicitTransientCartRejections() {
        func error(_ codes: [StorefrontAPI.CartErrorCode?]) -> StorefrontAPI.Errors {
            .userError(userErrors: codes.map { .init(code: $0, message: "Synthetic error", field: nil) }, cart: nil)
        }
        XCTAssertTrue(StorefrontRetryPolicy.paymentUpdate(error([.pendingDeliveryGroups])))
        XCTAssertTrue(StorefrontRetryPolicy.paymentUpdate(error([.serviceUnavailable])))
        XCTAssertFalse(StorefrontRetryPolicy.paymentUpdate(error([.pendingDeliveryGroups, .invalidPayment])))
        XCTAssertFalse(StorefrontRetryPolicy.paymentUpdate(error([nil])))
        XCTAssertFalse(StorefrontRetryPolicy.paymentUpdate(error([])))
        XCTAssertFalse(StorefrontRetryPolicy.paymentUpdate(URLError(.timedOut)))
        XCTAssertFalse(StorefrontRetryPolicy.paymentUpdate(GraphQLError.httpError(statusCode: 503, data: Data())))
    }

    private actor RecordingClock: Clock {
        var sleeps: [UInt64] = []

        func sleep(nanoseconds: UInt64) async throws {
            sleeps.append(nanoseconds)
        }
    }

    private struct SleepingClock: Clock {
        let onSleep: @Sendable () -> Void

        func sleep(nanoseconds _: UInt64) async throws {
            onSleep()
            try await Task<Never, Never>.sleep(nanoseconds: 5_000_000_000)
        }
    }

    // MARK: - Exponential Delay Tests

    func testExponentialDelayAttempt1BaseDelay1() {
        let delay = exponentialDelay(for: 1, with: 1.0)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(2.0 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 1 with base 1.0s should delay 2.0s")
    }

    func testExponentialDelayAttempt2BaseDelay1() {
        let delay = exponentialDelay(for: 2, with: 1.0)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(4.0 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 2 with base 1.0s should delay 4.0s")
    }

    func testExponentialDelayAttempt3BaseDelay1() {
        let delay = exponentialDelay(for: 3, with: 1.0)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(8.0 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 3 with base 1.0s should delay 8.0s")
    }

    func testExponentialDelayAttempt4BaseDelay1() {
        let delay = exponentialDelay(for: 4, with: 1.0)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(16.0 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 4 with base 1.0s should delay 16.0s")
    }

    func testExponentialDelayAttempt1BaseDelayPointOne() {
        let delay = exponentialDelay(for: 1, with: 0.1)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(0.2 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 1 with base 0.1s should delay 0.2s")
    }

    func testExponentialDelayAttempt2BaseDelayPointOne() {
        let delay = exponentialDelay(for: 2, with: 0.1)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(0.4 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 2 with base 0.1s should delay 0.4s")
    }

    func testExponentialDelayAttempt0BaseDelay1() {
        let delay = exponentialDelay(for: 0, with: 1.0)
        let oneSecond = TimeInterval(1_000_000_000)
        let expected = UInt64(1.0 * oneSecond)
        XCTAssertEqual(delay, expected, "Attempt 0 with base 1.0s should delay 1.0s")
    }

    func testExponentialDelayRespectsCap() {
        let baseDelay: TimeInterval = 10.0 // 10 seconds

        // At attempt 3: 10 * 2^3 = 80s, should be capped at 30s
        let delay = exponentialDelay(for: 3, with: baseDelay)
        let oneSecond = TimeInterval(1_000_000_000)

        XCTAssertEqual(delay, UInt64(30.0 * oneSecond))
    }

    func testExponentialDelayReturnsNanoseconds() {
        let baseDelay: TimeInterval = 1.0

        let delay = exponentialDelay(for: 1, with: baseDelay)

        // Should be 2 billion nanoseconds (2 seconds)
        XCTAssertEqual(delay, 2_000_000_000)
    }
}
