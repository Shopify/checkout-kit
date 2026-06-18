import Foundation

public enum CheckoutProtocol {
    public static let specVersion = "2026-04-08"

    public static let defaultDelegations: [String] = ["window.open"]

    package static let readyMethod = "ec.ready"
    package static let parseErrorCode = -32700
    package static let parseErrorMessage = "Parse error"
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
            let envelope = try? JSONDecoder().decode(JSONRPCEnvelope.self, from: Data(message.utf8)),
            envelope.jsonrpc == "2.0",
            supportedProtocolMethods.contains(envelope.method)
        else {
            return nil
        }

        return envelope.method
    }

    package static func methodNotFoundResponse(forUnsupportedProtocolRequest message: String) -> String? {
        guard
            let request = try? JSONDecoder().decode(JSONRPCEnvelope.self, from: Data(message.utf8)),
            request.jsonrpc == "2.0",
            !supportedProtocolMethods.contains(request.method),
            let id = request.id
        else {
            return nil
        }

        let response = JSONRPCErrorResponse(
            id: id,
            error: JSONRPCError(code: methodNotFoundCode, message: methodNotFoundMessage)
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(response) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
