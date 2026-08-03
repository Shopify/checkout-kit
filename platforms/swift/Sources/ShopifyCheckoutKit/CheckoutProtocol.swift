#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

public enum CheckoutProtocol {
    public typealias Client = EmbeddedCheckoutProtocol.Client

    public static func url(for url: URL) -> URL {
        CheckoutURLDecorator.decorate(url)
    }

    static let defaultDelegations: [EmbeddedCheckoutProtocol.Delegation] = [.windowOpen]

    static let methodNotFoundCode = -32601
    static let methodNotFoundMessage = "Method not found"

    static let ready = EmbeddedCheckoutProtocol.Event.ready.map { $0.params }

    public static let complete = EmbeddedCheckoutProtocol.Event.complete.map { $0.params.checkout }
    /// Delivers the complete payload of a valid terminal `ec.error` notification.
    ///
    /// This callback runs before Checkout Kit maps the terminal event to
    /// ``CheckoutDelegate/checkoutDidFail(error:)``. It is for advanced protocol diagnostics;
    /// use ``CheckoutError/code`` for normal lifecycle recovery.
    public static let error = EmbeddedCheckoutProtocol.Event.error.map { $0.params.error }
    public static let fulfillmentChange = EmbeddedCheckoutProtocol.Event.fulfillmentChange.map { $0.params.checkout }
    public static let lineItemsChange = EmbeddedCheckoutProtocol.Event.lineItemsChange.map { $0.params.checkout }
    /// Delivers in-checkout messages and warnings as state updates.
    public static let messagesChange = EmbeddedCheckoutProtocol.Event.messagesChange.map { $0.params.checkout }
    public static let start = EmbeddedCheckoutProtocol.Event.start.map { $0.params.checkout }
    public static let totalsChange = EmbeddedCheckoutProtocol.Event.totalsChange.map { $0.params.checkout }
    public static let windowOpen = EmbeddedCheckoutProtocol.Event.windowOpen.map { $0.params }

    static let supportedProtocolMethods: Set<String> = [
        ready.method,
        start.method,
        complete.method,
        error.method,
        fulfillmentChange.method,
        lineItemsChange.method,
        messagesChange.method,
        totalsChange.method,
        windowOpen.method
    ]

    static func supportedProtocolMethod(_ message: String) -> String? {
        guard
            let envelope = try? JSONDecoder().decode(MethodEnvelope.self, from: Data(message.utf8)),
            envelope.jsonrpc == "2.0",
            supportedProtocolMethods.contains(envelope.method)
        else {
            return nil
        }

        return envelope.method
    }

    static func methodNotFoundResponse(forUnsupportedProtocolRequest message: String) -> String? {
        guard
            let request = try? JSONDecoder().decode(RequestEnvelope.self, from: Data(message.utf8)),
            request.jsonrpc == "2.0",
            !supportedProtocolMethods.contains(request.method),
            let id = request.id
        else {
            return nil
        }

        let response = MethodNotFoundResponse(
            id: id,
            error: MethodNotFoundError(code: methodNotFoundCode, message: methodNotFoundMessage)
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(response) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

private struct MethodEnvelope: Decodable {
    let jsonrpc: String
    let method: String
}

private struct RequestEnvelope: Decodable {
    let jsonrpc: String
    let method: String
    let id: RequestID?

    private enum CodingKeys: String, CodingKey {
        case jsonrpc
        case method
        case id
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        jsonrpc = try container.decode(String.self, forKey: .jsonrpc)
        method = try container.decode(String.self, forKey: .method)
        if container.contains(.id) {
            id = try container.decode(RequestID.self, forKey: .id)
        } else {
            id = nil
        }
    }
}

enum RequestID: Codable, Equatable {
    case string(String)
    case int(Int64)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode(Int64.self) {
            self = .int(value)
        } else {
            throw DecodingError.typeMismatch(
                RequestID.self,
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "JSON-RPC id must be a string, integer, or null"
                )
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case let .string(value):
            try container.encode(value)
        case let .int(value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

private struct MethodNotFoundResponse: Encodable {
    let jsonrpc = "2.0"
    let id: RequestID
    let error: MethodNotFoundError
}

private struct MethodNotFoundError: Encodable {
    let code: Int
    let message: String
}
