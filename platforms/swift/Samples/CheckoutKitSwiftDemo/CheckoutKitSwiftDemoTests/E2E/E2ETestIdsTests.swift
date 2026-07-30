@testable import CheckoutKitSwiftDemo
import XCTest

class E2ETestIdsTests: XCTestCase {
    func testAppReadyMarkerMatchesTheMaestroFlows() {
        XCTAssertEqual(E2ETestIds.appReady, "checkout-kit-sample-ready")
    }
}
