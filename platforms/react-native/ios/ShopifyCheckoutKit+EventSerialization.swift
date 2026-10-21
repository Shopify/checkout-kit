import Foundation
import ShopifyCheckoutKit

/**
 * Shared event serialization utilities for converting ShopifyCheckoutKit events
 * to React Native compatible dictionaries.
 */
internal enum ShopifyEventSerialization {
    static func serialize(clickEvent url: URL) -> [String: String] {
        return ["url": url.absoluteString]
    }

    /**
     * Converts a CheckoutError to a React Native compatible dictionary.
     *
     * Field names match Android's
     * `CustomCheckoutListener.populateErrorDetails`, so the JS-side
     * `parseCheckoutError` behaves identically on both platforms.
     * `statusCode` is present only when an HTTP response caused the failure.
     */
    static func serialize(checkoutError error: CheckoutError) -> [String: Any] {
        var payload: [String: Any] = [
            "message": error.message,
            "code": error.code.rawValue
        ]

        if let statusCode = error.httpStatusCode {
            payload["statusCode"] = statusCode
        }

        return payload
    }

    /**
     * Converts a RenderState enum to a string for React Native.
     */
    static func serialize(renderState state: RenderState) -> [String: String] {
        switch state {
        case .loading:
            return ["state": "loading"]
        case .rendered:
            return ["state": "rendered"]
        case let .error(reason):
            return ["state": "error", "reason": reason]
        @unknown default:
            return ["state": "error", "reason": "unknown"]
        }
    }
}
