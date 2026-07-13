import os.log
@testable import ShopifyCheckoutKit
import XCTest

final class TestableOSLogger: Sendable {
    private let capturedMessagesStorage = LockedValue([(message: String, type: OSLogType)]())
    let logger: OSLogger

    var capturedMessages: [(message: String, type: OSLogType)] {
        capturedMessagesStorage.get()
    }

    convenience init() {
        self.init(prefix: "ShopifyCheckoutKit", logLevel: ShopifyCheckoutKit.configuration.logLevel)
    }

    init(prefix: String, logLevel: LogLevel) {
        logger = OSLogger(
            prefix: prefix,
            logLevel: logLevel,
            sendToOSLogHandler: { [capturedMessagesStorage] message, type in
                capturedMessagesStorage.update {
                    $0.append((message: message, type: type))
                }
            }
        )
    }

    func info(_ message: String) {
        logger.info(message)
    }

    func debug(_ message: String) {
        logger.debug(message)
    }

    func warn(_ message: String) {
        logger.warn(message)
    }

    func error(_ message: String) {
        logger.error(message)
    }

    func fault(_ message: String) {
        logger.fault(message)
    }
}

final class OSLoggerTests: XCTestCase {
    var originalConfiguration: Configuration!

    override func setUp() {
        super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
    }

    override func tearDown() {
        ShopifyCheckoutKit.configuration = originalConfiguration
        super.tearDown()
    }

    private func emitAll(_ logger: TestableOSLogger) {
        logger.info("test info")
        logger.debug("test debug")
        logger.warn("test warn")
        logger.error("test error")
        logger.fault("test fault")
    }

    func test_sharedLogger_whenAccessed_shouldExist() {
        XCTAssertNotNil(OSLogger.shared)
    }

    func test_defaultInitializer_withNoParameters_shouldUseConfigurationLogLevel() {
        ShopifyCheckoutKit.configure { $0.logLevel = .debug }

        let logger = OSLogger()

        XCTAssertEqual(logger.logLevel, .debug)
    }

    func test_sharedLogger_canBeReplaced() {
        let originalLogger = OSLogger.shared
        defer { OSLogger.shared = originalLogger }

        let replacementLogger = OSLogger(prefix: "Replacement", logLevel: .debug)

        OSLogger.shared = replacementLogger

        XCTAssertTrue(OSLogger.shared === replacementLogger)
    }

    func test_logLevelNone_withAllLogCalls_shouldBlockAllLogging() {
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .none)

        emitAll(logger)

