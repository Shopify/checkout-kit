/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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

class ShopifyCheckoutTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() {
        super.setUp()
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

class CheckoutConfigurableTests: XCTestCase {
    var checkoutURL: URL!
    var shopifyCheckout: ShopifyCheckout!

    override func setUp() {
        super.setUp()
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
