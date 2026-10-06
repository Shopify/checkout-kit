import Foundation
@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import XCTest

class ShopifyCheckoutKitTests: XCTestCase {
    private var shopifyCheckoutKit: RCTShopifyCheckoutKit!

    override func setUp() {
        super.setUp()
        shopifyCheckoutKit = getShopifyCheckoutKit()
        resetShopifyCheckoutKitDefaults()
    }

    override func tearDown() {
        shopifyCheckoutKit = nil
        super.tearDown()
    }

    private func resetShopifyCheckoutKitDefaults() {
        ShopifyCheckoutKit.configuration.appearance = .storefront
        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        ShopifyCheckoutKit.configuration.logLevel = LogLevel.warn
        ShopifyCheckoutKit.configuration.preloading.enabled = true
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = []
        ShopifyCheckoutKit.configuration.telemetry.enabled = true
    }

    private func getShopifyCheckoutKit() -> RCTShopifyCheckoutKit {
        return RCTShopifyCheckoutKit()
    }

    /// getConfig
    func testReturnsDefaultConfig() {
        // Call getConfig and capture the result
        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        // Verify that getConfig returned the expected result
        XCTAssertEqual(result?["colorScheme"] as? String, "storefront")
        XCTAssertEqual(result?["preloading"] as? Bool, true)
    }

