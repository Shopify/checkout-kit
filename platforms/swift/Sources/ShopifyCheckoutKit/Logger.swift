import Foundation
import os.log

private let subsystem = "com.shopify.checkoutkit"

public enum LogLevel: String, CaseIterable, Sendable {
    case all
    case debug
    case error
    case none
}

public final class OSLogger: Sendable {
    private let logger = OSLog(subsystem: subsystem, category: OSLog.Category.pointsOfInterest)
    private let prefix: String
    private let lockedLogLevel: LockedValue<LogLevel>
    private let sendToOSLogHandler: (@Sendable (String, OSLogType) -> Void)?

    package var logLevel: LogLevel {
        get {
            lockedLogLevel.get()
        }
        set {
            lockedLogLevel.set(newValue)
        }
    }

    private static let lockedSharedLogger = LockedValue(OSLogger())

    public static var shared: OSLogger {
        get {
            lockedSharedLogger.get()
        }
        set {
            lockedSharedLogger.set(newValue)
        }
    }

    public convenience init() {
        self.init(prefix: "ShopifyCheckoutKit", logLevel: ShopifyCheckoutKit.configuration.logLevel)
    }

    public convenience init(prefix: String, logLevel: LogLevel) {
        self.init(prefix: prefix, logLevel: logLevel, sendToOSLogHandler: nil)
    }

    init(
        prefix: String,
        logLevel: LogLevel,
        sendToOSLogHandler: (@Sendable (String, OSLogType) -> Void)?
    ) {
        self.prefix = prefix
        lockedLogLevel = LockedValue(logLevel)
        self.sendToOSLogHandler = sendToOSLogHandler
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
        if let sendToOSLogHandler {
            sendToOSLogHandler(message, type)
        } else {
            os_log("%@", log: logger, type: type, message)
        }
    }

    private func shouldEmit(_ choice: LogLevel) -> Bool {
        let currentLogLevel = logLevel

        if currentLogLevel == .none {
            return false
        }

        return currentLogLevel == .all || currentLogLevel == choice
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
