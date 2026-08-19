@testable import ShopifyCheckoutKit
import XCTest

@MainActor
class CheckoutViewControllerTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutViewController: CheckoutViewController!

    override func setUp() async throws {
        try await super.setUp()
        checkoutURL = URL(string: "https://www.shopify.com")
        checkoutViewController = CheckoutViewController(checkout: checkoutURL)
    }

    func testInit() {
        XCTAssertNotNil(checkoutViewController)
    }
}

@MainActor
class ShopifyCheckoutTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration = Configuration()
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = Configuration()
        try await super.tearDown()
    }

    func testOnDismiss() {
        var dismissActionCalled = false

        let sheet = shopifyCheckout.onDismiss {
            dismissActionCalled = true
        }
        sheet.onDismissAction?()
        XCTAssertTrue(dismissActionCalled)
    }

    func testOnFail() {
        var actionCalled = false
        var actionData: CheckoutError?
        let error = CheckoutError(code: .httpError, message: "error", httpStatusCode: 500)

        let sheet = shopifyCheckout.onFail { failure in
            actionCalled = true
            actionData = failure
        }

        sheet.onFailAction?(error)
        XCTAssertTrue(actionCalled)
        XCTAssertNotNil(actionData)
    }

    func testConnect() {
        let client = MockBridgeClient()
        let sheet = shopifyCheckout.connect(client)
        XCTAssertNotNil(sheet.client)
    }
}

@MainActor
class CheckoutConfigurableTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration = Configuration()
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = Configuration()
        try await super.tearDown()
    }

    func testBackgroundColorOverridesWithoutChangingGlobalConfiguration() {
        let globalColor = ShopifyCheckoutKit.configuration.backgroundColor
        let color = UIColor.red

        let sheet = shopifyCheckout.backgroundColor(color)

        XCTAssertEqual(sheet.configuration.backgroundColor, color)
        XCTAssertEqual(shopifyCheckout.configuration.backgroundColor, globalColor)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, globalColor)
    }

    func testAppearanceOverridesWithoutChangingGlobalConfiguration() {
        let globalAppearance = ShopifyCheckoutKit.configuration.appearance
        let appearance = ShopifyCheckoutKit.Configuration.Appearance.app(.light)

        let sheet = shopifyCheckout.appearance(appearance)

        XCTAssertEqual(sheet.configuration.appearance, appearance)
        XCTAssertEqual(shopifyCheckout.configuration.appearance, globalAppearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, globalAppearance)
    }

    func testAppearanceDecoratesCheckoutURLFromResolvedConfiguration() throws {
        let sheet = shopifyCheckout.appearance(.app(.dark))
        let items = try XCTUnwrap(URLComponents(url: sheet.decoratedCheckoutURL, resolvingAgainstBaseURL: false)?.queryItems)

        XCTAssertEqual(items.first(where: { $0.name == "ec_color_scheme" })?.value, "dark")
        XCTAssertEqual(items.first(where: { $0.name == "ck_branding" })?.value, "app")
    }

    func testTintColorOverridesWithoutChangingGlobalConfiguration() {
        let globalColor = ShopifyCheckoutKit.configuration.tintColor
        let color = UIColor.blue

        let sheet = shopifyCheckout.tintColor(color)

        XCTAssertEqual(sheet.configuration.tintColor, color)
        XCTAssertEqual(shopifyCheckout.configuration.tintColor, globalColor)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, globalColor)
    }

    func testTitleOverridesWithoutChangingGlobalConfiguration() {
        let globalTitle = ShopifyCheckoutKit.configuration.title
        let title = "Test Title"

        let sheet = shopifyCheckout.title(title)

        XCTAssertEqual(sheet.configuration.title, title)
        XCTAssertEqual(shopifyCheckout.configuration.title, globalTitle)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, globalTitle)
    }

    func testCloseButtonTintColorOverridesWithoutChangingGlobalConfiguration() {
        let globalColor = ShopifyCheckoutKit.configuration.closeButtonTintColor
        let color = UIColor.green

        let sheet = shopifyCheckout.closeButtonTintColor(color)

        XCTAssertEqual(sheet.configuration.closeButtonTintColor, color)
        XCTAssertEqual(shopifyCheckout.configuration.closeButtonTintColor, globalColor)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, globalColor)
    }

    func testCloseButtonTintColorCanBeClearedOnInstance() {
        let sheet = shopifyCheckout
            .closeButtonTintColor(.green)
            .closeButtonTintColor(nil)

        XCTAssertNil(sheet.configuration.closeButtonTintColor)
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }

    func testModifiersDoNotInvalidatePreload() async {
        await Task.yield()
        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        _ = shopifyCheckout
            .backgroundColor(.red)
            .appearance(.app(.dark))
            .tintColor(.blue)
            .title("Instance checkout")
            .closeButtonTintColor(.green)
        await Task.yield()

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }

    func testUnmodifiedValuesResolveFromLatestGlobalConfiguration() {
        let sheet = shopifyCheckout.appearance(.app(.dark))

        ShopifyCheckoutKit.configuration.title = "Updated global title"

        XCTAssertEqual(sheet.configuration.title, "Updated global title")
        XCTAssertEqual(sheet.configuration.appearance, .app(.dark))
    }

    func testModifierTakesPrecedenceOverLatestGlobalConfiguration() {
        let sheet = shopifyCheckout.title("Instance title")

        ShopifyCheckoutKit.configuration.title = "Updated global title"

        XCTAssertEqual(sheet.configuration.title, "Instance title")
    }

    func testUpdatedGlobalTitleReconfiguresPresentedCheckout() throws {
        let viewController = CheckoutViewController(checkout: shopifyCheckout.decoratedCheckoutURL)
        shopifyCheckout.configureWebViewController(viewController)
        let webViewController = try XCTUnwrap(
            viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
        )
        let checkoutView = try XCTUnwrap(webViewController.checkoutView)

        ShopifyCheckoutKit.configure { $0.title = "Updated global title" }
        shopifyCheckout.configureWebViewController(viewController)

        XCTAssertEqual(webViewController.title, "Updated global title")
        XCTAssertIdentical(webViewController.checkoutView, checkoutView)
    }

    func testUpdatedTitleModifierReconfiguresPresentedCheckout() throws {
        let initial = shopifyCheckout.title("Initial title")
        let viewController = CheckoutViewController(checkout: initial.decoratedCheckoutURL)
        initial.configureWebViewController(viewController)
        let webViewController = try XCTUnwrap(
            viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
        )
        let checkoutView = try XCTUnwrap(webViewController.checkoutView)
        XCTAssertEqual(webViewController.title, "Initial title")

        let updated = shopifyCheckout.title("Updated title")
        updated.configureWebViewController(viewController)

        XCTAssertEqual(webViewController.title, "Updated title")
        XCTAssertIdentical(webViewController.checkoutView, checkoutView)
    }
}
