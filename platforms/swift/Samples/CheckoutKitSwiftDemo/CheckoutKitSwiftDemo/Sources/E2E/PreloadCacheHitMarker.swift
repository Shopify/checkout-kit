import Foundation
import ShopifyCheckoutKit

/// Maps how many ready preload cache hits the SDK reported to an identifier.
///
/// A count, rather than a flag, lets a flow tell the first presentation's hit apart from a later
/// presentation that reuses the same preloaded checkout.
enum PreloadCacheHitMarker {
    static func testId(hits: Int) -> String {
        "\(AccessibilityIdentifiers.preloadCacheHitPrefix)\(hits)"
    }
}

/// Watches SDK logs and publishes how many times a ready preload was reused.
///
/// `@unchecked Sendable` is safe because every published write runs on the main thread.
final class PreloadCacheHitLog: ObservableObject, @unchecked Sendable {
    /// Must stay in step with the SDK diagnostic that CheckoutWebView emits on a ready cache hit.
    static let diagnostic = "Presenting preloaded checkout from cache"

    static let shared = PreloadCacheHitLog()

    @Published private(set) var hits = 0

    func record(_ message: String) {
        guard message.contains(Self.diagnostic) else { return }

        // The SDK logs off the main thread, and `hits` drives a SwiftUI identifier.
        if Thread.isMainThread {
            hits += 1
        } else {
            DispatchQueue.main.async { self.hits += 1 }
        }
    }

    func reset() {
        if Thread.isMainThread {
            hits = 0
        } else {
            DispatchQueue.main.async { self.hits = 0 }
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
        PreloadHeldStateLog.shared.observe(message)
        wrapped.log(message)
    }

    func clearLogs() {
        observer.reset()
        wrapped.clearLogs()
    }
}
