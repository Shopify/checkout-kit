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
        configureShopifyCheckoutKit {
            $0.appearance = .storefront()
            $0.logLevel = LogLevel.warn
            $0.preloading.enabled = true
            $0.allowedMessageOrigins = []
            $0.telemetry.enabled = true
        }
    }

    /// XCTest runs these synchronous tests on the main thread, which is what `configure` requires.
    private func configureShopifyCheckoutKit(_ block: (inout Configuration) -> Void) {
        MainActor.assumeIsolated {
            ShopifyCheckout.configure(block)
        }
    }

    private func getShopifyCheckoutKit() -> RCTShopifyCheckoutKit {
        return RCTShopifyCheckoutKit()
    }

    /// getConfig
    func testReturnsDefaultConfig() {
        // Call getConfig and capture the result
        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        // Verify that getConfig returned the expected result
        XCTAssertEqual(result?["appearance"] as? [String: String], ["type": "storefront"])
        XCTAssertEqual(result?["preloading"] as? Bool, true)
    }

    func testConfigureSetsTitle() {
        let configuration: [AnyHashable: Any] = [
            "title": "Custom Checkout"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.title, "Custom Checkout")
    }

    func testGetConfigReturnsTitle() {
        let configuration: [AnyHashable: Any] = [
            "title": "Custom Checkout"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["title"] as? String, "Custom Checkout")
    }

    func testAllowedMessageOriginsRoundTrip() {
        shopifyCheckoutKit.applyConfig(["allowedMessageOrigins": ["https://example.com", "https://*.example.com"]])

        XCTAssertEqual(
            ShopifyCheckout.configuration.allowedMessageOrigins,
            ["https://example.com", "https://*.example.com"]
        )

        let result = shopifyCheckoutKit.getConfig() as? [String: Any]
        XCTAssertEqual(
            result?["allowedMessageOrigins"] as? [String],
            ["https://example.com", "https://*.example.com"]
        )
    }

    func testConfigureWithLogLevelDebug() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "debug"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.debug)
    }

    func testConfigureWithLogLevelError() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "error"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.error)
    }

    func testConfigureWithLogLevelNone() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "none"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.none)
    }

    func testConfigureWithLogLevelWarn() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "warn"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.warn)
    }

    func testConfigureWithInvalidLogLevelKeepsTheCurrentLevel() {
        configureShopifyCheckoutKit { $0.logLevel = LogLevel.debug }

        let configuration: [AnyHashable: Any] = [
            "logLevel": "invalid"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.debug)
    }

    func testLogLevelHandlesUppercaseDebug() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "DEBUG"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.debug)
    }

    func testLogLevelHandlesMixedCaseDebug() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "Debug"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.debug)
    }

    func testLogLevelHandlesUppercaseError() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "ERROR"
        ]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.error)
    }

    func testSetConfigWithoutLogLevelKeepsTheNativeLevel() {
        configureShopifyCheckoutKit { $0.logLevel = LogLevel.debug }

        let configuration: [AnyHashable: Any] = [:]

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, LogLevel.debug)
    }

    func testSetConfigFromABackgroundQueueResolvesAfterTheConfigurationIsApplied() {
        let resolved = expectation(description: "setConfig resolved")
        var updatePosted = false
        var updatePostedAtResolve: Bool?
        var resolvedConfiguration: [String: Any]?
        var calledOnMainThread: Bool?
        let observer = NotificationCenter.default.addObserver(
            forName: Notification.Name("CheckoutKitConfigurationUpdated"),
            object: nil,
            queue: nil
        ) { _ in
            updatePosted = true
        }
        defer { NotificationCenter.default.removeObserver(observer) }

        DispatchQueue.global().async { [shopifyCheckoutKit] in
            calledOnMainThread = Thread.isMainThread
            shopifyCheckoutKit?.setConfig(
                ["title": "Background title", "logLevel": "debug"],
                resolve: { value in
                    updatePostedAtResolve = updatePosted
                    resolvedConfiguration = value as? [String: Any]
                    resolved.fulfill()
                },
                reject: { _, _, _ in XCTFail("setConfig rejected") }
            )
        }

        wait(for: [resolved], timeout: 5)
        XCTAssertEqual(calledOnMainThread, false)
        XCTAssertEqual(updatePostedAtResolve, true)
        XCTAssertEqual(resolvedConfiguration?["title"] as? String, "Background title")
        XCTAssertEqual(resolvedConfiguration?["logLevel"] as? String, "debug")
        let result = shopifyCheckoutKit.getConfig() as? [String: Any]
        XCTAssertEqual(result?["title"] as? String, "Background title")
        XCTAssertEqual(result?["logLevel"] as? String, "debug")
    }

    func testSetConfigFromABackgroundQueueAppliesAndResolvesInCallOrderWithItsOwnConfiguration() {
        let updatesApplied = expectation(description: "both configuration updates applied")
        updatesApplied.expectedFulfillmentCount = 2
        let updatesResolved = expectation(description: "both setConfig calls resolved")
        updatesResolved.expectedFulfillmentCount = 2
        var observedTitles: [String] = []
        var observedOnMainThread: [Bool] = []
        var resolvedTitles: [String] = []
        let observer = NotificationCenter.default.addObserver(
            forName: Notification.Name("CheckoutKitConfigurationUpdated"),
            object: nil,
            queue: nil
        ) { _ in
            observedOnMainThread.append(Thread.isMainThread)
            observedTitles.append(ShopifyCheckout.configuration.title)
            updatesApplied.fulfill()
        }
        defer { NotificationCenter.default.removeObserver(observer) }

        DispatchQueue.global().async { [shopifyCheckoutKit] in
            for title in ["First title", "Second title"] {
                shopifyCheckoutKit?.setConfig(
                    ["title": title],
                    resolve: { value in
                        let resolved = value as? [String: Any]
                        resolvedTitles.append("\(title):\(resolved?["title"] as? String ?? "")")
                        updatesResolved.fulfill()
                    },
                    reject: { _, _, _ in XCTFail("setConfig rejected") }
                )
            }
        }

        wait(for: [updatesApplied, updatesResolved], timeout: 5)
        XCTAssertEqual(observedTitles, ["First title", "Second title"])
        XCTAssertEqual(observedOnMainThread, [true, true])
        XCTAssertEqual(resolvedTitles, ["First title:First title", "Second title:Second title"])
    }

    func testGetConfigIncludesLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "debug"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

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

        shopifyCheckoutKit.applyConfig(configuration)

        XCTAssertFalse(ShopifyCheckout.configuration.preloading.enabled)
    }

    func testGetConfigIncludesPreloading() {
        let configuration: [AnyHashable: Any] = [
            "preloading": false
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["preloading"] as? Bool, false)
    }

    func testSerializePreloadFailureMapsUnavailableWebContent() {
        let result = shopifyCheckoutKit.serializePreloadFailure(.webContentUnavailable)

        XCTAssertEqual(result["reason"] as? String, "webContentUnavailable")
    }

    func testSerializePreloadStatePreservesIdleReasons() {
        let initial = shopifyCheckoutKit.serializePreloadState(.idle())
        let invalidated = shopifyCheckoutKit.serializePreloadState(.idle(reason: .invalidated))
        let expired = shopifyCheckoutKit.serializePreloadState(.idle(reason: .expired))
        let futureReason = PreloadState.IdleReason(rawValue: "futureReason")
        let future = shopifyCheckoutKit.serializePreloadState(.idle(reason: futureReason))

        XCTAssertEqual(initial as NSDictionary, ["type": "idle"] as NSDictionary)
        XCTAssertEqual(invalidated as NSDictionary, ["type": "idle", "reason": "invalidated"] as NSDictionary)
        XCTAssertEqual(expired as NSDictionary, ["type": "idle", "reason": "expired"] as NSDictionary)
        XCTAssertEqual(future as NSDictionary, ["type": "idle", "reason": "futureReason"] as NSDictionary)
    }

    func testSerializePreloadStatePreservesLoadingAndReadyEvents() {
        let loading = shopifyCheckoutKit.serializePreloadState(.loading)
        let ready = shopifyCheckoutKit.serializePreloadState(.ready)

        XCTAssertEqual(loading as NSDictionary, ["type": "loading"] as NSDictionary)
        XCTAssertEqual(ready as NSDictionary, ["type": "ready"] as NSDictionary)
    }

    func testSerializePreloadStatePreservesFailureDetails() {
        let result = shopifyCheckoutKit.serializePreloadState(.failed(reason: .httpError(statusCode: 503), message: "Unavailable"))

        XCTAssertEqual(result as NSDictionary, ["type": "failed", "reason": "httpError", "statusCode": 503] as NSDictionary)
    }

    func testConfigureCanDisableTelemetry() {
        shopifyCheckoutKit.applyConfig(["telemetry": false])

        XCTAssertFalse(ShopifyCheckout.configuration.telemetry.enabled)
    }

    func testGetConfigIncludesTelemetry() {
        shopifyCheckoutKit.applyConfig(["telemetry": false])

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

    func testClearPreloadDoesNotRetainCheckoutSheet() {
        let clearPreloadCompleted = expectation(description: "clearPreload completed")

        shopifyCheckoutKit.clearPreload()

        DispatchQueue.main.async {
            XCTAssertNil(self.shopifyCheckoutKit.checkoutSheet)
            clearPreloadCompleted.fulfill()
        }

        wait(for: [clearPreloadCompleted], timeout: 1)
    }

    func testGetConfigReturnsDebugForDebugLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "debug"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "debug")
    }

    func testGetConfigReturnsErrorForErrorLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "error"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "error")
    }

    func testGetConfigReturnsWarnForWarnLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "warn"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "warn")
    }

    func testGetConfigReturnsNoneForNoneLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "none"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "none")
    }

    func testGetConfigReportsEveryNativeLogLevel() {
        for logLevel in LogLevel.allCases {
            shopifyCheckoutKit.applyConfig(["logLevel": logLevel.rawValue])

            let result = shopifyCheckoutKit.getConfig() as? [String: Any]

            XCTAssertEqual(result?["logLevel"] as? String, logLevel.rawValue)
        }
    }

    func testGetConfigKeepsTheCurrentLevelForInvalidLogLevel() {
        let configuration: [AnyHashable: Any] = [
            "logLevel": "invalid"
        ]
        shopifyCheckoutKit.applyConfig(configuration)

        var result: [String: Any]?
        result = shopifyCheckoutKit.getConfig() as? [String: Any]

        XCTAssertEqual(result?["logLevel"] as? String, "warn")
    }

    func testFailedPresentDoesNotRetainCheckoutSheet() {
        let presentAttemptCompleted = expectation(description: "present attempt completed")

        shopifyCheckoutKit.present("", linkAction: "default", onResult: { _ in })

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
        let module = PresentationTrackingModule()
        module.attemptPresentation("https://example.test/first")
        await flushPresentationQueue()
        let oldSheet = module.sheets[0]
        attemptPresentationOnNextEvent(module, "https://example.test/second")
        module.delegates[0].checkoutDidDismiss()
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        XCTAssertEqual(module.results, [true, false])
        XCTAssertEqual(module.events.count, 1)
        await assertPresentSucceedsAfterDismissal(module, oldSheet)
    }

    @MainActor
    func testPresentFromNativeFailureIsIgnoredUntilDismissal() async {
        let module = PresentationTrackingModule()
        module.attemptPresentation("https://example.test/first")
        await flushPresentationQueue()
        let oldSheet = module.sheets[0]
        attemptPresentationOnNextEvent(module, "https://example.test/second")
        module.delegates[0].checkoutDidFail(CheckoutFailureEvent(error: CheckoutError(code: .sdkError, message: "Failed")))
        await flushPresentationQueue()
        XCTAssertEqual(module.results, [true, false])
        // Native closes a failed checkout and then reports dismissal.
        module.delegates[0].checkoutDidDismiss()
        await flushPresentationQueue()
        XCTAssertEqual(module.urls.count, 1)
        XCTAssertEqual(module.results, [true, false])
        XCTAssertEqual(module.events.count, 2)
        await assertPresentSucceedsAfterDismissal(module, oldSheet)
    }

    @MainActor
    private func attemptPresentationOnNextEvent(_ module: PresentationTrackingModule, _ url: String) {
        module.onEvent = {
            module.onEvent = nil
            module.attemptPresentation(url)
        }
    }

    @MainActor
    private func assertPresentSucceedsAfterDismissal(_ module: PresentationTrackingModule, _ oldSheet: DeferredDismissViewController) async {
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

    func attemptPresentation(_ url: String, linkAction: String = "default") {
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
