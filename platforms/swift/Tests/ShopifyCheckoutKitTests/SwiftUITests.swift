@testable import ShopifyCheckoutKit
import SwiftUI
import XCTest

@MainActor
class CheckoutViewControllerTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutViewController: CheckoutViewController!

    override func setUp() async throws {
        try await super.setUp()
        ShopifyCheckoutKit.configuration = Configuration()
        ShopifyCheckoutKit.configuration.appearance = .app(.dark)
        ShopifyCheckoutKit.configuration.preloading.enabled = false
        checkoutURL = URL(string: "https://www.shopify.com?key=cart_token")
        checkoutViewController = CheckoutViewController(checkout: checkoutURL)
    }

    override func tearDown() async throws {
        ShopifyCheckoutKit.configuration = Configuration()
        try await super.tearDown()
    }

    func testInit() {
        XCTAssertNotNil(checkoutViewController)
    }

    func testInitDecoratesCheckoutURL() throws {
        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: checkoutViewController))
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
        ShopifyCheckoutKit.configuration = Configuration()
        ShopifyCheckoutKit.configuration.appearance = .app(.dark)
        ShopifyCheckoutKit.configuration.preloading.enabled = false
        checkoutURL = URL(string: "https://www.shopify.com?key=cart_token")
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

    func testCheckoutViewControllerDecoratesCheckoutURL() async throws {
        let hostingController = UIHostingController(rootView: shopifyCheckout)
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
        try assertDecoratedCheckoutURL(loadedCheckoutURL(from: checkoutViewController))
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
        shopifyCheckout.backgroundColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, color)
    }

    func testAppearance() {
        let appearance = ShopifyCheckoutKit.Configuration.Appearance.app(.light)
        shopifyCheckout.appearance(appearance)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.appearance, appearance)
    }

    func testTintColor() {
        let color = UIColor.blue
        shopifyCheckout.tintColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, color)
    }

    func testTitle() {
        let title = "Test Title"
        shopifyCheckout.title(title)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, title)
    }

    func testCloseButtonTintColor() {
        let color = UIColor.green
        shopifyCheckout.closeButtonTintColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, color)
    }

    func testCloseButtonTintColorNil() {
        shopifyCheckout.closeButtonTintColor(nil)
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }
}
