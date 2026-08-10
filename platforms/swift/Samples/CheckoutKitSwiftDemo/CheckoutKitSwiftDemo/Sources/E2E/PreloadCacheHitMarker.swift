import Foundation
import ShopifyCheckoutKit

/// Maps whether the SDK reported a ready preload cache hit to an identifier.
enum PreloadCacheHitMarker {
    static func testId(observed: Bool) -> String {
        "\(AccessibilityIdentifiers.preloadCacheHitPrefix)\(text(observed: observed))"
    }

    static func text(observed: Bool) -> String {
        observed ? "observed" : "none"
    }
}

/// Watches SDK logs and publishes whether a ready preload was reused.
///
/// `@unchecked Sendable` is safe because every published write runs on the main thread.
final class PreloadCacheHitLog: ObservableObject, @unchecked Sendable {
    /// Must stay in step with the SDK diagnostic that CheckoutWebView emits on a ready cache hit.
    static let diagnostic = "Presenting preloaded checkout from cache"

    static let shared = PreloadCacheHitLog()

    @Published private(set) var observed = false

    func record(_ message: String) {
        guard message.contains(Self.diagnostic) else { return }

        // The SDK logs off the main thread, and `observed` drives a SwiftUI identifier.
        if Thread.isMainThread {
            observed = true
        } else {
            DispatchQueue.main.async { self.observed = true }
        }
    }

    func reset() {
        if Thread.isMainThread {
            observed = false
        } else {
            DispatchQueue.main.async { self.observed = false }
        }
    }
}

/// Forwards every message to the sample's real logger, and lets the observer see it first.
final class ObservingLogger: Logger {
    private let wrapped: Logger
    private let observer: PreloadCacheHitLog

    init(wrapping wrapped: Logger, observer: PreloadCacheHitLog = .shared) {
        self.wrapped = wrapped
        self.observer = observer
    }

    func log(_ message: String) {
        observer.record(message)
        wrapped.log(message)
    }

    func clearLogs() {
        observer.reset()
        wrapped.clearLogs()
    }
}
