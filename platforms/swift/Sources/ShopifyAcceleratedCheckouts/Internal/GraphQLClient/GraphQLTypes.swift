import Foundation

/// GraphQL client errors
enum GraphQLError: LocalizedError {
    case networkError(String)
    case httpError(statusCode: Int, data: Data)
    case decodingError(Error)
    case graphQLErrors([GraphQLResponseError])
    case invalidResponse
    case invalidVariables

    var errorDescription: String? {
        switch self {
        case let .networkError(message):
            return "Network error: \(message)"
        case let .httpError(statusCode, data):
            let body = String(data: data, encoding: .utf8) ?? "Unknown error"
            return "HTTP error \(statusCode): \(body)"
        case let .decodingError(error):
            return "Decoding error: \(error.localizedDescription)"
        case let .graphQLErrors(errors):
            return "GraphQL errors: \(errors.map { $0.message }.joined(separator: ", "))"
        case .invalidResponse:
            return "Invalid response from server"
        case .invalidVariables:
            return "Invalid variables provided to the GraphQL query"
        }
    }
}

private enum GraphQLJSONValue {
    case bool(Bool)
    case int(Int)
    case double(Double)
    case string(String)
    case null
    case array([GraphQLJSONValue])
    case object([String: GraphQLJSONValue])
    case unsupported(String)

    init(_ value: Any) {
        switch value {
        case let value as Bool:
            self = .bool(value)
        case let value as Int:
            self = .int(value)
        case let value as Double:
            self = .double(value)
        case let value as String:
            self = .string(value)
        case let value as [String: Any]:
            self = .object(value.mapValues(GraphQLJSONValue.init))
        case let value as [Any]:
            self = .array(value.map(GraphQLJSONValue.init))
        case let value as AnyCodable:
            self = value.storage
        case is NSNull:
            self = .null
        default:
            self = .unsupported(String(describing: type(of: value)))
        }
    }

    var value: Any {
        switch self {
        case let .bool(value):
            return value
        case let .int(value):
            return value
        case let .double(value):
            return value
        case let .string(value):
            return value
        case .null:
            return NSNull()
        case let .array(values):
            return values.map(\.value)
        case let .object(values):
            return values.mapValues { $0.value }
        case let .unsupported(typeName):
            return typeName
        }
    }

    func encode(to container: inout SingleValueEncodingContainer) throws {
        switch self {
        case let .bool(value):
            try container.encode(value)
        case let .int(value):
            try container.encode(value)
        case let .double(value):
            try container.encode(value)
        case let .string(value):
            try container.encode(value)
        case let .array(values):
            try container.encode(values.map(AnyCodable.init))
        case let .object(values):
            try container.encode(values.mapValues { AnyCodable($0) })
        case .null:
            try container.encodeNil()
        case let .unsupported(typeName):
            throw EncodingError.invalidValue(typeName, EncodingError.Context(codingPath: container.codingPath, debugDescription: "Unable to encode value of type \(typeName)"))
        }
    }
}

/// Helper type for encoding/decoding dynamically-shaped JSON values.
struct AnyCodable: Codable {
    fileprivate let storage: GraphQLJSONValue

    var value: Any {
        storage.value
    }

    init(_ value: Any) {
        storage = GraphQLJSONValue(value)
    }

    fileprivate init(_ storage: GraphQLJSONValue) {
        self.storage = storage
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let value = try? container.decode(Bool.self) {
            storage = .bool(value)
        } else if let value = try? container.decode(Int.self) {
            storage = .int(value)
        } else if let value = try? container.decode(Double.self) {
            storage = .double(value)
        } else if let value = try? container.decode(String.self) {
            storage = .string(value)
        } else if let value = try? container.decode([String: AnyCodable].self) {
            storage = .object(value.mapValues(\.storage))
        } else if let value = try? container.decode([AnyCodable].self) {
            storage = .array(value.map(\.storage))
        } else if container.decodeNil() {
            storage = .null
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unable to decode value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try storage.encode(to: &container)
    }
}
