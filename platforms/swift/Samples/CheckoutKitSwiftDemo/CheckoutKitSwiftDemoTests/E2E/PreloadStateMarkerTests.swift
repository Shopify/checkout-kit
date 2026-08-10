@testable import CheckoutKitSwiftDemo
import ShopifyCheckoutKit
import XCTest

class PreloadStateMarkerTests: XCTestCase {
    func testLifecycleMarkerTextsMatchTheMaestroFlowAssertions() {
        XCTAssertEqual(PreloadStateMarker.text(for: .idle), "idle")
        XCTAssertEqual(PreloadStateMarker.text(for: .loading), "loading")
        XCTAssertEqual(PreloadStateMarker.text(for: .ready), "ready")
        XCTAssertEqual(PreloadStateMarker.text(for: .expired), "expired")
    }

    func testHttpFailureMarkerTextIncludesTheStatusCode() {
        XCTAssertEqual(
            PreloadStateMarker.text(for: .failed(reason: .httpError(statusCode: 403))),
            "failed-http-403"
        )
        XCTAssertEqual(
            PreloadStateMarker.text(for: .failed(reason: .httpError(statusCode: 500))),
            "failed-http-500"
        )
    }

    func testNonHttpFailureMarkerTexts() {
        XCTAssertEqual(PreloadStateMarker.text(for: .failed(reason: .navigationFailed)), "failed-navigation")
        XCTAssertEqual(PreloadStateMarker.text(for: .failed(reason: .keepAliveLost)), "failed-keep-alive")
        XCTAssertEqual(
            PreloadStateMarker.text(for: .failed(reason: .webContentProcessTerminated)),
            "failed-web-process"
        )
        XCTAssertEqual(PreloadStateMarker.text(for: .failed(reason: .protocolError)), "failed-protocol")
    }

    func testDynamicTestIdsMatchTheMaestroFlowAssertions() {
        XCTAssertEqual(PreloadStateMarker.testId(for: .idle), "preload-state-idle")
        XCTAssertEqual(PreloadStateMarker.testId(for: .ready), "preload-state-ready")
        XCTAssertEqual(
            PreloadStateMarker.testId(for: .failed(reason: .httpError(statusCode: 403))),
            "preload-state-failed-http-403"
        )
    }
}
