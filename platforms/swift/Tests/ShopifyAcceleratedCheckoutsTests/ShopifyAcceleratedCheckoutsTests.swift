import os.log
@testable import ShopifyAcceleratedCheckouts
@testable import ShopifyCheckoutKit
import XCTest

@available(iOS 17.0, *)
@MainActor
class ShopifyAcceleratedCheckoutsTests: XCTestCase {
    var originalLogLevel: LogLevel!

    override func setUp() {
        super.setUp()
        originalLogLevel = ShopifyAcceleratedCheckouts.logLevel
    }

    override func tearDown() {
        ShopifyAcceleratedCheckouts.logLevel = originalLogLevel
        super.tearDown()
    }

    func test_apiVersion_whenAccessed_shouldBePublic() {
        XCTAssertEqual(ShopifyAcceleratedCheckouts.apiVersion, "2026-04")
    }

    func test_logLevel_withDefaultConfiguration_shouldDefaultToWarn() {
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logLevel,
            LogLevel.warn,
            "Default logLevel should be .warn"
        )
        XCTAssertNotNil(ShopifyAcceleratedCheckouts.logger)
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel,
            LogLevel.warn,
            "Default logger logLevel should be .warn"
        )
    }

    func test_configuration_onLogLevelChange_usesExistingInstance() {
        let originalLogger = ShopifyAcceleratedCheckouts.logger
        let originalLogLevel = ShopifyAcceleratedCheckouts.logger.logLevel

        ShopifyAcceleratedCheckouts.logLevel = originalLogLevel
        let newLogger = ShopifyAcceleratedCheckouts.logger

        XCTAssertTrue(
            originalLogger === newLogger,
            "Changing log level should create a new logger instance"
        )
    }

    func test_logger_withDifferentLogLevels_shouldHaveCorrectLogLevel() {
        ShopifyAcceleratedCheckouts.logLevel = .debug
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel, .debug, "Logger should have .debug log level"
        )

        ShopifyAcceleratedCheckouts.logLevel = .debug
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel, .debug,
            "Logger should have .debug log level"
        )

        ShopifyAcceleratedCheckouts.logLevel = .error
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel, .error,
            "Logger should have .error log level"
        )

        ShopifyAcceleratedCheckouts.logLevel = .none
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel, .none, "Logger should have .none log level"
        )
    }
}