    /// configure
    func testConfigure() {
        let configuration: [AnyHashable: Any] = [
            "colorScheme": "dark",
            "colors": [
                "ios": [
                    "tintColor": "#FF0000",
                    "backgroundColor": "#0000FF"
                ]
            ]
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark))
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, UIColor(hex: "#FF0000"))
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, UIColor(hex: "#0000FF"))
    }

    func testConfigureWithWebDefaultUsesStorefrontAppearance() {
        let configuration: [AnyHashable: Any] = [
            "colorScheme": "storefront"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront)
    }

    func testGetConfigReturnsColorSchemeIdForAppAppearance() {
        let configuration: [AnyHashable: Any] = [
            "colorScheme": "light"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["colorScheme"] as? String, "light")
    }

    func testConfigureSetsTitle() {
        let configuration: [AnyHashable: Any] = [
            "title": "Custom Checkout"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, "Custom Checkout")
    }

    func testGetConfigReturnsTitle() {
        let configuration: [AnyHashable: Any] = [
            "title": "Custom Checkout"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["title"] as? String, "Custom Checkout")
    }

    func testAllowedMessageOriginsRoundTrip() {
        shopifyCheckoutKit.setConfig(["allowedMessageOrigins": ["https://example.com", "https://*.example.com"]])

        XCTAssertEqual(
            ShopifyCheckoutKit.configuration.allowedMessageOrigins,
            ["https://example.com", "https://*.example.com"]
        )

        let result = shopifyCheckoutKit.getConfig() as? [String: Any]
        XCTAssertEqual(
            result?["allowedMessageOrigins"] as? [String],
            ["https://example.com", "https://*.example.com"]
        )
    }

    func testConfigureWithInvalidColors() {
        let configuration: [AnyHashable: Any] = [
            "colors": [
                "ios": [
                    "tintColor": "invalid"
                ]
            ]
        ]

        let defaultColorFallback = UIColor(red: 0, green: 0, blue: 0, alpha: 1)
        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, defaultColorFallback)
    }

    func testConfigureWithCloseButtonColor() {
        let configuration: [AnyHashable: Any] = [
            "colors": [
                "ios": [
                    "closeButtonColor": "#FF0000"
                ]
            ]
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, UIColor(hex: "#FF0000"))
    }

    func testConfigureWithInvalidCloseButtonColor() {
        let configuration: [AnyHashable: Any] = [
            "colors": [
                "ios": [
                    "closeButtonColor": "invalid"
                ]
            ]
        ]

        let defaultColorFallback = UIColor(red: 0, green: 0, blue: 0, alpha: 1)
        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, defaultColorFallback)
    }

    func testConfigureWithoutCloseButtonColor() {
        let configuration: [AnyHashable: Any] = [
            "colors": [
                "ios": [
                    "tintColor": "#FF0000"
                ]
            ]
        ]

        shopifyCheckoutKit.setConfig(configuration)

        // closeButtonTintColor should remain nil when not specified (uses system default)
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testGetConfigIncludesCloseButtonColor() {
        // Set a close button color
        let configuration: [AnyHashable: Any] = [
            "colors": [
                "ios": [
                    "closeButtonColor": "#00FF00"
                ]
            ]
        ]
        shopifyCheckoutKit.setConfig(configuration)

        // Call getConfig and capture the result
        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        // Verify that getConfig returned the close button color
        XCTAssertNotNil(result?["closeButtonColor"])
        let returnedColor = result?["closeButtonColor"] as? UIColor
        XCTAssertEqual(returnedColor, UIColor(hex: "#00FF00"))
    }

    func testConfigureWithLogLevelDebug() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "debug"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
    }

    func testConfigureWithLogLevelError() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "error"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.error)
    }

    func testConfigureWithLogLevelNone() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "none"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.none)
    }

    func testConfigureWithLogLevelWarn() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "warn"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.warn)
    }

    func testConfigureWithInvalidLogLevelKeepsTheCurrentLevel() {
        ShopifyCheckoutKit.configuration.logLevel = LogLevel.debug

        let configuration: [AnyHashable: Any] = [
            "logLevel": "invalid"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
    }

    func testLogLevelHandlesUppercaseDebug() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "DEBUG"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
    }

    func testLogLevelHandlesMixedCaseDebug() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "Debug"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
    }

    func testLogLevelHandlesUppercaseError() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "ERROR"
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.error)
    }

    func testSetConfigWithoutLogLevelKeepsTheNativeLevel() {
        ShopifyCheckoutKit.configuration.logLevel = LogLevel.debug

        let configuration: [AnyHashable: Any] = [:]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
    }

    func testGetConfigIncludesLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "debug"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "debug")
    }

    func testGetConfigReturnsTheNativeDefaultLogLevel() {
        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "warn")
    }

    func testConfigureCanDisablePreloading() {
        let configuration: [AnyHashable: Any] = [
            "preloading": false
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertFalse(ShopifyCheckoutKit.configuration.preloading.enabled)
    }

    func testGetConfigIncludesPreloading() {
        let configuration: [AnyHashable: Any] = [
            "preloading": false
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["preloading"] as? Bool, false)
    }

    func testSerializePreloadFailureMapsUnavailableWebContent() {
        let result = shopifyCheckoutKit.serializePreloadFailure(.webContentUnavailable)

        XCTAssertEqual(result["reason"] as? String, "webContentUnavailable")
    }

    func testConfigureCanDisableTelemetry() {
        shopifyCheckoutKit.setConfig(["telemetry": false])

        XCTAssertFalse(ShopifyCheckoutKit.configuration.telemetry.enabled)
    }

    func testGetConfigIncludesTelemetry() {
        shopifyCheckoutKit.setConfig(["telemetry": false])

        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["telemetry"] as? Bool, false)
    }

    func testPreloadWithInvalidURLDoesNotRetainCheckoutSheet() {
        let preloadAttemptCompleted = expectation(description: "preload attempt completed")

        shopifyCheckoutKit.preload("", requestId: "invalid-url")

        DispatchQueue.main.async {
            XCTAssertNil(self.shopifyCheckoutKit.checkoutSheet)
            preloadAttemptCompleted.fulfill()
        }

        wait(for: [preloadAttemptCompleted], timeout: 1)
    }

    func testInvalidateCacheDoesNotRetainCheckoutSheet() {
        let invalidateCompleted = expectation(description: "invalidate completed")

        shopifyCheckoutKit.invalidateCache()

        DispatchQueue.main.async {
            XCTAssertNil(self.shopifyCheckoutKit.checkoutSheet)
            invalidateCompleted.fulfill()
        }

        wait(for: [invalidateCompleted], timeout: 1)
    }

    func testGetConfigReturnsDebugForDebugLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "debug"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "debug")
    }

    func testGetConfigReturnsErrorForErrorLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "error"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "error")
    }

    func testGetConfigReturnsWarnForWarnLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "warn"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "warn")
    }

    func testGetConfigReturnsNoneForNoneLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "none"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "none")
    }

    func testGetConfigReportsEveryNativeColorScheme() {
        for colorScheme in Configuration.ColorScheme.allCases {
            shopifyCheckoutKit.setConfig(["colorScheme": colorScheme.rawValue])

            let result = shopifyCheckoutKit.getConfig() as? [String: Any]

            XCTAssertEqual(result?["colorScheme"] as? String, colorScheme.rawValue)
        }
    }

    func testEveryColorSchemeMapsToTheAppearanceTheUrlDecoratorReads() {
        let expectedAppearances: [(String, Configuration.Appearance)] = [
            ("light", .app(.light)),
            ("dark", .app(.dark)),
            ("automatic", .app(.automatic)),
            ("storefront", .storefront)
        ]

        for (colorScheme, expected) in expectedAppearances {
            shopifyCheckoutKit.setConfig(["colorScheme": colorScheme])

            XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, expected)
        }
    }

    func testConfigureWithUnknownColorSchemeKeepsTheCurrentAppearance() {
        shopifyCheckoutKit.setConfig(["colorScheme": "dark"])

        shopifyCheckoutKit.setConfig(["colorScheme": "sepia"])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark))
    }

    func testConfigureWithUnknownColorSchemeKeepsTheStorefrontAppearance() {
        shopifyCheckoutKit.setConfig(["colorScheme": "sepia"])

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront)
    }

    func testGetConfigReportsEveryNativeLogLevel() {
        for logLevel in LogLevel.allCases {
            shopifyCheckoutKit.setConfig(["logLevel": logLevel.rawValue])

            let result = shopifyCheckoutKit.getConfig() as? [String: Any]

            XCTAssertEqual(result?["logLevel"] as? String, logLevel.rawValue)
        }
    }

    func testGetConfigKeepsTheCurrentLevelForInvalidLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "invalid"
        ]
        shopifyCheckoutKit.setConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "warn")
    }

    func testFailedPresentDoesNotRetainCheckoutSheet() {
        let presentAttemptCompleted = expectation(description: "present attempt completed")

        shopifyCheckoutKit.present("", linkAction: "open", onResult: { _ in })

        DispatchQueue.main.async {
            XCTAssertNil(self.shopifyCheckoutKit.checkoutSheet)
            presentAttemptCompleted.fulfill()
        }

        wait(for: [presentAttemptCompleted], timeout: 1)
    }

    func testCheckoutDidDismissDismissesCheckoutSheetFromRCTWrapper() {
        let dismissCompleted = expectation(description: "checkout sheet dismissed")
        let checkoutSheet = DismissTrackingViewController()
        shopifyCheckoutKit.checkoutSheet = checkoutSheet

        shopifyCheckoutKit.dismiss()

        DispatchQueue.main.async {
            XCTAssertTrue(checkoutSheet.dismissCalled)
            XCTAssertTrue(checkoutSheet.dismissAnimated)
            XCTAssertNil(self.shopifyCheckoutKit.checkoutSheet)
            dismissCompleted.fulfill()
        }

        wait(for: [dismissCompleted], timeout: 1)
    }
}

