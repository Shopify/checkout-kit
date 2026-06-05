import Foundation
import os.log

private let subsystem = "com.shopify.checkoutkit"
private let logPrefix = "checkout_kit"
private let defaultLogScope = "sdk"

public enum LogLevel: String, CaseIterable {
    case all
    case debug
    case error
    case none
}

public class OSLogger {
    private let logger = OSLog(subsystem: subsystem, category: OSLog.Category.pointsOfInterest)
    private var prefix: String
    package var logLevel: LogLevel

    public static var shared = OSLogger()

    public init() {
        prefix = defaultLogScope
        logLevel = ShopifyCheckoutKit.configuration.logLevel
    }

    public init(prefix: String, logLevel: LogLevel) {
        self.prefix = prefix
        self.logLevel = logLevel
    }

    public func debug(_ message: String) {
        guard shouldEmit(.debug) else { return }

        sendToOSLog("[\(logPrefix):\(prefix.toLogScope())] (Debug) - \(message)", type: .debug)
    }

    public func info(_ message: String) {
        guard shouldEmit(.debug) else { return }

        sendToOSLog("[\(logPrefix):\(prefix.toLogScope())] (Info) - \(message)", type: .info)
    }

    public func error(_ message: String) {
        guard shouldEmit(.error) else { return }

        sendToOSLog("[\(logPrefix):\(prefix.toLogScope())] (Error) - \(message)", type: .error)
    }

    public func fault(_ message: String) {
        guard shouldEmit(.error) else { return }

        sendToOSLog("[\(logPrefix):\(prefix.toLogScope())] (Fault) - \(message)", type: .fault)
    }

    /// Capturing `os_log` output is not possible
    /// This indirection lets us capture messages in `LoggerTests.swift`
    internal func sendToOSLog(_ message: String, type: OSLogType) {
        os_log("%@", log: logger, type: type, message)
    }

    private func shouldEmit(_ choice: LogLevel) -> Bool {
        if logLevel == .none {
            return false
        }

        return logLevel == .all || logLevel == choice
    }
}

extension String {
    fileprivate func toLogScope() -> String {
        switch self {
        case "ShopifyCheckoutKit", "checkout_kit":
            return defaultLogScope
        case "ShopifyAcceleratedCheckouts":
            return "accelerated_checkout"
        case "CheckoutECP":
            return "ecp"
        default:
            return self
        }
    }
}

public protocol Logger {
    func log(_ message: String)
    func clearLogs()
}

public class NoOpLogger: Logger {
    public func log(_: String) {}

    public func clearLogs() {}
}
