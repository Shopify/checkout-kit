import Foundation

public enum CheckoutProtocol {
    public static let specVersion = "2026-04-08"

    public static let defaultDelegations: [String] = ["window.open"]

    package static let readyMethod = "ec.ready"
    package static let methodNotFoundCode = -32601
    package static let methodNotFoundMessage = "Method not found"

    public static let complete = NotificationDescriptor<Checkout>(method: "ec.complete")
    public static let error = NotificationDescriptor<ErrorResponse>(method: "ec.error")
    public static let lineItemsChange = NotificationDescriptor<Checkout>(
        method: "ec.line_items.change"
    )
    public static let messagesChange = NotificationDescriptor<Checkout>(
        method: "ec.messages.change"
    )
    public static let start = NotificationDescriptor<Checkout>(method: "ec.start")
    public static let totalsChange = NotificationDescriptor<Checkout>(method: "ec.totals.change")

    package static let supportedProtocolMethods: Set<String> = [
        readyMethod,
        start.method,
        complete.method,
        error.method,
        lineItemsChange.method,
        messagesChange.method,
        totalsChange.method,
        windowOpen.method
    ]

    package static func supportedProtocolMethod(_ message: String) -> String? {
        guard
            let object = try? JSONSerialization.jsonObject(with: Data(message.utf8)) as? [String: Any],
            object["jsonrpc"] as? String == "2.0",
            let method = object["method"] as? String,
            supportedProtocolMethods.contains(method)
        else {
            return nil
        }

        return method
    }

    package static func methodNotFoundResponse(forUnsupportedProtocolRequest message: String) -> String? {
        guard
            let object = try? JSONSerialization.jsonObject(with: Data(message.utf8)) as? [String: Any],
            object["jsonrpc"] as? String == "2.0",
            let method = object["method"] as? String,
            !supportedProtocolMethods.contains(method),
            let id = jsonRpcRequestID(object["id"])
        else {
            return nil
        }

        let response: [String: Any] = [
            "jsonrpc": "2.0",
            "id": id,
            "error": [
                "code": methodNotFoundCode,
                "message": methodNotFoundMessage
            ]
        ]

        guard
            JSONSerialization.isValidJSONObject(response),
            let data = try? JSONSerialization.data(withJSONObject: response),
            let body = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return body
    }

    private static func jsonRpcRequestID(_ id: Any?) -> Any? {
        switch id {
        case let value as String:
            return value
        case let value as NSNumber:
            guard CFGetTypeID(value) != CFBooleanGetTypeID() else {
                return nil
            }
            return value
        default:
            return nil
        }
    }
}
