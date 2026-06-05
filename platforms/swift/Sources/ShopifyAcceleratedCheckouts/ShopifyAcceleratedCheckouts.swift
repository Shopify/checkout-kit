import ShopifyCheckoutKit

public enum ShopifyAcceleratedCheckouts {
    /// Storefront API version used for cart operations
    internal static let apiVersion = "2026-04"

    internal static let name = "accelerated_checkout"

    /// The logging level for Accelerated Checkouts operations
    /// Default: .error - which will emit "error" and "fault" logs
    public static var logLevel: LogLevel = .error {
        didSet {
            logger.logLevel = logLevel
        }
    }

    /// Shared logger for ShopifyAcceleratedCheckouts
    /// To modify the logLevel
    internal static var logger = OSLogger(prefix: name, logLevel: logLevel)
}
