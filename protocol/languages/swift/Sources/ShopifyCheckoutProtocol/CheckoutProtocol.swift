import Foundation

public enum CheckoutProtocol {
    public static let specVersion = "2026-04-08"

    public static let defaultDelegations: [String] = ["window.open"]

    package static let readyMethod = "ec.ready"

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
}
