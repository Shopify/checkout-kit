@testable import CheckoutKitSwiftDemo
import ShopifyCheckoutKit
import XCTest

class PreloadCacheHitMarkerTests: XCTestCase {
    func testPreloadObservabilityKeyMatchesTheLaunchArgument() {
        XCTAssertEqual(
            AppStorageKeys.preloadObservabilityEnabled.rawValue,
            "preloadObservabilityEnabled"
        )
    }

    func testMarkerTextsMatchTheMaestroFlowAssertions() {
        XCTAssertEqual(PreloadCacheHitMarker.testId(hits: 0), "preload-cache-hit-0")
        XCTAssertEqual(PreloadCacheHitMarker.testId(hits: 1), "preload-cache-hit-1")
        XCTAssertEqual(PreloadCacheHitMarker.testId(hits: 2), "preload-cache-hit-2")
    }

    func testTheObserverRecordsTheReadyCacheHitDiagnostic() {
        let observer = PreloadCacheHitLog()

        XCTAssertEqual(observer.hits, 0)

        observer.record("14:02:11: Presenting preloaded checkout from cache for https://example.com")

        XCTAssertEqual(observer.hits, 1)
    }

    func testTheObserverCountsEachReadyCacheHit() {
        let observer = PreloadCacheHitLog()

        observer.record(PreloadCacheHitLog.diagnostic)
        observer.record(PreloadCacheHitLog.diagnostic)

        XCTAssertEqual(observer.hits, 2)
    }

    func testTheObserverIgnoresUnrelatedMessages() {
        let observer = PreloadCacheHitLog()

        observer.record("Preload state changed to ready")
        observer.record("Presenting cached entry")

        XCTAssertEqual(observer.hits, 0)
    }

    func testResetClearsTheObservation() {
        let observer = PreloadCacheHitLog()
        observer.record(PreloadCacheHitLog.diagnostic)

        observer.reset()

        XCTAssertEqual(observer.hits, 0)
    }

    func testTheLoggerForwardsEveryMessageToTheWrappedLogger() {
        let spy = SpyLogger()
        let observer = PreloadCacheHitLog()
        let logger = ObservingLogger(wrapping: spy, observer: observer)

        logger.log("first")
        logger.log(PreloadCacheHitLog.diagnostic)

        XCTAssertEqual(spy.messages, ["first", PreloadCacheHitLog.diagnostic])
        XCTAssertEqual(observer.hits, 1)
    }

    func testClearingLogsAlsoClearsTheObservation() {
        let spy = SpyLogger()
        let observer = PreloadCacheHitLog()
        let logger = ObservingLogger(wrapping: spy, observer: observer)
        logger.log(PreloadCacheHitLog.diagnostic)

        logger.clearLogs()

        XCTAssertEqual(observer.hits, 0)
        XCTAssertTrue(spy.didClear)
    }
}

private final class SpyLogger: Logger, @unchecked Sendable {
    private(set) var messages: [String] = []
    private(set) var didClear = false

    func log(_ message: String) {
        messages.append(message)
    }

    func clearLogs() {
        didClear = true
    }
}
