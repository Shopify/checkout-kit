import os.log
@testable import ShopifyAcceleratedCheckouts
@testable import ShopifyCheckoutKit
import XCTest

@available(iOS 17.0, *)
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

    func test_logLevel_withDefaultConfiguration_shouldDefaultToError() {
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logLevel,
            LogLevel.error,
            "Default logLevel should be .error"
        )
        XCTAssertNotNil(ShopifyAcceleratedCheckouts.logger)
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel,
            LogLevel.error,
            "Default logger logLevel should be .error"
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
        ShopifyAcceleratedCheckouts.logLevel = .all
        XCTAssertEqual(
            ShopifyAcceleratedCheckouts.logger.logLevel, .all, "Logger should have .all log level"
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
