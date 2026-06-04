import Foundation
import ShopifyCheckoutKit

/**
 * Shared event serialization utilities for converting ShopifyCheckoutKit events
 * to React Native compatible dictionaries.
 */
internal enum ShopifyEventSerialization {
    /**
     * Encodes a Codable object to a JSON dictionary for React Native bridge.
     */
    static func encodeToJSON(from value: Codable) -> [String: Any] {
        let encoder = JSONEncoder()

        do {
            let jsonData = try encoder.encode(value)
            if let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] {
                return jsonObject
            }
        } catch {
            print("[checkout_kit:checkout_kit] Error encoding to JSON object: \(error)")
        }
        return [:]
    }

    /**
     * Converts a JSON string to a dictionary.
     */
    static func stringToJSON(from value: String?) -> [String: Any]? {
        guard let data = value?.data(using: .utf8, allowLossyConversion: false) else { return [:] }
        do {
            return try JSONSerialization.jsonObject(with: data, options: .mutableContainers) as? [String: Any]
        } catch {
            print("[checkout_kit:checkout_kit] Failed to convert string to JSON: \(error)", value ?? "nil")
            return [:]
        }
    }

    static func serialize(clickEvent url: URL) -> [String: URL] {
        return ["url": url]
    }

    /**
     * Converts a CheckoutError to a React Native compatible dictionary.
     * Handles all specific error types with proper type information.
     */
    static func serialize(checkoutError error: CheckoutError) -> [String: Any] {
        switch error {
        case let .checkoutExpired(message, code):
            return [
                "__typename": "CheckoutExpiredError",
                "message": message,
                "code": code.rawValue
            ]

        case let .checkoutUnavailable(message, code):
            switch code {
            case let .clientError(clientErrorCode):
                return [
                    "__typename": "CheckoutClientError",
                    "message": message,
                    "code": clientErrorCode.rawValue
                ]
            case let .httpError(statusCode):
                return [
                    "__typename": "CheckoutHTTPError",
                    "message": message,
                    "code": "http_error",
                    "statusCode": statusCode
                ]
            }

        case let .sdkError(underlying):
            return [
                "__typename": "InternalError",
                "code": "unknown",
                "message": underlying.localizedDescription
            ]

        @unknown default:
            return [
                "__typename": "UnknownError",
                "code": "unknown",
                "message": error.localizedDescription
            ]
        }
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
