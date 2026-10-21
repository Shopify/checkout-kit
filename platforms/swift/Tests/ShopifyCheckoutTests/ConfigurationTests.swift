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
    }

    func testPreloadingDefaultsToEnabled() {
        XCTAssertTrue(ShopifyCheckoutKit.configuration.preloading.enabled)
    }

    func testAppearanceDefaultsToStorefront() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront())
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

        ShopifyCheckoutKit.configure { $0.appearance = .app(.dark(colors: custom)) }
        ShopifyCheckoutKit.configure { $0.appearance = .app(.automatic()) }

        let colorScheme = ShopifyCheckoutKit.configuration.appearance.effectiveColorScheme
        XCTAssertEqual(colorScheme.colors(isDark: false), CheckoutColors())
        XCTAssertEqual(colorScheme.colors(isDark: true), CheckoutColors())
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

    func testConfigureUpdatesLogger() {
        ShopifyCheckoutKit.configure { $0.logLevel = .debug }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .debug)
        XCTAssertEqual(OSLogger.shared.logLevel, .debug)
    }
}
