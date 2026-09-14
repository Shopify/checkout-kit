@testable import ShopifyCheckoutKit
import SwiftUI
import XCTest

@MainActor
class CheckoutViewControllerTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutViewController: CheckoutViewController!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configure {
            $0 = Configuration()
            $0.appearance = .app(.dark)
            $0.preloading.enabled = false
        }
        CheckoutWebView.invalidate()
        checkoutURL = URL(string: "https://www.shopify.com?key=cart_token")
        checkoutViewController = CheckoutViewController(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        CheckoutWebView.invalidate()
        ShopifyCheckoutKit.configure { $0 = Configuration() }
        try await super.tearDown()
    }

    func testInit() {
        XCTAssertNotNil(checkoutViewController)
    }

    func testInitDecoratesCheckoutURL() throws {
        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: checkoutViewController))
    }

    func testInitWithPreviouslyDecoratedURLDoesNotDuplicateCheckoutParams() throws {
        let viewController = CheckoutViewController(checkout: CheckoutProtocol.url(for: checkoutURL))

        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: viewController))
    }

    func testInitReusesCheckoutPreloadedFromTheSameUndecoratedURL() throws {
        ShopifyCheckoutKit.configure { $0.preloading.enabled = true }
        let preload = ShopifyCheckoutKit.preload(checkout: checkoutURL)
        let preloadedView = try XCTUnwrap(
            CheckoutWebView.preloadCache.view(
                for: PreloadKey(url: CheckoutURLDecorator.decorate(checkoutURL), entryPoint: nil)
            )
        )

        let viewController = CheckoutViewController(checkout: checkoutURL)
        let webViewController = try XCTUnwrap(
            viewController.viewControllers.compactMap { $0 as? CheckoutWebViewController }.first
        )

        XCTAssertTrue(webViewController.checkoutView === preloadedView)
        withExtendedLifetime(preload) {}
    }

    func testEntryPointInitDecoratesCheckoutURL() throws {
        let viewController = CheckoutViewController(
            checkout: checkoutURL,
            entryPoint: .acceleratedCheckouts
        )

        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: viewController))
    }
}

@MainActor
class ShopifyCheckoutTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configure {
            $0 = Configuration()
            $0.appearance = .app(.dark)
            $0.preloading.enabled = false
        }
        checkoutURL = URL(string: "https://www.shopify.com?key=cart_token")
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

    func testCheckoutViewControllerDecoratesCheckoutURLAfterAppearanceModifierRuns() async throws {
        let sheet = shopifyCheckout.appearance(.storefront)
        let hostingController = UIHostingController(rootView: sheet)
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = hostingController
        window.makeKeyAndVisible()
        hostingController.loadViewIfNeeded()

        var descendant: CheckoutViewController?
        for _ in 0 ..< 10 where descendant == nil {
            hostingController.view.layoutIfNeeded()
            descendant = descendantCheckoutViewController(from: hostingController)
            await Task.yield()
        }

        let checkoutViewController = try XCTUnwrap(descendant)
        try assertDecoratedCheckoutURL(
            loadedCheckoutURL(from: checkoutViewController),
            colorScheme: "light",
            branding: "shop"
        )
        withExtendedLifetime(window) {}
    }

    private func descendantCheckoutViewController(from viewController: UIViewController) -> CheckoutViewController? {
        if let checkoutViewController = viewController as? CheckoutViewController {
            return checkoutViewController
        }

        return viewController.children.lazy.compactMap(descendantCheckoutViewController).first
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

    func testBackgroundColorIsCapturedWithoutChangingGlobalConfiguration() {
        let globalColor = ShopifyCheckoutKit.configuration.backgroundColor
        let color = UIColor.red

        let sheet = shopifyCheckout.backgroundColor(color)

        XCTAssertEqual(sheet.configuration.backgroundColor, color)
        XCTAssertEqual(shopifyCheckout.configuration.backgroundColor, globalColor)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, globalColor)
    }

    func testAppearanceIsCapturedWithoutChangingGlobalConfiguration() {
        let globalAppearance = ShopifyCheckoutKit.configuration.appearance
        let appearance = ShopifyCheckoutKit.Configuration.Appearance.app(.light)

        let sheet = shopifyCheckout.appearance(appearance)

        XCTAssertEqual(sheet.configuration.appearance, appearance)
        XCTAssertEqual(shopifyCheckout.configuration.appearance, globalAppearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, globalAppearance)
    }

    func testTintColorIsCapturedWithoutChangingGlobalConfiguration() {
        let globalColor = ShopifyCheckoutKit.configuration.tintColor
        let color = UIColor.blue

        let sheet = shopifyCheckout.tintColor(color)

        XCTAssertEqual(sheet.configuration.tintColor, color)
        XCTAssertEqual(shopifyCheckout.configuration.tintColor, globalColor)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, globalColor)
    }

    func testTitleIsCapturedWithoutChangingGlobalConfiguration() {
        let globalTitle = ShopifyCheckoutKit.configuration.title
        let title = "Test Title"

        let sheet = shopifyCheckout.title(title)

        XCTAssertEqual(sheet.configuration.title, title)
        XCTAssertEqual(shopifyCheckout.configuration.title, globalTitle)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, globalTitle)
    }

    func testCloseButtonTintColorIsCapturedWithoutChangingGlobalConfiguration() {
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

    func testModifiersDoNotInvalidatePreload() {
        ShopifyCheckoutKit.preload(checkout: checkoutURL)
        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())

        _ = shopifyCheckout
            .backgroundColor(.red)
            .appearance(.app(.dark))
            .tintColor(.blue)
            .title("Instance checkout")
            .closeButtonTintColor(.green)

        XCTAssertTrue(CheckoutWebView.preloadCache.hasEntry())
    }
}
