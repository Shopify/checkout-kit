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

    func testCloseIconTintDefaultsToNil() {
        XCTAssertNil(checkoutColors().closeIconTint)
    }

    func testCloseIconTintCanBeSetOnTheAppearance() {
        ShopifyCheckoutKit.configure { $0.appearance = .storefront(colors: Colors(closeIconTint: .red)) }

        XCTAssertEqual(checkoutColors().closeIconTint, .red)
    }

    func testReplacingAppearanceRestoresDefaultColors() {
        ShopifyCheckoutKit.configure { $0.appearance = .app(.dark(colors: Colors(
            webViewBackground: .red,
            progressIndicator: .green,
            closeIconTint: .blue
        ))) }

        ShopifyCheckoutKit.configure { $0.appearance = .app(.automatic()) }

        XCTAssertEqual(checkoutColors(isDark: false), Colors())
        XCTAssertEqual(checkoutColors(isDark: true), Colors())
    }

    func testPreloadingDefaultsToEnabled() {
        XCTAssertTrue(ShopifyCheckoutKit.configuration.preloading.enabled)
    }

    func testAppearanceDefaultsToStorefront() {
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront())
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
        let appearance = CheckoutAppearance.app(.dark(colors: Colors(closeIconTint: .blue)))

        ShopifyCheckoutKit.configure {
            $0.appearance = appearance
            $0.title = "Complete your order"
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, appearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, "Complete your order")
    }

    func testUnrelatedConfigurationUpdatesPreserveAppearanceAndColors() {
        let appearance = CheckoutAppearance.app(.dark(colors: Colors(
            webViewBackground: .red,
            progressIndicator: .green,
            closeIconTint: .blue
        )))
        ShopifyCheckoutKit.configure { $0.appearance = appearance }

        ShopifyCheckoutKit.configure {
            $0.title = "Complete your order"
            $0.logLevel = .debug
            $0.preloading.enabled = false
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, appearance)
    }

    func testAppearanceUpdatesPreserveIosSpecificConfiguration() {
        ShopifyCheckoutKit.configure {
            $0.title = "Complete your order"
            $0.confetti.enabled = true
        }

        ShopifyCheckoutKit.configure {
            $0.appearance = .storefront(colors: Colors(closeIconTint: .red))
        }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, "Complete your order")
        XCTAssertTrue(ShopifyCheckoutKit.configuration.confetti.enabled)
    }

    private func checkoutColors(isDark: Bool = false) -> Colors {
        ShopifyCheckoutKit.configuration.appearance.effectiveColorScheme.colors(isDark: isDark)
    }

    func testConfigureUpdatesLogger() {
        ShopifyCheckoutKit.configure { $0.logLevel = .debug }

        XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, .debug)
        XCTAssertEqual(OSLogger.shared.logLevel, .debug)
    }
}
