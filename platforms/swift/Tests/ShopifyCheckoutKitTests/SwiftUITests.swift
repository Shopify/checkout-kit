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
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    func testOnCancel() {
        var cancelActionCalled = false

        let sheet = shopifyCheckout.onCancel {
            cancelActionCalled = true
        }
        sheet.onCancelAction?()
        XCTAssertTrue(cancelActionCalled)
    }

    func testOnFail() {
        var actionCalled = false
        var actionData: CheckoutError?
        let error: CheckoutError = .checkoutUnavailable(message: "error", code: CheckoutUnavailable.httpError(statusCode: 500))

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
        checkoutURL = URL(string: "https://www.shopify.com")
        shopifyCheckout = ShopifyCheckout(checkout: checkoutURL)
    }

    func testBackgroundColor() {
        let color = UIColor.red
        shopifyCheckout.backgroundColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, color)
    }

    func testColorScheme() {
        let colorScheme = ShopifyCheckoutKit.Configuration.ColorScheme.light
        shopifyCheckout.colorScheme(colorScheme)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, colorScheme)
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
