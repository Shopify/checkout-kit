import Foundation
@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import XCTest

@available(iOS 16.0, *)
class EventSerializationTests: XCTestCase {

    // MARK: - RenderState

    func testRenderStateSerialization_includesErrorReason() throws {
        let serialized = ShopifyEventSerialization.serialize(renderState: .error(reason: "invariant_violation"))
        XCTAssertEqual(serialized["state"], "error")
        XCTAssertEqual(serialized["reason"], "invariant_violation")
    }

    func testRenderStateSerialization_includesEmptyErrorReason() throws {
        let serialized = ShopifyEventSerialization.serialize(renderState: .error(reason: ""))
        XCTAssertEqual(serialized["state"], "error")
        XCTAssertEqual(serialized["reason"], "")
    }

    func testRenderStateSerialization_loadingAndRendered() throws {
        let loading = ShopifyEventSerialization.serialize(renderState: .loading)
        XCTAssertEqual(loading["state"], "loading")
        XCTAssertNil(loading["reason"])

        let rendered = ShopifyEventSerialization.serialize(renderState: .rendered)
        XCTAssertEqual(rendered["state"], "rendered")
        XCTAssertNil(rendered["reason"])
    }

    // MARK: - Click event

    func testClickEventSerialization() throws {
        let url = URL(string: "https://shopify.dev/test")!
        let serialized = ShopifyEventSerialization.serialize(clickEvent: url)
        XCTAssertEqual(serialized["url"], url)
    }

    // MARK: - Checkout error

    func testCheckoutErrorSerialization_carriesFlattenedFields() throws {
        let serialized = ShopifyEventSerialization.serialize(
            checkoutError: CheckoutError(code: .cartExpired, message: "expired")
        )

        XCTAssertEqual(serialized["code"] as? String, "cart_expired")
        XCTAssertEqual(serialized["message"] as? String, "expired")
        XCTAssertNil(serialized["statusCode"])
        XCTAssertNil(serialized["__typename"])
    }

    func testCheckoutErrorSerialization_addsStatusCodeForHTTPFailures() throws {
        let serialized = ShopifyEventSerialization.serialize(
            checkoutError: CheckoutError(code: .httpError, message: "Not Found", httpStatusCode: 404)
        )

        XCTAssertEqual(serialized["code"] as? String, "http_error")
        XCTAssertEqual(serialized["message"] as? String, "Not Found")
        XCTAssertEqual(serialized["statusCode"] as? Int, 404)
    }

    /// Locks the wire format shared with Android's
    /// `CustomCheckoutListener.populateErrorDetails`, which sends the
    /// lower-snake-case enum constant name. Every code listed here must
    /// match a `CheckoutErrorCode` member on the JS side.
    func testCheckoutErrorSerialization_everyCodeUsesTheSharedWireName() throws {
        let expectedWireNames: [CheckoutErrorCode: String] = [
            .storefrontPasswordRequired: "storefront_password_required",
            .customerAccountRequired: "customer_account_required",
            .cartExpired: "cart_expired",
            .cartCompleted: "cart_completed",
            .invalidCart: "invalid_cart",
            .httpError: "http_error",
            .networkError: "network_error",
            .sdkError: "sdk_error",
            .unknown: "unknown"
        ]

        for (code, wireName) in expectedWireNames {
            let serialized = ShopifyEventSerialization.serialize(
                checkoutError: CheckoutError(code: code, message: "failed")
            )
            XCTAssertEqual(serialized["code"] as? String, wireName)
        }
    }
}
