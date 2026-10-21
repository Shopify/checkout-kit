@testable import CheckoutKitSwiftDemo
import ShopifyCheckoutKit
import XCTest

class PreloadStateMarkerTests: XCTestCase {
    func testReadyMarkerMatchesTheMaestroFlowAssertion() {
        XCTAssertEqual(PreloadStateMarker.testId(for: .ready), "preload-state-ready")
    }

    func testNonReadyStateUsesTheFallbackMarker() {
        XCTAssertEqual(PreloadStateMarker.testId(for: .idle()), "preload-state-not-ready")
        XCTAssertEqual(PreloadStateMarker.testId(for: .idle(reason: .invalidated)), "preload-state-not-ready")
        XCTAssertEqual(PreloadStateMarker.testId(for: .idle(reason: .expired)), "preload-state-not-ready")
    }
}
