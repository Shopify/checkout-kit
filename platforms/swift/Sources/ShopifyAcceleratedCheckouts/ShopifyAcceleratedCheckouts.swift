import ShopifyCheckoutKit

public enum ShopifyAcceleratedCheckouts {
    /// Storefront API version used for cart operations
    internal static let apiVersion = "2026-04"

    internal static let name = "ShopifyAcceleratedCheckouts"

    /// The logging level for Accelerated Checkouts operations
    /// Default: .error - which will emit "error" and "fault" logs
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
    internal static let logger = OSLogger(prefix: name, logLevel: .error)
}
