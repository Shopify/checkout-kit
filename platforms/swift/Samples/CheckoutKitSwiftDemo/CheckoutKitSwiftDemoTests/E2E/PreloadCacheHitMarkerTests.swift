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
        XCTAssertEqual(PreloadCacheHitMarker.testId(observed: true), "preload-cache-hit-observed")
        XCTAssertEqual(PreloadCacheHitMarker.testId(observed: false), "preload-cache-hit-none")
    }

    func testTheObserverRecordsTheReadyCacheHitDiagnostic() {
        let observer = PreloadCacheHitLog()

        XCTAssertFalse(observer.observed)

        observer.record("14:02:11: Presenting preloaded checkout from cache for https://example.com")

        XCTAssertTrue(observer.observed)
    }

    func testTheObserverIgnoresUnrelatedMessages() {
        let observer = PreloadCacheHitLog()

        observer.record("Preload state changed to ready")
        observer.record("Presenting cached entry")

        XCTAssertFalse(observer.observed)
    }

    func testResetClearsTheObservation() {
        let observer = PreloadCacheHitLog()
        observer.record(PreloadCacheHitLog.diagnostic)

        observer.reset()

        XCTAssertFalse(observer.observed)
    }

    func testTheLoggerForwardsEveryMessageToTheWrappedLogger() {
        let spy = SpyLogger()
        let observer = PreloadCacheHitLog()
        let logger = ObservingLogger(wrapping: spy, observer: observer)

        logger.log("first")
        logger.log(PreloadCacheHitLog.diagnostic)

        XCTAssertEqual(spy.messages, ["first", PreloadCacheHitLog.diagnostic])
        XCTAssertTrue(observer.observed)
    }

    func testClearingLogsAlsoClearsTheObservation() {
        let spy = SpyLogger()
        let observer = PreloadCacheHitLog()
        let logger = ObservingLogger(wrapping: spy, observer: observer)
        logger.log(PreloadCacheHitLog.diagnostic)

        logger.clearLogs()

        XCTAssertFalse(observer.observed)
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
