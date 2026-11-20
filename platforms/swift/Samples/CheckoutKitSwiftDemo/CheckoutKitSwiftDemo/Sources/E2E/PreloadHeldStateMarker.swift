import Combine
import Foundation
import ShopifyCheckoutKit

/// Maps the preload state when the SDK held it for a presented checkout, and the state now, to an
/// identifier.
///
/// A presented checkout reports its preload's idle state when it is dismissed. The first value
/// reads the handle when the SDK held that state; the second reads it after.
enum PreloadHeldStateMarker {
    static func testId(whenHeld: String, now: PreloadState) -> String {
        "\(AccessibilityIdentifiers.preloadWhenHeldPrefix)\(whenHeld)-now-\(value(for: now))"
    }

    static func value(for state: PreloadState) -> String {
        if case .ready = state { "ready" } else { "not-ready" }
    }
}

/// Publishes the preload state when the SDK held it for a presented checkout, and the state now.
///
/// `@unchecked Sendable` is safe because every mutable property is only used on the main thread.
final class PreloadHeldStateLog: ObservableObject, @unchecked Sendable {
    /// Must stay in step with the SDK diagnostic that the preload cache emits when it holds a state.
    static let diagnostic = "Holding preload state until checkout is dismissed"

    static let shared = PreloadHeldStateLog()

    @Published private(set) var testId = PreloadHeldStateMarker.testId(whenHeld: "none", now: .idle())

    private var whenHeld = "none"
    private var currentState: PreloadState = .idle()
    private var isDismissed = false

    func record(_ state: PreloadState) {
        currentState = state
        publish()
    }

    func recordPresentation() {
        whenHeld = "none"
        isDismissed = false
        publish()
    }

    func recordDismissal() {
        isDismissed = true
    }

    /// Reads the state when the SDK reports that it held one. A diagnostic seen only after
    /// dismissal cannot tell what the handle reported during checkout, so it records `late`.
    func observe(_ message: String) {
        guard message.contains(Self.diagnostic) else { return }

        // The SDK holds a state on the main thread and logs it synchronously.
        if Thread.isMainThread {
            recordHeld()
        } else {
            DispatchQueue.main.async { self.recordHeld() }
        }
    }

    private func recordHeld() {
        whenHeld = isDismissed ? "late" : PreloadHeldStateMarker.value(for: currentState)
        publish()
    }

    private func publish() {
        testId = PreloadHeldStateMarker.testId(whenHeld: whenHeld, now: currentState)
    }
}
