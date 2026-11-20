@testable import CheckoutKitSwiftDemo
import ShopifyCheckoutKit
import XCTest

class PreloadHeldStateMarkerTests: XCTestCase {
    func testMarkerBeforeTheSDKHoldsAState() {
        XCTAssertEqual(
            PreloadHeldStateMarker.testId(whenHeld: "none", now: .ready),
            "preload-when-held-none-now-ready"
        )
    }

    func testMarkerMatchesTheMaestroFlowAssertion() {
        XCTAssertEqual(
            PreloadHeldStateMarker.testId(
                whenHeld: PreloadHeldStateMarker.value(for: .ready),
                now: .idle(reason: .invalidated)
            ),
            "preload-when-held-ready-now-not-ready"
        )
    }

    func testDiagnosticReadsTheStateWhenTheSDKHoldsIt() {
        let log = PreloadHeldStateLog()
        log.recordPresentation()
        log.record(.ready)

        log.observe("14:02:11: \(PreloadHeldStateLog.diagnostic)")
        log.record(.idle(reason: .invalidated))

        XCTAssertEqual(log.testId, "preload-when-held-ready-now-not-ready")
    }

    func testDiagnosticAfterDismissalIsLate() {
        let log = PreloadHeldStateLog()
        log.recordPresentation()
        log.record(.ready)
        log.recordDismissal()

        log.observe(PreloadHeldStateLog.diagnostic)

        XCTAssertEqual(log.testId, "preload-when-held-late-now-ready")
    }

    func testOtherMessagesAreIgnored() {
        let log = PreloadHeldStateLog()
        log.record(.ready)

        log.observe("Invalidating preload cache")

        XCTAssertEqual(log.testId, "preload-when-held-none-now-ready")
    }

    func testNewPresentationResetsHeldState() {
        let log = PreloadHeldStateLog()
        log.recordPresentation()
        log.record(.ready)
        log.observe(PreloadHeldStateLog.diagnostic)
        log.recordDismissal()
        log.record(.idle(reason: .invalidated))

        log.recordPresentation()
        log.record(.ready)

        XCTAssertEqual(log.testId, "preload-when-held-none-now-ready")
    }
}
