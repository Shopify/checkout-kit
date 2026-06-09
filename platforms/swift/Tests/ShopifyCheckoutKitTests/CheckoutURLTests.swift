@testable import ShopifyCheckoutKit
import XCTest

class CheckoutURLTests: XCTestCase {
    override func tearDown() {
        CheckoutAppTrackingTransparency.resetCurrentStatusProvider()
        super.tearDown()
    }

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

    func testAppendsAppTrackingTransparencyQueryItem() throws {
        CheckoutAppTrackingTransparency.currentStatus = { "denied" }

        let url = try XCTUnwrap(URL(string: "https://shop.com/cart/c/abc"))
        let items = queryItems(CheckoutURL(from: url).appendingAppTrackingTransparencyStatus())

        XCTAssertEqual(value(for: "_att", in: items), "denied")
    }

    func testAppendsAppTrackingTransparencyQueryItemPreservesExistingQueryItems() throws {
        CheckoutAppTrackingTransparency.currentStatus = { "restricted" }

        let url = try XCTUnwrap(URL(string: "https://shop.com/cart/c/abc?key=cart_token&utm_source=email"))
        let items = queryItems(CheckoutURL(from: url).appendingAppTrackingTransparencyStatus())

        XCTAssertEqual(value(for: "key", in: items), "cart_token")
        XCTAssertEqual(value(for: "utm_source", in: items), "email")
        XCTAssertEqual(value(for: "_att", in: items), "restricted")
    }

    func testAppendsNotApplicableWhenAppTrackingTransparencyDoesNotApply() throws {
        CheckoutAppTrackingTransparency.currentStatus = { "not_applicable" }

        let url = try XCTUnwrap(URL(string: "https://shop.com/cart/c/abc"))
        let items = queryItems(CheckoutURL(from: url).appendingAppTrackingTransparencyStatus())

        XCTAssertEqual(value(for: "_att", in: items), "not_applicable")
    }

    func testReplacesExistingAppTrackingTransparencyQueryItem() throws {
        CheckoutAppTrackingTransparency.currentStatus = { "denied" }

        let url = try XCTUnwrap(URL(string: "https://shop.com/cart/c/abc?_att=authorized"))
        let items = queryItems(CheckoutURL(from: url).appendingAppTrackingTransparencyStatus())

        XCTAssertEqual(values(for: "_att", in: items), ["denied"])
    }

    func testAppTrackingTransparencyQueryItemIsIdempotent() throws {
        CheckoutAppTrackingTransparency.currentStatus = { "not_determined" }

        let url = try XCTUnwrap(URL(string: "https://shop.com/cart/c/abc"))
        let once = CheckoutURL(from: url).appendingAppTrackingTransparencyStatus()
        let twice = CheckoutURL(from: once).appendingAppTrackingTransparencyStatus()
        let items = queryItems(twice)

        XCTAssertEqual(values(for: "_att", in: items), ["not_determined"])
    }

    private func queryItems(_ url: URL) -> [URLQueryItem] {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
    }

    private func value(for name: String, in items: [URLQueryItem]) -> String? {
        items.first { $0.name == name }?.value
    }

    private func values(for name: String, in items: [URLQueryItem]) -> [String?] {
        items.filter { $0.name == name }.map(\.value)
    }
}
