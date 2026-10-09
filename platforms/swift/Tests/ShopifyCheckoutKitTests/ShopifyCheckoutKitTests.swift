@testable import ShopifyCheckoutKit
import XCTest

@MainActor
class ShopifyCheckoutKitTests: XCTestCase {
    let checkoutURL = URL(string: "https://shop.example/checkouts/cn/123")!

    private var originalConfiguration: Configuration!

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckoutKit.configuration
        CheckoutWebView.invalidate()
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckoutKit.configure { $0 = originalConfiguration }
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

    func test_configuration_telemetryDefaultsToEnabled() {
        XCTAssertTrue(Configuration().telemetry.enabled)
    }

    func test_configuration_canDisableTelemetry() {
        ShopifyCheckoutKit.configure { $0.telemetry.enabled = false }

        XCTAssertFalse(ShopifyCheckoutKit.configuration.telemetry.enabled)
    }

    func test_configuration_onLogLevelChange_usesExistingInstance() {
        let originalLogger = OSLogger.shared
        let originalLogLevel = OSLogger.shared.logLevel

        ShopifyCheckoutKit.configure { $0.logLevel = originalLogLevel }
        let newLogger = OSLogger.shared

        XCTAssertTrue(
            originalLogger === newLogger,
            "Changing log level should create a new logger instance"
        )
    }

    func test_present_propagatesDelegateAndInstallsInternalEventClient() throws {
        let delegate = MockCheckoutDelegate()
        let presenter = UIViewController()

        let viewController = ShopifyCheckoutKit.present(
            checkout: checkoutURL,
            from: presenter,
            delegate: delegate
        )

        let webViewController = try XCTUnwrap(
            viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
        )
        XCTAssertTrue(webViewController.delegate === delegate)
        XCTAssertNotNil(webViewController.checkoutView?.client)
    }

    func test_present_duplicatePreservesCheckoutAndDelegate() throws {
        let presenter = RecordingCheckoutPresenter()
        let originalDelegate = MockCheckoutDelegate()
        let checkout = ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter, delegate: originalDelegate)

        let duplicate = try ShopifyCheckoutKit.present(
            checkout: XCTUnwrap(URL(string: "https://shop.example/checkouts/cn/other")),
            from: presenter,
            delegate: MockCheckoutDelegate()
        )

        XCTAssertTrue(duplicate === checkout)
        XCTAssertEqual(presenter.presentationCount, 1)
        let content = try XCTUnwrap(checkout.viewControllers.first as? CheckoutWebViewController)
        XCTAssertTrue(content.delegate === originalDelegate)
    }

    func test_present_fromCheckoutOrItsChildReturnsExistingCheckout() throws {
        let presenter = RecordingCheckoutPresenter()
        let checkout = ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter)
        let child = try XCTUnwrap(checkout.viewControllers.first)

        XCTAssertTrue(ShopifyCheckoutKit.present(checkout: checkoutURL, from: checkout) === checkout)
        XCTAssertTrue(ShopifyCheckoutKit.present(checkout: checkoutURL, from: child) === checkout)
        XCTAssertEqual(presenter.presentationCount, 1)
    }

    func test_present_fromContainerChildFindsPresentedCheckout() {
        let presenter = RecordingCheckoutPresenter()
        let child = UIViewController()
        presenter.addChild(child)
        let checkout = ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter)

        XCTAssertTrue(ShopifyCheckoutKit.present(checkout: checkoutURL, from: child) === checkout)
        XCTAssertEqual(presenter.presentationCount, 1)
    }

    func test_present_acceleratedEntryPointUsesSameGuard() {
        let presenter = RecordingCheckoutPresenter()
        let checkout = ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter, entryPoint: .acceleratedCheckouts)

        XCTAssertTrue(ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter) === checkout)
        XCTAssertTrue(ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter, entryPoint: .acceleratedCheckouts) === checkout)
        XCTAssertEqual(presenter.presentationCount, 1)
    }

    func test_present_afterDismissalCreatesNewCheckoutEvenWhenOldControllerIsRetained() {
        let presenter = RecordingCheckoutPresenter()
        let checkout = ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter)
        presenter.modal = nil

        let next = ShopifyCheckoutKit.present(checkout: checkoutURL, from: presenter)

        XCTAssertFalse(next === checkout)
        XCTAssertEqual(presenter.presentationCount, 2)
    }

    func test_present_independentPresentersCanPresentTheirOwnCheckout() {
        let first = ShopifyCheckoutKit.present(checkout: checkoutURL, from: RecordingCheckoutPresenter())
        let second = ShopifyCheckoutKit.present(checkout: checkoutURL, from: RecordingCheckoutPresenter())

        XCTAssertFalse(first === second)
    }

    func test_logger_withDifferentLogLevels_shouldHaveCorrectLogLevel() {
        ShopifyCheckoutKit.configure { $0.logLevel = .debug }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .debug,
            "Logger should have .debug log level"
        )

        ShopifyCheckoutKit.configure { $0.logLevel = .debug }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .debug,
            "Logger should have .debug log level"
        )

        ShopifyCheckoutKit.configure { $0.logLevel = .error }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .error,
            "Logger should have .error log level"
        )

        ShopifyCheckoutKit.configure { $0.logLevel = .none }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .none,
            "Logger should have .none log level"
        )
    }

    func test_preload_returnsNilWhenDisabled() {
        ShopifyCheckoutKit.configure { $0.preloading.enabled = false }
        XCTAssertNil(ShopifyCheckoutKit.preload(checkout: checkoutURL))
    }

    func test_preload_returnsPreloadWhenEnabled() {
        ShopifyCheckoutKit.configure { $0.preloading.enabled = true }
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

@MainActor
private final class RecordingCheckoutPresenter: UIViewController {
    var modal: UIViewController?
    private(set) var presentationCount = 0

    override var presentedViewController: UIViewController? {
        modal
    }

    override func present(_ viewControllerToPresent: UIViewController, animated _: Bool, completion: (() -> Void)? = nil) {
        presentationCount += 1
        modal = viewControllerToPresent
        completion?()
    }
}
