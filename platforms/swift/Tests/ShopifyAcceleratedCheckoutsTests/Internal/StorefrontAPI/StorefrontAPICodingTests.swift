import Foundation
@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
final class StorefrontAPICodingTests: XCTestCase {
    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(json.utf8))
    }

    private func object(_ value: some Encodable) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(value)) as? [String: Any])
    }

    func testMoneyAcceptsStringAndNumericAmountsAndEncodesDecimalStrings() throws {
        for amount in ["\"12.50\"", "12.50"] {
            let money = try decode(StorefrontAPI.MoneyV2.self, "{\"amount\":\(amount),\"currencyCode\":\"USD\"}")
            XCTAssertEqual(money.amount, Decimal(string: "12.5"))
            XCTAssertEqual(money.currencyCode, "USD")
            let encoded = try object(money)
            XCTAssertEqual(encoded["amount"] as? String, "12.5")
            XCTAssertEqual(encoded["currencyCode"] as? String, "USD")
        }
        XCTAssertThrowsError(try decode(StorefrontAPI.MoneyV2.self, #"{"amount":"invalid","currencyCode":"USD"}"#))
    }

    func testDiscountVariantsDecodeTheirAmountsAndEncodeTheirPayloads() throws {
        let application = #"""
        {"targetSelection":"ALL","targetType":"LINE_ITEM","value":{"__typename":"PricingPercentageValue","percentage":10}}
        """#
        for name in ["CartAutomaticDiscountAllocation", "CartCodeDiscountAllocation", "CartCustomDiscountAllocation"] {
            let json = """
            {"__typename":"\(name)","code":"SAVE","discountApplication":\(application),"targetType":"LINE_ITEM",
             "discountedAmount":{"amount":"2.50","currencyCode":"USD"}}
            """
            let allocation = try decode(StorefrontAPI.CartDiscountAllocation.self, json)
            let encoded = try object(allocation)
            let money = try XCTUnwrap(encoded["discountedAmount"] as? [String: Any])
            XCTAssertEqual(money["amount"] as? String, "2.5")
            XCTAssertEqual(money["currencyCode"] as? String, "USD")
            switch (name, allocation) {
            case ("CartAutomaticDiscountAllocation", .automatic): XCTAssertNil(encoded["code"])
            case ("CartCodeDiscountAllocation", .code): XCTAssertEqual(encoded["code"] as? String, "SAVE")
            case ("CartCustomDiscountAllocation", .custom): XCTAssertNil(encoded["code"])
            default: XCTFail("Decoded the wrong discount variant for \(name)")
            }
        }
        XCTAssertThrowsError(try decode(StorefrontAPI.CartDiscountAllocation.self, #"{"__typename":"Unknown"}"#))
        let fixed = try decode(StorefrontAPI.PricingValue.self, #"{"__typename":"MoneyV2","amount":"5","currencyCode":"CAD"}"#)
        guard case let .fixedAmount(money) = fixed else { return XCTFail("Expected a fixed discount") }
        XCTAssertEqual(money.amount, 5)
        XCTAssertEqual(try object(fixed)["currencyCode"] as? String, "CAD")
    }

    func testPreparationVariantsRetainTheirPayloadWhenEncoded() throws {
        let ready = try decode(StorefrontAPI.CartPrepareForCompletionResult.self, #"{"__typename":"CartStatusReady","checkoutURL":"https://example.com/checkout"}"#)
        guard case .ready = ready else { return XCTFail("Expected ready") }
        XCTAssertEqual(try object(ready)["checkoutURL"] as? String, "https://example.com/checkout")
        let notReady = try decode(StorefrontAPI.CartPrepareForCompletionResult.self, #"{"__typename":"CartStatusNotReady","errors":[]}"#)
        guard case .notReady = notReady else { return XCTFail("Expected not ready") }
        XCTAssertEqual(try (object(notReady)["errors"] as? [Any])?.count, 0)
        let throttled = try decode(StorefrontAPI.CartPrepareForCompletionResult.self, #"{"__typename":"CartThrottled","pollAfter":"2026-01-01T00:00:00Z"}"#)
        guard case .throttled = throttled else { return XCTFail("Expected throttled") }
        XCTAssertNotNil(try object(throttled)["pollAfter"])
    }

    func testSubmissionVariantsRetainTheirPayloadWhenEncoded() throws {
        let success = try decode(StorefrontAPI.CartSubmitForCompletionResult.self, #"{"__typename":"SubmitSuccess","redirectUrl":"https://example.com/complete"}"#)
        guard case .success = success else { return XCTFail("Expected success") }
        XCTAssertEqual(try object(success)["redirectUrl"] as? String, "https://example.com/complete")
        let failed = try decode(StorefrontAPI.CartSubmitForCompletionResult.self, #"{"__typename":"SubmitFailed","errors":[]}"#)
        guard case .failed = failed else { return XCTFail("Expected failed") }
        XCTAssertEqual(try (object(failed)["errors"] as? [Any])?.count, 0)
        let accepted = try decode(StorefrontAPI.CartSubmitForCompletionResult.self, #"{"__typename":"SubmitAlreadyAccepted","attemptId":"attempt"}"#)
        guard case .alreadyAccepted = accepted else { return XCTFail("Expected already accepted") }
        XCTAssertEqual(try object(accepted)["attemptId"] as? String, "attempt")
        let throttled = try decode(StorefrontAPI.CartSubmitForCompletionResult.self, #"{"__typename":"SubmitThrottled","pollAfter":"2026-01-01T00:00:00Z"}"#)
        guard case .throttled = throttled else { return XCTFail("Expected throttled") }
        XCTAssertNotNil(try object(throttled)["pollAfter"])
    }

    func testStorefrontErrorsExplainTheFailureAndRecovery() {
        let payload = StorefrontAPI.CartApiPayload.cartPrepareForCompletion(.init(result: nil, userErrors: []))
        let cases: [(StorefrontAPI.Errors, String, String)] = [
            (.payload(propertyName: "cart"), "Request Payload failed to unwrap property: cart", "Check the previous request had a property named: cart"),
            (.notImplemented, "NOT_IMPLEMENTED", "Check the implementation of the method"),
            (.invariant(message: "Missing cart"), "Missing cart", ""),
            (.response(requestName: "prepare", message: "Invalid", payload: payload), "Request: prepare Failed. Message: Invalid", "Check the API payload for more details: prepare"),
            (.nilCart(requestName: "prepare"), "Request: prepare failed. Cart is nil", "Check the API payload for more details: prepare"),
            (.currencyChanged, "The currency has changed since the cart was created", "The currency has changed since the cart was created"),
            (.warning(type: .outOfStock, cart: nil), "Request failed with outOfStock warning.", "Address the outOfStock warning and try again")
        ]
        for (error, reason, recovery) in cases {
            XCTAssertEqual(error.failureReason, reason)
            XCTAssertEqual(error.recoverySuggestion, recovery)
        }
        let error = StorefrontAPI.Errors.userError(userErrors: [.init(code: .invalid, message: "Invalid email", field: ["email"])], cart: nil)
        XCTAssertEqual(error.failureReason, "Request failed with 1 userErrors.")
        XCTAssertTrue(error.recoverySuggestion?.contains("Invalid email") == true)
        XCTAssertTrue(error.recoverySuggestion?.contains("email") == true)
    }
}
