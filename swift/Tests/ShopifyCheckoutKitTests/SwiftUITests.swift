@testable import ShopifyCheckoutKit
import XCTest

class CheckoutViewControllerTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutViewController: CheckoutViewController!

    override func setUp() {
        super.setUp()
        checkoutURL = URL(string: "https://www.shopify.com")
        checkoutViewController = CheckoutViewController(checkout: checkoutURL)
    }

    func testInit() {
        XCTAssertNotNil(checkoutViewController)
    }
}

class CheckoutSheetTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutSheet: CheckoutSheet!

    override func setUp() {
        super.setUp()
        checkoutURL = URL(string: "https://www.shopify.com")
        checkoutSheet = CheckoutSheet(checkout: checkoutURL)
    }

    func testOnCancel() {
        var cancelActionCalled = false

        let sheet = checkoutSheet.onCancel {
            cancelActionCalled = true
        }
        sheet.onCancelAction?()
        XCTAssertTrue(cancelActionCalled)
    }

    func testOnFail() {
        var actionCalled = false
        var actionData: CheckoutError?
        let error: CheckoutError = .checkoutUnavailable(message: "error", code: CheckoutUnavailable.httpError(statusCode: 500), recoverable: false)

        let sheet = checkoutSheet.onFail { failure in
            actionCalled = true
            actionData = failure
        }

        sheet.onFailAction?(error)
        XCTAssertTrue(actionCalled)
        XCTAssertNotNil(actionData)
    }

    func testConnect() {
        let client = MockBridgeClient()
        let sheet = checkoutSheet.connect(client)
        XCTAssertNotNil(sheet.client)
    }
}

class CheckoutConfigurableTests: XCTestCase {
    var checkoutURL: URL!
    var checkoutSheet: CheckoutSheet!

    override func setUp() {
        super.setUp()
        checkoutURL = URL(string: "https://www.shopify.com")
        checkoutSheet = CheckoutSheet(checkout: checkoutURL)
    }

    func testBackgroundColor() {
        let color = UIColor.red
        checkoutSheet.backgroundColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, color)
    }

    func testColorScheme() {
        let colorScheme = ShopifyCheckoutKit.Configuration.ColorScheme.light
        checkoutSheet.colorScheme(colorScheme)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, colorScheme)
    }

    func testTintColor() {
        let color = UIColor.blue
        checkoutSheet.tintColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, color)
    }

    func testTitle() {
        let title = "Test Title"
        checkoutSheet.title(title)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.title, title)
    }

    func testCloseButtonTintColor() {
        let color = UIColor.green
        checkoutSheet.closeButtonTintColor(color)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, color)
    }

    func testCloseButtonTintColorNil() {
        checkoutSheet.closeButtonTintColor(nil)
        XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
    }
}