private final class DismissTrackingViewController: UIViewController {
    var dismissCalled = false
    var dismissAnimated = false

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        dismissAnimated = flag
        completion?()
    }
}

extension ShopifyCheckoutKitTests {
    @MainActor
    func testPresentDuringProgrammaticDismissIsIgnored() async {
        let module = PresentationTrackingModule()
        module.attemptPresentation("https://example.test/first")
        await flushPresentationQueue()
        let oldSheet = module.sheets[0]
        let oldEvents = module.delegates[0]
        module.dismiss()
        module.attemptPresentation("https://example.test/second")
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        XCTAssertEqual(module.results, [true, false])
        XCTAssertTrue(module.events.isEmpty)

        oldSheet.finishDismissal()
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        XCTAssertEqual(module.events.count, 1)
        module.attemptPresentation("https://example.test/third")
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.last?.absoluteString, "https://example.test/third")
        XCTAssertEqual(module.results, [true, false, true])
        oldEvents.checkoutDidDismiss()
        XCTAssertEqual(module.events.count, 1)
    }

    @MainActor
    func testPresentFromNativeDismissIsIgnoredWhileClosing() async {
        await assertPresentFromTerminalIsIgnored(fail: false)
    }

    @MainActor
    func testPresentFromNativeFailureIsIgnoredWhileClosing() async {
        await assertPresentFromTerminalIsIgnored(fail: true)
    }

    @MainActor
    private func assertPresentFromTerminalIsIgnored(fail: Bool) async {
        let module = PresentationTrackingModule()
        module.attemptPresentation("https://example.test/first")
        await flushPresentationQueue()
        let oldSheet = module.sheets[0]
        module.onEvent = {
            module.onEvent = nil
            module.attemptPresentation("https://example.test/second")
        }
        if fail {
            module.delegates[0].checkoutDidFail(CheckoutFailureEvent(error: CheckoutError(code: .sdkError, message: "Failed")))
        } else {
            module.delegates[0].checkoutDidDismiss()
        }
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        XCTAssertEqual(module.results, [true, false])
        XCTAssertEqual(module.events.count, 1)
        oldSheet.finishDismissal()
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        module.attemptPresentation("https://example.test/third")
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.last?.absoluteString, "https://example.test/third")
        XCTAssertEqual(module.results, [true, false, true])
    }

    @MainActor
    func testPresentWhileActivePreservesOriginalDelegate() async {
        let module = PresentationTrackingModule()
        module.attemptPresentation("https://example.test/first", linkAction: "handled")
        await flushPresentationQueue()
        let originalDelegate = module.delegates[0]
        module.attemptPresentation("https://example.test/second", linkAction: "cancel")
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        XCTAssertEqual(module.results, [true, false])
        XCTAssertTrue(module.delegates[0] === originalDelegate)
        XCTAssertEqual(originalDelegate.linkAction, .handled)
        originalDelegate.checkoutDidDismiss()
        XCTAssertEqual(module.events.count, 1)
    }

    @MainActor
    private func flushPresentationQueue() async {
        await withCheckedContinuation { continuation in
            DispatchQueue.main.async { continuation.resume() }
        }
    }
}

