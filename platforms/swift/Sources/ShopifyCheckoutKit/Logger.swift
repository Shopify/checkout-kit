import Foundation
import os.log

private let subsystem = "com.shopify.checkoutkit"

public enum LogLevel: String, CaseIterable, Sendable {
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
        prefix = "ShopifyCheckoutKit"
        logLevel = ShopifyCheckoutKit.configuration.logLevel
    }

    public init(prefix: String, logLevel: LogLevel) {
        self.prefix = prefix
        self.logLevel = logLevel
    }

    public func debug(_ message: String) {
        guard shouldEmit(.debug) else { return }

        sendToOSLog("[\(prefix)] (Debug) - \(message)", type: .debug)
    }

    public func info(_ message: String) {
        guard shouldEmit(.debug) else { return }

        sendToOSLog("[\(prefix)] (Info) - \(message)", type: .info)
    }

    public func error(_ message: String) {
        guard shouldEmit(.error) else { return }

        sendToOSLog("[\(prefix)] (Error) - \(message)", type: .error)
    }

    public func fault(_ message: String) {
        guard shouldEmit(.error) else { return }

        sendToOSLog("[\(prefix)] (Fault) - \(message)", type: .fault)
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

public protocol Logger: Sendable {
    func log(_ message: String)
    func clearLogs()
}

public final class NoOpLogger: Logger {
    public func log(_: String) {}

    public func clearLogs() {}
}
