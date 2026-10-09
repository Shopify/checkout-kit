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
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        CheckoutWebView.invalidate()
    }

    func testCloseButtonTintColorDefaultsToNil() {
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testCloseButtonTintColorCanBeSet() {
        let customColor = UIColor.red
        ShopifyCheckoutKit.configure { $0.closeButtonTintColor = customColor }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, customColor)
    }

    func testCloseButtonTintColorCanBeReset() {
        ShopifyCheckoutKit.configure { $0.closeButtonTintColor = .blue }
        XCTAssertNotNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)

        ShopifyCheckoutKit.configure { $0.closeButtonTintColor = nil }
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testPreloadingDefaultsToEnabled() {
        XCTAssertTrue(ShopifyCheckoutKit.configuration.preloading.enabled)
    }

    func testAppearanceDefaultsToStorefront() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront)
    }

    func testAllowedMessageOriginsDefaultsToEmpty() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.allowedMessageOrigins, [])
    }

    func testAllowedMessageOriginsCanBeSet() {
        ShopifyCheckoutKit.configure { $0.allowedMessageOrigins = ["https://example.com", "*"] }
        XCTAssertEqual(ShopifyCheckoutKit.configuration.allowedMessageOrigins, ["https://example.com", "*"])
    }

    func testPreloadingCanBeDisabled() throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        ShopifyCheckoutKit.configure { $0.preloading.enabled = false }

        XCTAssertFalse(ShopifyCheckoutKit.configuration.preloading.enabled)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testConfigureInvalidatesPreload() throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        ShopifyCheckoutKit.configure {
            $0.title = "Thank you!"
        }

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testPreloadAfterConfigureIsRetained() async throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckoutKit.configure {
            $0.title = "Thank you!"
        }
        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        for _ in 0 ..< 10 {
            await Task.yield()
        }

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func testConfigureCanBatchConfigurationChanges() {
        ShopifyCheckoutKit.configure {
            $0.appearance = .app(.dark)
            $0.closeButtonTintColor = .blue
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .app(.dark))
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, .blue)
    }

    func testConfigureUpdatesLogger() {
        ShopifyCheckoutKit.configure { $0.logLevel = .debug }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .debug)
        XCTAssertEqual(OSLogger.shared.logLevel, .debug)
    }
}