private final class PresentationTrackingModule: RCTShopifyCheckoutKit {
    var urls: [URL] = []
    var delegates: [CheckoutEventBridge] = []
    var sheets: [DeferredDismissViewController] = []
    var events: [String] = []
    var results: [Bool?] = []
    var onEvent: (() -> Void)?

    func attemptPresentation(_ url: String, linkAction: String = "open") {
        present(url, linkAction: linkAction, onResult: { self.results.append($0?.first as? Bool) })
    }

    override func getCurrentViewController(_: UIViewController? = nil) -> UIViewController? {
        UIViewController()
    }

    override func presentCheckout(_ url: URL, from _: UIViewController, delegate: CheckoutEventBridge) -> UIViewController {
        let sheet = DeferredDismissViewController()
        urls.append(url)
        delegates.append(delegate)
        sheets.append(sheet)
        return sheet
    }

    override func emitDispatchEvent(_ json: String) {
        events.append(json)
        onEvent?()
    }
}

private final class DeferredDismissViewController: UIViewController {
    private let presenter = UIViewController()
    private var attached = true
    private var completion: (() -> Void)?

    override var presentingViewController: UIViewController? {
        attached ? presenter : nil
    }

    override func dismiss(animated _: Bool, completion: (() -> Void)? = nil) {
        self.completion = completion
    }

    func finishDismissal() {
        attached = false
        let callback = completion
        completion = nil
        callback?()
    }
}
