@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
class ErrorHandler_CartPrepareForCompletionTests: XCTestCase {
    func testMap_whenPayloadResultIsNil_returnsInterruptWithOtherReason() {
        let payload = StorefrontAPI.CartPrepareForCompletionPayload(
            result: nil,
            userErrors: []
        )

        let result = ErrorHandler.map(stage: .prepare(payload), shippingCountry: nil)

        switch result {
        case let .interrupt(reason, checkoutURL):
            XCTAssertEqual(reason, .other)
            XCTAssertNil(checkoutURL)
        default:
            XCTFail("Expected interrupt with .other reason when payload.result is nil")
        }
    }

    func testMap_whenResultIsCartStatusNotReady_returnsInterruptWithCartNotReadyReason() {
        let cartStatusNotReady = StorefrontAPI.CartStatusNotReady(
            cart: nil,
            errors: []
        )
        let payload = StorefrontAPI.CartPrepareForCompletionPayload(
            result: .notReady(cartStatusNotReady),
            userErrors: []
        )

        let result = ErrorHandler.map(stage: .prepare(payload), shippingCountry: nil)

        switch result {
        case let .interrupt(reason, checkoutURL):
            XCTAssertEqual(reason, .cartNotReady)
            XCTAssertNil(checkoutURL)
        default:
            XCTFail("Expected interrupt with .cartNotReady reason for CartStatusNotReady result")
        }
    }

    func testMap_whenResultIsCartThrottled_returnsInterruptWithCartThrottledReason() {
        let cartThrottled = StorefrontAPI.CartThrottled(
            pollAfter: GraphQLScalars.DateTime(Date())
        )
        let payload = StorefrontAPI.CartPrepareForCompletionPayload(
            result: .throttled(cartThrottled),
            userErrors: []
        )

        let result = ErrorHandler.map(stage: .prepare(payload), shippingCountry: nil)

        switch result {
        case let .interrupt(reason, checkoutURL):
            XCTAssertEqual(reason, .cartThrottled)
            XCTAssertNil(checkoutURL)
        default:
            XCTFail("Expected interrupt with .cartThrottled reason for CartThrottled result")
        }
    }

    func testMap_whenResultIsCartStatusReady_returnsInterruptWithOtherReason() {
        let cartStatusReady = StorefrontAPI.CartStatusReady(
            cart: nil,
            checkoutURL: nil
        )
        let payload = StorefrontAPI.CartPrepareForCompletionPayload(
            result: .ready(cartStatusReady),
            userErrors: []
        )

        let result = ErrorHandler.map(stage: .prepare(payload), shippingCountry: nil)

        switch result {
        case let .interrupt(reason, checkoutURL):
            XCTAssertEqual(reason, .other)
            XCTAssertNil(checkoutURL)
        default:
            XCTFail("Expected interrupt with .other reason for success result (CartStatusReady)")
        }
    }

    // MARK: - All prepare violations are ignored (deferred to submit)

    func testMap_whenNotReadyWithErrors_returnsContinueFlow() {
        let errors: [StorefrontAPI.CartCompletionError] = [
            .init(code: .deliveryFirstNameRequired, message: "Enter a first name"),
            .init(code: .merchandiseOutOfStock, message: "Item out of stock"),
            .init(code: .taxesMustBeDefined, message: "Tax error")
        ]
        let payload = StorefrontAPI.CartPrepareForCompletionPayload(
            result: .notReady(StorefrontAPI.CartStatusNotReady(cart: nil, errors: errors)),
            userErrors: []
        )

        let result = ErrorHandler.map(stage: .prepare(payload), shippingCountry: nil)

        switch result {
        case .continueFlow:
            break
        default:
            XCTFail("Expected continueFlow — all prepare violations are deferred to submit, got: \(result)")
        }
    }

    func testMap_whenNotReadyWithUnknownErrorCodes_returnsContinueFlow() throws {
        let json = """
        {"code": "DELIVERY_DETAIL_CHANGED", "message": "Delivery details changed"}
        """
        let error = try JSONDecoder().decode(StorefrontAPI.CartCompletionError.self, from: Data(json.utf8))

        XCTAssertEqual(error.code, .unknownValue)
        XCTAssertEqual(error.rawCode, "DELIVERY_DETAIL_CHANGED")

        let payload = StorefrontAPI.CartPrepareForCompletionPayload(
            result: .notReady(StorefrontAPI.CartStatusNotReady(cart: nil, errors: [error])),
            userErrors: []
        )

        let result = ErrorHandler.map(stage: .prepare(payload), shippingCountry: nil)

        switch result {
        case .continueFlow:
            break
        default:
            XCTFail("Expected continueFlow — unknown codes in prepare are deferred to submit, got: \(result)")
        }
    }
}
