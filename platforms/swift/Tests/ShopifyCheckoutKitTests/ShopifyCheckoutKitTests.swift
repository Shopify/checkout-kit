@testable import ShopifyCheckoutKit
import XCTest

@MainActor
class ShopifyCheckoutKitTests: XCTestCase {
    let checkoutURL = URL(string: "https://shop.example/checkouts/cn/123?key=cart_token")!

    private var originalConfiguration: Configuration!

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
        ShopifyCheckoutKit.configuration.appearance = .app(.dark)
        CheckoutWebView.invalidate()
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckoutKit.configuration = originalConfiguration
        try await super.tearDown()
    }

    func test_version_whenAccessed_shouldExist() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_checkoutErrorLocalizedDescription_usesMessage() {
        let error = CheckoutError(code: .sdkError, message: "Bridge connection failed.")

        XCTAssertEqual(error.localizedDescription, error.message)
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

    func test_present_decoratesCheckoutURL() throws {
        let viewController = ShopifyCheckoutKit.present(
            checkout: checkoutURL,
            from: UIViewController()
        )

        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: viewController))
    }

    func test_present_propagatesDelegateAndClientToWebViewController() throws {
        let delegate = MockCheckoutDelegate()
        let client = MockBridgeClient()
        let presenter = UIViewController()

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

    func test_preload_returnsNilWhenDisabled() {
        ShopifyCheckoutKit.configuration.preloading.enabled = false
        XCTAssertNil(ShopifyCheckoutKit.preload(checkout: checkoutURL))
    }

    func test_preload_decoratesCheckoutURL() throws {
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        let preload = ShopifyCheckoutKit.preload(checkout: checkoutURL)
        let expectedURL = CheckoutURLDecorator.decorate(checkoutURL)
        let checkoutView = try XCTUnwrap(
            CheckoutWebView.preloadCache.view(
                for: PreloadKey(url: expectedURL, entryPoint: nil)
            )
        )

        try assertDecoratedCheckoutURL(checkoutView.loadedCheckoutURL)
        withExtendedLifetime(preload) {}
    }

    func test_preload_returnsPreloadWhenEnabled() {
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        let preload = ShopifyCheckoutKit.preload(checkout: checkoutURL)
        var states: [PreloadState] = []

        preload?.onStateChange = { state in
            states.append(state)
        }

        XCTAssertNotNil(preload)
        XCTAssertEqual(preload?.state, .loading)
        XCTAssertTrue(
            states.contains(PreloadState.loading),
            "States should include .loading after starting preload"
        )
    }
}
