@testable import ShopifyCheckoutKit
import UIKit
import XCTest

@MainActor
class ConfigurationTests: XCTestCase {
    override func setUp() async throws {
        try await super.setUp()
        resetConfigurationState()
    }

    override func tearDown() async throws {
        resetConfigurationState()
        try await super.tearDown()
    }

    private func resetConfigurationState() {
        ShopifyCheckoutKit.configuration = Configuration()
        CheckoutWebView.invalidate()
    }

    func testCloseButtonTintColorDefaultsToNil() {
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testCloseButtonTintColorCanBeSet() {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configuration.closeButtonTintColor = customColor

        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, customColor)
    }

    func testCloseButtonTintColorCanBeReset() {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = .blue
        XCTAssertNotNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)

        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testPreloadingDefaultsToEnabled() {
        XCTAssertTrue(ShopifyCheckoutKit.configuration.preloading.enabled)
    }

    func testPreloadingThrottlePolicyDefaultsToManaged() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.preloading.throttlePolicy, .managed)
    }

    func testAppearanceDefaultsToStorefront() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront)
    }

    func testAllowedMessageOriginsDefaultsToEmpty() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.allowedMessageOrigins, [])
    }

    func testAllowedMessageOriginsCanBeSet() {
        ShopifyCheckoutKit.configuration.allowedMessageOrigins = ["https://example.com", "*"]
        XCTAssertEqual(ShopifyCheckoutKit.configuration.allowedMessageOrigins, ["https://example.com", "*"])
    }

    func testPreloadingCanBeDisabled() async throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        ShopifyCheckoutKit.configuration.preloading.enabled = false

        for _ in 0 ..< 10 where CheckoutWebView.preloadCache.hasEntry() {
            await Task.yield()
        }

        XCTAssertFalse(ShopifyCheckoutKit.configuration.preloading.enabled)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testChangingConfigurationWithoutChangingPreloadingDoesNotInvalidatePreload() async throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        ShopifyCheckoutKit.configure {
            $0.title = "Thank you!"
        }

        for _ in 0 ..< 10 {
            await Task.yield()
        }

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func testAppearanceCanBeSetDirectly() {
        ShopifyCheckoutKit.configuration.appearance = .app(.light)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.light))
    }

    func testConfigureCanBatchConfigurationChanges() {
        ShopifyCheckoutKit.configure {
            $0.appearance = .app(.dark)
            $0.closeButtonTintColor = .blue
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark))
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, .blue)
    }

    func testDirectConfigurationMutationUpdatesLogger() {
        ShopifyCheckoutKit.configuration.logLevel = .debug

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .debug)
        XCTAssertEqual(OSLogger.shared.logLevel, .debug)
    }
}
