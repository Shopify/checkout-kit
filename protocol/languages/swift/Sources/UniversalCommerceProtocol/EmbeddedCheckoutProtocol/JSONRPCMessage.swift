import Foundation

struct JSONRPCEnvelope: Decodable {
    let jsonrpc: String
    let method: String
    let id: JSONRPCID?

    private enum CodingKeys: String, CodingKey {
        case jsonrpc
        case method
        case id
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        jsonrpc = try container.decode(String.self, forKey: .jsonrpc)
        method = try container.decode(String.self, forKey: .method)
        id = try container.decodeJSONRPCIDIfPresent(forKey: .id)
    }
}

struct JSONRPCRequest<Params: Decodable>: Decodable {
    let jsonrpc: String
    let method: String
    let params: Params
    let id: JSONRPCID?

    private enum CodingKeys: String, CodingKey {
        case jsonrpc
        case method
        case params
        case id
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        jsonrpc = try container.decode(String.self, forKey: .jsonrpc)
        method = try container.decode(String.self, forKey: .method)
        params = try container.decode(Params.self, forKey: .params)
        id = try container.decodeJSONRPCIDIfPresent(forKey: .id)
    }
}

struct JSONRPCReadyRequest: Decodable {
    let jsonrpc: String
    let method: String
    let params: JSONRPCReadyParams
    let id: JSONRPCID?

    private enum CodingKeys: String, CodingKey {
        case jsonrpc
        case method
        case params
        case id
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        jsonrpc = try container.decode(String.self, forKey: .jsonrpc)
        method = try container.decode(String.self, forKey: .method)
        if container.contains(.params) {
            params = try container.decode(JSONRPCReadyParams.self, forKey: .params)
        } else {
            params = JSONRPCReadyParams()
        }
        id = try container.decodeJSONRPCIDIfPresent(forKey: .id)
    }
}

struct JSONRPCResponse<Result: Encodable>: Encodable {
    let jsonrpc = "2.0"
    let id: JSONRPCID
    let result: Result
}

struct JSONRPCErrorResponse: Encodable {
    let jsonrpc = "2.0"
    let id: JSONRPCID
    let error: JSONRPCError
}

struct JSONRPCError: Encodable {
    let code: Int
    let message: String
}

public enum JSONRPCID: Codable, Equatable, Sendable, ExpressibleByStringLiteral, ExpressibleByIntegerLiteral {
    case string(String)
    case int(Int64)
    case null

    public init(stringLiteral value: String) {
        self = .string(value)
    }

    public init(integerLiteral value: Int64) {
        self = .int(value)
    }

    var stringValue: String? {
        guard case let .string(value) = self else {
            return nil
        }

        return value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode(Int64.self) {
            self = .int(value)
        } else {
            throw DecodingError.typeMismatch(
                JSONRPCID.self,
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "JSON-RPC id must be a string, integer, or null"
                )
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
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

struct JSONRPCReadyParams: Codable {
    let delegate: [String]

    init(delegate: [String] = []) {
        self.delegate = delegate
    }

    private enum CodingKeys: String, CodingKey {
        case delegate
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if container.contains(.delegate) {
            delegate = try container.decode([String].self, forKey: .delegate)
        } else {
            delegate = []
        }
    }
}

public struct JSONRPCCheckoutParams: EventPayload {
    public let checkout: Checkout

    public init(checkout: Checkout) {
        self.checkout = checkout
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        checkout = try container.decode(Checkout.self, forKey: .checkout)
    }

    private enum CodingKeys: String, CodingKey {
        case checkout
    }
}

public struct JSONRPCErrorParams: EventPayload {
    public let error: ErrorResponse

    public init(error: ErrorResponse) {
        self.error = error
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        error = try container.decode(ErrorResponse.self, forKey: .error)
    }

    private enum CodingKeys: String, CodingKey {
        case error
    }
}

private extension KeyedDecodingContainer {
    func decodeJSONRPCIDIfPresent(forKey key: Key) throws -> JSONRPCID? {
        guard contains(key) else { return nil }
        return try decode(JSONRPCID.self, forKey: key)
    }
}
