import Foundation
import ShopifyAcceleratedCheckouts
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
            print("Error encoding to JSON object: \(error)")
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
            print("Failed to convert string to JSON: \(error)", value ?? "nil")
            return [:]
        }
    }

    static func serialize(clickEvent url: URL) -> [String: URL] {
        return ["url": url]
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
