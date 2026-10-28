@testable import ShopifyCheckoutKit
import XCTest

class CheckoutURLTests: XCTestCase {
    func testIsMultipassURL() throws {
        let multipassURL = try XCTUnwrap(URL(string: "https://shopify.com/multipass"))
        let nonMultipassURL = try XCTUnwrap(URL(string: "https://shopify.com/checkout"))

        XCTAssertTrue(CheckoutURL(from: multipassURL).isMultipassURL())
        XCTAssertFalse(CheckoutURL(from: nonMultipassURL).isMultipassURL())
    }

    func testIsDeepLink() throws {
        // Invalid cases
        let secureURL = try XCTUnwrap(URL(string: "https://shopify.com"))
        let nonSecureURL = try XCTUnwrap(URL(string: "http://shopify.com"))
        let blank = try XCTUnwrap(URL(string: "about:blank"))

        // Valid cases
        let deeplink = try XCTUnwrap(URL(string: "app://deep/link"))
        let deeplink2 = try XCTUnwrap(URL(string: "notes-app://"))
        let deeplink3 = try XCTUnwrap(URL(string: "maps://?q=Cupertino"))

        XCTAssertFalse(CheckoutURL(from: secureURL).isDeepLink())
        XCTAssertFalse(CheckoutURL(from: nonSecureURL).isDeepLink())
        XCTAssertFalse(CheckoutURL(from: blank).isDeepLink())

        XCTAssertTrue(CheckoutURL(from: deeplink).isDeepLink())
        XCTAssertTrue(CheckoutURL(from: deeplink2).isDeepLink())
        XCTAssertTrue(CheckoutURL(from: deeplink3).isDeepLink())
    }

    func testIsConfirmationPage() throws {
        let confirmationURLs = [
            "https://shop.com/checkouts/cn/123/thank-you",
            "https://shop.com/checkouts/cn/123/thank_you?order_id=42",
            "https://shop.com/checkouts/cn/123/THANK-YOU"
        ]
        let otherURLs = [
            "https://shop.com/checkouts/cn/123",
            "https://shop.com/checkouts/cn/123/processing",
            "https://shop.com/pages/thank-you-notes"
        ]

        for string in confirmationURLs {
            XCTAssertTrue(try CheckoutURL(from: XCTUnwrap(URL(string: string))).isConfirmationPage(), string)
        }
        for string in otherURLs {
            XCTAssertFalse(try CheckoutURL(from: XCTUnwrap(URL(string: string))).isConfirmationPage(), string)
        }
    }
}
