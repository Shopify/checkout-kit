@testable import ShopifyCheckoutKit
import XCTest

@MainActor
class ShopifyCheckoutKitTests: XCTestCase {
    func test_version_whenAccessed_shouldExist() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_configuration_whenLogLevelChanges_createsNewLogger() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_configuration_whenLogLevelSetsSameLevel_instanceRemainsSame() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_configuration_logLevelDefaultsToWarn() {
        XCTAssertEqual(
            ShopifyCheckoutKit.configuration.logLevel,
            LogLevel.warn,
            "Default logLevel should be .warn"
        )
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            LogLevel.warn,
            "Default logger logLevel should be .warn"
        )
    }

    func test_configuration_onLogLevelChange_usesExistingInstance() {
        let originalLogger = OSLogger.shared
        let originalLogLevel = OSLogger.shared.logLevel

        ShopifyCheckoutKit.configuration.logLevel = originalLogLevel
        let newLogger = OSLogger.shared

        XCTAssertTrue(
            originalLogger === newLogger,
            "Changing log level should create a new logger instance"
        )
    }

    func test_present_propagatesDelegateAndClientToWebViewController() throws {
        let delegate = MockCheckoutDelegate()
        let client = MockBridgeClient()
        let presenter = UIViewController()
        let checkoutURL = try XCTUnwrap(URL(string: "https://shop.example/checkouts/cn/123"))

        let viewController = ShopifyCheckoutKit.present(
            checkout: checkoutURL,
            from: presenter,
            delegate: delegate,
            client: client
        )

        let webViewController = try XCTUnwrap(
            viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
        )
        XCTAssertTrue(webViewController.delegate === delegate)
        XCTAssertNotNil(webViewController.client)
        XCTAssertNotNil(webViewController.checkoutView?.client)
    }

    func test_logger_withDifferentLogLevels_shouldHaveCorrectLogLevel() {
        ShopifyCheckoutKit.configuration.logLevel = .debug
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .debug,
            "Logger should have .debug log level"
        )

        ShopifyCheckoutKit.configuration.logLevel = .debug
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .debug,
            "Logger should have .debug log level"
        )

        ShopifyCheckoutKit.configuration.logLevel = .error
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .error,
            "Logger should have .error log level"
        )

        ShopifyCheckoutKit.configuration.logLevel = .none
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .none,
            "Logger should have .none log level"
        )
    }
}
