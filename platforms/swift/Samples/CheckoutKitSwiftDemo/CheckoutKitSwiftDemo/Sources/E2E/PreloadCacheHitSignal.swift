import Foundation
import ShopifyCheckoutKit

/// Decorates the sample's configured ``Logger`` so the SDK's preload cache-hit
/// diagnostic becomes observable by the Maestro preload flows.
///
/// The SDK logs ``PreloadCacheHitSignal/cacheHitLogMessage`` through the public
/// `Configuration.logger` when a matching presentation reuses the preloaded
/// WebView. This wrapper forwards every message unchanged and posts
/// ``PreloadCacheHitSignal/notification`` when that message arrives, which the
/// cart screen converts into the invisible `preload-cache-hit` test ID.
enum PreloadCacheHitSignal {
    static let notification = Notification.Name("CheckoutKitSampleDidLogPreloadCacheHit")

    /// Keep in sync with `CheckoutWebView.preloadCacheHitLogMessage`.
    static let cacheHitLogMessage = "Presenting preloaded checkout from cache"
}

final class PreloadCacheHitSignalLogger: Logger {
    private let wrapped: any Logger

    init(wrapping wrapped: any Logger) {
        self.wrapped = wrapped
    }

    func log(_ message: String) {
        if message == PreloadCacheHitSignal.cacheHitLogMessage {
            NotificationCenter.default.post(name: PreloadCacheHitSignal.notification, object: nil)
        }
        wrapped.log(message)
    }

    func clearLogs() {
        wrapped.clearLogs()
    }
}