        XCTAssertEqual(logger.capturedMessages.count, 0)
    }

    func test_logLevelDebug_withAllLogCalls_shouldAllowEveryLevel() {
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .debug)

        emitAll(logger)

        XCTAssertEqual(logger.capturedMessages.count, 5)
        XCTAssertEqual(logger.capturedMessages[0].message, "[ShopifyCheckoutKit] (Info) - test info")
        XCTAssertEqual(logger.capturedMessages[0].type, OSLogType.info)
        XCTAssertEqual(logger.capturedMessages[1].message, "[ShopifyCheckoutKit] (Debug) - test debug")
        XCTAssertEqual(logger.capturedMessages[1].type, OSLogType.debug)
        XCTAssertEqual(logger.capturedMessages[2].message, "[ShopifyCheckoutKit] (Warning) - test warn")
        XCTAssertEqual(logger.capturedMessages[2].type, OSLogType.default)
        XCTAssertEqual(logger.capturedMessages[3].message, "[ShopifyCheckoutKit] (Error) - test error")
        XCTAssertEqual(logger.capturedMessages[3].type, OSLogType.error)
        XCTAssertEqual(logger.capturedMessages[4].message, "[ShopifyCheckoutKit] (Fault) - test fault")
        XCTAssertEqual(logger.capturedMessages[4].type, OSLogType.fault)
    }

    func test_logLevelWarn_withAllLogCalls_shouldAllowWarnErrorAndFault() {
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .warn)

        emitAll(logger)

        XCTAssertEqual(logger.capturedMessages.count, 3)
        XCTAssertEqual(logger.capturedMessages[0].message, "[ShopifyCheckoutKit] (Warning) - test warn")
        XCTAssertEqual(logger.capturedMessages[0].type, OSLogType.default)
        XCTAssertEqual(logger.capturedMessages[1].message, "[ShopifyCheckoutKit] (Error) - test error")
        XCTAssertEqual(logger.capturedMessages[2].message, "[ShopifyCheckoutKit] (Fault) - test fault")
    }

    func test_logLevelError_withAllLogCalls_shouldAllowErrorAndFault() {
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .error)

        emitAll(logger)

        XCTAssertEqual(logger.capturedMessages.count, 2)
        XCTAssertEqual(logger.capturedMessages[0].message, "[ShopifyCheckoutKit] (Error) - test error")
        XCTAssertEqual(logger.capturedMessages[1].message, "[ShopifyCheckoutKit] (Fault) - test fault")
    }

    /// Regression: under the old exact-match model, selecting `.debug` silenced
    /// errors. Threshold semantics must make `.debug` the most verbose level, so
    /// errors and faults still surface.
    func test_logLevelDebug_shouldStillEmitErrorsAndFaults() {
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .debug)

        logger.error("boom")
        logger.fault("critical")

        XCTAssertEqual(logger.capturedMessages.count, 2)
        XCTAssertEqual(logger.capturedMessages[0].message, "[ShopifyCheckoutKit] (Error) - boom")
        XCTAssertEqual(logger.capturedMessages[1].message, "[ShopifyCheckoutKit] (Fault) - critical")
    }

    func test_sharedLogger_withConfigurationLogLevel_shouldMaintainBackwardsCompatibility() {
        ShopifyCheckoutKit.configuration.logLevel = .debug
        OSLogger.shared.info("test message")
    }

    func test_messageFormatting_withDifferentLogLevels_shouldFormatExactly() {
        let logger = TestableOSLogger(prefix: "ShopifyCheckoutKit", logLevel: .debug)

        logger.info("user action completed")
        logger.debug("processing checkout data")
        logger.warn("approaching rate limit")
        logger.error("network request failed")
        logger.fault("critical system error")

        XCTAssertEqual(logger.capturedMessages.count, 5)
        XCTAssertEqual(
            logger.capturedMessages[0].message,
            "[ShopifyCheckoutKit] (Info) - user action completed"
        )
        XCTAssertEqual(
            logger.capturedMessages[1].message,
            "[ShopifyCheckoutKit] (Debug) - processing checkout data"
        )
        XCTAssertEqual(
            logger.capturedMessages[2].message,
            "[ShopifyCheckoutKit] (Warning) - approaching rate limit"
        )
        XCTAssertEqual(
            logger.capturedMessages[3].message,
            "[ShopifyCheckoutKit] (Error) - network request failed"
        )
        XCTAssertEqual(
            logger.capturedMessages[4].message,
            "[ShopifyCheckoutKit] (Fault) - critical system error"
        )
    }

    func test_customPrefix_withLoggerInitialization_shouldUseCustomPrefix() {
        let customLogger = TestableOSLogger(prefix: "CustomModule", logLevel: .debug)

        customLogger.info("custom module message")
        customLogger.error("custom error")

        XCTAssertEqual(customLogger.capturedMessages.count, 2)
        XCTAssertEqual(
            customLogger.capturedMessages[0].message,
            "[CustomModule] (Info) - custom module message"
        )
        XCTAssertEqual(
            customLogger.capturedMessages[1].message,
            "[CustomModule] (Error) - custom error"
        )
    }

    func test_logLevelNone_withAllMessageTypes_shouldBlockAllMessagesRegardlessOfType() {
        let logger = TestableOSLogger(prefix: "Test", logLevel: .none)

        emitAll(logger)

        XCTAssertEqual(logger.capturedMessages.count, 0, "LogLevel.none should block all messages")
    }

    func test_logLevelError_withAllMessageTypes_shouldAllowErrorAndFaultOnly() {
        let logger = TestableOSLogger(prefix: "Test", logLevel: .error)

        emitAll(logger)

        XCTAssertEqual(logger.capturedMessages.count, 2, "Error level should only allow error and fault messages")
        XCTAssertTrue(logger.capturedMessages[0].message.contains("(Error) - test error"))
        XCTAssertTrue(logger.capturedMessages[1].message.contains("(Fault) - test fault"))
    }
}

final class NoOpLoggerTests: XCTestCase {
    func test_noOpLogger_whenUsed_shouldImplementLoggerProtocol() {
        let logger: ShopifyCheckoutKit.Logger = NoOpLogger()
        logger.log("test message")
        logger.clearLogs()
    }

    func test_noOpLogger_withLogCalls_shouldNotThrow() {
        let logger = NoOpLogger()

        XCTAssertNoThrow(logger.log("test message"))
        XCTAssertNoThrow(logger.clearLogs())
    }
}
