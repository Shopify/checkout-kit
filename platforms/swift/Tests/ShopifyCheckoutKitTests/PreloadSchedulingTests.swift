@testable import ShopifyCheckoutKit
import XCTest

@MainActor
final class PreloadSchedulingTests: XCTestCase {
    private let key = PreloadKey(url: URL(string: "https://example.com/checkout")!, entryPoint: nil)

    override func setUp() async throws {
        try await super.setUp()
        CheckoutTelemetry.overrideRecorderForTesting(NoOpTestTelemetryRecorder())
    }

    override func tearDown() async throws {
        CheckoutTelemetry.overrideRecorderForTesting(nil)
        try await super.tearDown()
    }

    func test_expiryQueuedBeforeReplacementDoesNotEvictReplacement() async {
        let scheduler = ManualScheduler()
        let cache = PreloadCache(scheduler: scheduler)
        _ = cache.store(CheckoutWebView(), for: key)
        let oldExpiry = scheduler.actions[1]
        let replacement = CheckoutWebView()
        _ = cache.store(replacement, for: key)

        XCTAssertTrue(oldExpiry.cancelled)
        await oldExpiry.fire()

        XCTAssertTrue(cache.contains(replacement))
        XCTAssertEqual(cache.state, .loading)
        cache.invalidate()
    }

    func test_expiryQueuedBeforePresentationDoesNotEvictRearmedEntry() async {
        let scheduler = ManualScheduler()
        let cache = PreloadCache(scheduler: scheduler)
        let view = CheckoutWebView()
        _ = cache.store(view, for: key)
        let oldExpiry = scheduler.actions[1]
        _ = cache.view(for: key)
        XCTAssertTrue(cache.retainAfterPresentation(view))

        await oldExpiry.fire()

        XCTAssertTrue(cache.contains(view))
        XCTAssertTrue(cache.hasActiveExpiryTimer())
        cache.invalidate()
    }

    func test_keepAliveFailureAfterReplacementDoesNotEvictReplacement() async {
        await assertLateKeepAliveFailureIsIgnored(replace: true)
    }

    func test_keepAliveFailureAfterPresentationDoesNotEvictPresentedEntry() async {
        await assertLateKeepAliveFailureIsIgnored(replace: false)
    }

    private func assertLateKeepAliveFailureIsIgnored(replace: Bool) async {
        let scheduler = ManualScheduler()
        let started = expectation(description: "Keep-alive started")
        let evaluation = PendingEvaluation(started: started)
        let cache = PreloadCache(scheduler: scheduler, evaluateKeepAlive: { _ in
            try await evaluation.run()
        })
        let original = CheckoutWebView()
        _ = cache.store(original, for: key)
        let callback = Task { await scheduler.actions[0].fire() }
        await fulfillment(of: [started], timeout: 1)

        let current: CheckoutWebView
        if replace {
            current = CheckoutWebView()
            _ = cache.store(current, for: key)
        } else {
            current = original
            _ = cache.view(for: key)
        }
        evaluation.fail()
        await callback.value

        XCTAssertTrue(cache.contains(current))
        XCTAssertEqual(cache.state, .loading)
        XCTAssertTrue(current.isBridgeAttached)
        cache.invalidate()
    }

    func test_currentKeepAliveFailureEvictsEntry() async {
        let scheduler = ManualScheduler()
        let cache = PreloadCache(scheduler: scheduler, evaluateKeepAlive: { _ in
            throw URLError(.networkConnectionLost)
        })
        let view = CheckoutWebView()
        _ = cache.store(view, for: key)

        await scheduler.actions[0].fire()

        XCTAssertFalse(cache.hasEntry())
        XCTAssertFalse(view.isBridgeAttached)
        XCTAssertEqual(cache.state, .failed(reason: .webContentUnavailable, message: "Preload keep-alive failed."))
    }

    func test_expiryUsesInjectedClockAndOriginalLifetime() {
        let scheduler = ManualScheduler()
        var now = Date(timeIntervalSince1970: 1000)
        let cache = PreloadCache(now: { now }, scheduler: scheduler)
        let view = CheckoutWebView()
        _ = cache.store(view, for: key)
        XCTAssertEqual(scheduler.actions[1].interval, 300)

        _ = cache.view(for: key)
        now.addTimeInterval(120)
        XCTAssertTrue(cache.retainAfterPresentation(view))
        XCTAssertEqual(scheduler.actions[2].interval, 180)

        now.addTimeInterval(180)
        XCTAssertFalse(cache.hasEntry())
        XCTAssertEqual(cache.state, .expired)
    }

    @MainActor
    private final class PendingEvaluation {
        let started: XCTestExpectation
        var continuation: CheckedContinuation<Void, Error>?

        init(started: XCTestExpectation) {
            self.started = started
        }

        func run() async throws {
            try await withCheckedThrowingContinuation { continuation in
                self.continuation = continuation
                started.fulfill()
            }
        }

        func fail() {
            continuation?.resume(throwing: URLError(.networkConnectionLost))
            continuation = nil
        }
    }

    private final class ManualScheduler: PreloadScheduling {
        var actions: [ScheduledAction] = []

        func schedule(
            after interval: TimeInterval,
            repeats _: Bool,
            action: @escaping @MainActor @Sendable () async -> Void
        ) -> any PreloadScheduledTask {
            let scheduled = ScheduledAction(interval: interval, action: action)
            actions.append(scheduled)
            return scheduled
        }
    }

    private final class ScheduledAction: PreloadScheduledTask {
        let interval: TimeInterval
        let action: @MainActor @Sendable () async -> Void
        private(set) var cancelled = false

        init(interval: TimeInterval, action: @escaping @MainActor @Sendable () async -> Void) {
            self.interval = interval
            self.action = action
        }

        func cancel() {
            cancelled = true
        }

        /// Deliberately deliver cancelled callbacks to model work already queued on the main actor.
        func fire() async {
            await action()
        }
    }
}
