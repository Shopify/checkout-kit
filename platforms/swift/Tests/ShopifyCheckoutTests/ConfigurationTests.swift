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
        ShopifyCheckout.configure { $0 = Configuration() }
    }

    func testPreloadingDefaultsToEnabled() {
        XCTAssertTrue(ShopifyCheckout.configuration.preloading.enabled)
    }

    func testAppearanceDefaultsToStorefront() {
        XCTAssertEqual(ShopifyCheckout.configuration.appearance, .storefront())
    }

    func testReplacingAppearanceRestoresDefaultColors() {
        let custom = CheckoutColors(
            webViewBackgroundColor: .systemRed,
            headerBackgroundColor: .systemBlue,
            headerTitleColor: .systemGreen,
            progressIndicatorColor: .systemOrange,
            closeIconTintColor: .systemPurple,
            headerBorderColor: .systemYellow
        )
        XCTAssertNotEqual(custom, CheckoutColors())

        ShopifyCheckout.configure { $0.appearance = .app(.dark(colors: custom)) }
        ShopifyCheckout.configure { $0.appearance = .app(.automatic()) }

        let colorScheme = ShopifyCheckout.configuration.appearance.effectiveColorScheme
        XCTAssertEqual(colorScheme.colors(isDark: false), CheckoutColors())
        XCTAssertEqual(colorScheme.colors(isDark: true), CheckoutColors())
    }

    func testAllowedMessageOriginsDefaultsToEmpty() {
        XCTAssertEqual(ShopifyCheckout.configuration.allowedMessageOrigins, [])
    }

    func testAllowedMessageOriginsCanBeSet() {
        ShopifyCheckout.configure { $0.allowedMessageOrigins = ["https://example.com", "*"] }
        XCTAssertEqual(ShopifyCheckout.configuration.allowedMessageOrigins, ["https://example.com", "*"])
    }

    func testPreloadingCanBeDisabled() throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckout.preload(checkout: checkoutURL)
        ShopifyCheckout.configure { $0.preloading.enabled = false }

        XCTAssertFalse(ShopifyCheckout.configuration.preloading.enabled)
        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testConfigureInvalidatesPreload() throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckout.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        ShopifyCheckout.configure {
            $0.title = "Thank you!"
        }

        XCTAssertFalse(CheckoutWebView.preloadCache.hasEntry())
    }

    func testPreloadAfterConfigureIsRetained() async throws {
        let checkoutURL = try XCTUnwrap(URL(string: "https://shopify1.shopify.com/checkouts/cn/123"))

        ShopifyCheckout.configure {
            $0.title = "Thank you!"
        }
        ShopifyCheckout.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        for _ in 0 ..< 10 {
            await Task.yield()
        }

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func testConfigureUpdatesLogger() {
        ShopifyCheckout.configure { $0.logLevel = .debug }

        XCTAssertEqual(ShopifyCheckout.configuration.logLevel, .debug)
        XCTAssertEqual(OSLogger.shared.logLevel, .debug)
    }
}
