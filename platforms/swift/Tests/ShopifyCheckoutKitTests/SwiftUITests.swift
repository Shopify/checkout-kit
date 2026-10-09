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
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configure { $0 = Configuration() }
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
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        try await super.tearDown()
    }

    func testAppearanceIsCapturedWithoutChangingGlobalConfiguration() {
        let globalAppearance = ShopifyCheckoutKit.configuration.appearance
        let appearance = CheckoutAppearance.app(.light())

        let sheet = shopifyCheckout.appearance(appearance)

        XCTAssertEqual(sheet.configuration.appearance, appearance)
        XCTAssertEqual(shopifyCheckout.configuration.appearance, globalAppearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, globalAppearance)
    }

    func testAppearanceDecoratesCheckoutURLFromCapturedConfiguration() throws {
        let sheet = shopifyCheckout.appearance(.app(.dark()))
        let items = try XCTUnwrap(URLComponents(url: sheet.decoratedCheckoutURL, resolvingAgainstBaseURL: false)?.queryItems)

        XCTAssertEqual(items.first(where: { $0.name == "ec_color_scheme" })?.value, "dark")
        XCTAssertEqual(items.first(where: { $0.name == "ck_branding" })?.value, "app")
    }

    func testAppearanceColorsAreCapturedWithoutChangingGlobalConfiguration() {
        let globalAppearance = ShopifyCheckoutKit.configuration.appearance
        let colors = Colors(webViewBackground: .red, progressIndicator: .blue, closeIconTint: .green)

        let sheet = shopifyCheckout.appearance(.app(.light(colors: colors)))

        XCTAssertEqual(sheet.configuration.appearance.effectiveColorScheme.colors(isDark: false), colors)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, globalAppearance)
    }

    func testTitleIsCapturedWithoutChangingGlobalConfiguration() {
        let globalTitle = ShopifyCheckoutKit.configuration.title
        let title = "Test Title"

        let sheet = shopifyCheckout.title(title)

        XCTAssertEqual(sheet.configuration.title, title)
        XCTAssertEqual(shopifyCheckout.configuration.title, globalTitle)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, globalTitle)
    }

    func testModifiersDoNotInvalidatePreload() {
        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        _ = shopifyCheckout
            .appearance(.app(.dark(colors: Colors(webViewBackground: .red))))
            .title("Instance checkout")

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }
}
