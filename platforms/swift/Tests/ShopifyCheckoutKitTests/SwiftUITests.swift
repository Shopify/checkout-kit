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
        var actionData: CheckoutFailureEvent?
        let error = CheckoutError(code: .httpError, message: "error", httpStatusCode: 500)

        let sheet = shopifyCheckout.onFail { failure in
            actionCalled = true
            actionData = failure
        }

        sheet.onFailAction?(CheckoutFailureEvent(error: error))
        XCTAssertTrue(actionCalled)
        XCTAssertEqual(actionData?.error.code, error.code)
    }

    func testLifecycleModifiers() {
        let sheet = shopifyCheckout
            .onStart { _ in }
            .onUpdate { _ in }
            .onComplete { _ in }

        XCTAssertNotNil(sheet.onStartAction)
        XCTAssertNotNil(sheet.onUpdateAction)
        XCTAssertNotNil(sheet.onCompleteAction)
    }

    func testOnLinkClick() throws {
        let expectedLink = try CheckoutLink(url: XCTUnwrap(URL(string: "https://example.com/policy")))
        var receivedLink: CheckoutLink?

        let sheet = shopifyCheckout.onLinkClick { link in
            receivedLink = link
            return .handled
        }

        XCTAssertEqual(sheet.onLinkClickAction?(expectedLink), .handled)
        XCTAssertEqual(receivedLink, expectedLink)
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

    func testBackgroundColor() {
        let color = UIColor.red
        let defaults = ShopifyCheckoutKit.configuration
        let sheet = shopifyCheckout.backgroundColor(color)
        XCTAssertEqual(sheet.resolvedConfiguration.backgroundColor, color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, defaults.backgroundColor)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration.backgroundColor, defaults.backgroundColor)
    }

    func testAppearance() {
        let appearance = ShopifyCheckoutKit.Configuration.Appearance.app(.light)
        let defaults = ShopifyCheckoutKit.configuration
        let sheet = shopifyCheckout.appearance(appearance)
        XCTAssertEqual(sheet.resolvedConfiguration.appearance, appearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, defaults.appearance)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration.appearance, defaults.appearance)
    }

    func testAppearanceDecoratesCheckoutURLAfterModifierRuns() throws {
        let sheet = shopifyCheckout.appearance(.storefront)
        let items = try XCTUnwrap(URLComponents(url: sheet.decoratedCheckoutURL, resolvingAgainstBaseURL: false)?.queryItems)

        XCTAssertEqual(items.first(where: { $0.name == "ec_color_scheme" })?.value, "light")
        XCTAssertEqual(items.first(where: { $0.name == "ck_branding" })?.value, "shop")
    }

    func testTintColor() {
        let color = UIColor.blue
        let defaults = ShopifyCheckoutKit.configuration
        let sheet = shopifyCheckout.tintColor(color)
        XCTAssertEqual(sheet.resolvedConfiguration.tintColor, color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, defaults.tintColor)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration.tintColor, defaults.tintColor)
    }

    func testTitle() {
        let title = "Test Title"
        let defaults = ShopifyCheckoutKit.configuration
        let sheet = shopifyCheckout.title(title)
        XCTAssertEqual(sheet.resolvedConfiguration.title, title)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, defaults.title)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration.title, defaults.title)
    }

    func testCloseButtonTintColor() {
        let color = UIColor.green
        let defaults = ShopifyCheckoutKit.configuration
        let sheet = shopifyCheckout.closeButtonTintColor(color)
        XCTAssertEqual(sheet.resolvedConfiguration.closeButtonTintColor, color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, defaults.closeButtonTintColor)
        XCTAssertEqual(shopifyCheckout.resolvedConfiguration.closeButtonTintColor, defaults.closeButtonTintColor)
    }

    func testCloseButtonTintColorNil() {
        ShopifyCheckoutKit.configuration.closeButtonTintColor = .red
        let sheet = shopifyCheckout.closeButtonTintColor(nil)
        XCTAssertNil(sheet.resolvedConfiguration.closeButtonTintColor)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, .red)
    }

    func testIndependentViewsUseTheirOwnNativeStylingAndAppearance() throws {
        let first = shopifyCheckout
            .title("First checkout")
            .backgroundColor(.red)
            .tintColor(.green)
            .closeButtonTintColor(.blue)
            .appearance(.app(.dark))
        let second = shopifyCheckout.title("Second checkout").backgroundColor(.yellow).appearance(.storefront)
        let firstNavigation = first.makeCheckoutViewController()
        let secondNavigation = second.makeCheckoutViewController()
        let firstController = try XCTUnwrap(firstNavigation.viewControllers.first as? CheckoutWebViewController)
        let secondController = try XCTUnwrap(secondNavigation.viewControllers.first as? CheckoutWebViewController)
        defer {
            firstController.cleanUpCheckoutView()
            secondController.cleanUpCheckoutView()
        }

        XCTAssertEqual(firstController.title, "First checkout")
        XCTAssertEqual(firstController.view.backgroundColor, .red)
        XCTAssertEqual(firstController.checkoutView?.backgroundColor, .red)
        XCTAssertEqual(firstController.progressBar.progressBar.tintColor, .green)
        XCTAssertEqual(firstController.navigationItem.rightBarButtonItem?.tintColor, .blue)
        XCTAssertEqual(secondController.title, "Second checkout")
        XCTAssertEqual(secondController.view.backgroundColor, .yellow)
        let firstItems = try XCTUnwrap(URLComponents(url: first.decoratedCheckoutURL, resolvingAgainstBaseURL: false)?.queryItems)
        let secondItems = try XCTUnwrap(URLComponents(url: second.decoratedCheckoutURL, resolvingAgainstBaseURL: false)?.queryItems)
        XCTAssertEqual(firstItems.first { $0.name == "ec_color_scheme" }?.value, "dark")
        XCTAssertEqual(secondItems.first { $0.name == "ec_color_scheme" }?.value, "light")
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, .storefront)
    }

    func testUnspecifiedValuesUseGlobalDefaultsAtPresentation() throws {
        let sheet = shopifyCheckout.title("Local title")
        ShopifyCheckoutKit.configuration.backgroundColor = .purple
        let navigation = sheet.makeCheckoutViewController()
        let controller = try XCTUnwrap(navigation.viewControllers.first as? CheckoutWebViewController)
        defer { controller.cleanUpCheckoutView() }

        XCTAssertEqual(controller.title, "Local title")
        XCTAssertEqual(controller.view.backgroundColor, .purple)
        ShopifyCheckoutKit.configuration.backgroundColor = .orange
        controller.viewWillAppear(false)
        XCTAssertEqual(controller.view.backgroundColor, .purple)
    }

    func testGenericConfigurableDispatchPreservesValueSemantics() throws {
        func titled<T: CheckoutConfigurable>(_ value: T) -> T {
            value.title("Local title")
        }
        let originalTitle = ShopifyCheckoutKit.configuration.title
        let sheet = try titled(XCTUnwrap(shopifyCheckout))
        XCTAssertEqual(sheet.resolvedConfiguration.title, "Local title")
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, originalTitle)
    }

    func testPreloadedViewReceivesLocalPresentationColors() throws {
        let sheet = shopifyCheckout.backgroundColor(.purple).tintColor(.orange)
        let cached = CheckoutWebView()
        let key = PreloadKey(url: sheet.decoratedCheckoutURL, entryPoint: nil)
        _ = CheckoutWebView.preloadCache.store(cached, for: key)
        let navigation = sheet.makeCheckoutViewController()
        let controller = try XCTUnwrap(navigation.viewControllers.first as? CheckoutWebViewController)
        defer {
            controller.cleanUpCheckoutView()
            CheckoutWebView.preloadCache.invalidate()
        }

        XCTAssertIdentical(controller.checkoutView, cached)
        for color in [cached.backgroundColor, cached.underPageBackgroundColor] {
            let color = try XCTUnwrap(color)
            var red: CGFloat = 0
            var green: CGFloat = 0
            var blue: CGFloat = 0
            var alpha: CGFloat = 0
            XCTAssertTrue(color.getRed(&red, green: &green, blue: &blue, alpha: &alpha))
            // WebKit can round and return colors in a different color space.
            XCTAssertEqual(red, 0.5, accuracy: 1 / 255)
            XCTAssertEqual(green, 0, accuracy: 1 / 255)
            XCTAssertEqual(blue, 0.5, accuracy: 1 / 255)
            XCTAssertEqual(alpha, 1, accuracy: 1 / 255)
        }
        XCTAssertEqual(controller.progressBar.progressBar.tintColor, .orange)
    }
}
