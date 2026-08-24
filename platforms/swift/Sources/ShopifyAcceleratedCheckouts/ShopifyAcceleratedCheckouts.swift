import Foundation
import ShopifyCheckoutKit

public enum ShopifyAcceleratedCheckouts {
    /// Storefront API version used for cart operations
    internal static let apiVersion = "2026-04"

    internal static let name = "ShopifyAcceleratedCheckouts"

    /// The logging level for Accelerated Checkouts operations
    /// Default: .warn - which emits warnings and errors
    public static var logLevel: LogLevel {
        get {
            logger.logLevel
        }
        set {
            logger.logLevel = newValue
        }
    }

    /// Shared logger for ShopifyAcceleratedCheckouts
    /// To modify the logLevel
    internal static let logger = OSLogger(prefix: name, logLevel: .warn)
}

@available(iOS 16.0, *)
enum AcceleratedCheckoutDebugTiming {
    private static let clock = ContinuousClock()

    static var now: ContinuousClock.Instant {
        clock.now
    }

    static func elapsedMilliseconds(since start: ContinuousClock.Instant) -> String {
        let components = start.duration(to: clock.now).components
        let milliseconds = Double(components.seconds) * 1000
            + Double(components.attoseconds) / 1_000_000_000_000_000
        return String(format: "%.1f", milliseconds)
    }

    static func seconds(_ interval: TimeInterval) -> String {
        String(format: "%.1f", interval)
    }
}
