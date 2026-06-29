// quicktype emits JSONAny/JSONNull helpers directly into Generated/Models.swift.
// protocol/scripts/generate_models.mjs verifies that helper suffix by SHA, replaces
// it with a marker comment, and relies on this file for the maintained implementation.
// Keeping these types here lets Swift tooling lint, format, and type-check them.

// MARK: - Encode/decode helpers

public final class JSONNull: Codable, Hashable, Sendable {
    public static func == (_: JSONNull, _: JSONNull) -> Bool {
        return true
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(0)
    }

    public init() {}

    public required init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if !container.decodeNil() {
            throw DecodingError.typeMismatch(
                JSONNull.self,
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Wrong type for JSONNull"
                )
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encodeNil()
    }
}

final class JSONCodingKey: CodingKey, Sendable {
    let key: String

    required init?(intValue _: Int) {
        return nil
    }

    required init?(stringValue: String) {
        key = stringValue
    }

    var intValue: Int? {
        return nil
    }

    var stringValue: String {
        return key
    }
}

private enum JSONValue: Sendable {
    case bool(Bool)
    case int(Int64)
    case double(Double)
    case string(String)
    case null
    case array([JSONValue])
    case object([String: JSONValue])

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
            return JSONNull()
        case let .array(values):
            return values.map(\.value)
        case let .object(values):
            return values.mapValues { $0.value }
        }
    }
}

public final class JSONAny: Codable, Sendable {
    private let storage: JSONValue

    public var value: Any {
        storage.value
    }

    private static func decodingError(forCodingPath codingPath: [CodingKey]) -> DecodingError {
        let context = DecodingError.Context(codingPath: codingPath, debugDescription: "Cannot decode JSONAny")
        return DecodingError.typeMismatch(JSONAny.self, context)
    }

    private static func decode(from container: SingleValueDecodingContainer) throws -> JSONValue {
        if let value = try? container.decode(Bool.self) {
            return .bool(value)
        }
        if let value = try? container.decode(Int64.self) {
            return .int(value)
        }
        if let value = try? container.decode(Double.self) {
            return .double(value)
        }
        if let value = try? container.decode(String.self) {
            return .string(value)
        }
        if container.decodeNil() {
            return .null
        }
        throw decodingError(forCodingPath: container.codingPath)
    }

    private static func decode(from container: inout UnkeyedDecodingContainer) throws -> JSONValue {
        if let value = try? container.decode(Bool.self) {
            return .bool(value)
        }
        if let value = try? container.decode(Int64.self) {
            return .int(value)
        }
        if let value = try? container.decode(Double.self) {
            return .double(value)
        }
        if let value = try? container.decode(String.self) {
            return .string(value)
        }
        if let value = try? container.decodeNil() {
            if value {
                return .null
            }
        }
        if var container = try? container.nestedUnkeyedContainer() {
            return try decodeArray(from: &container)
        }
        if var container = try? container.nestedContainer(keyedBy: JSONCodingKey.self) {
            return try decodeDictionary(from: &container)
        }
        throw decodingError(forCodingPath: container.codingPath)
    }

    private static func decode(
        from container: inout KeyedDecodingContainer<JSONCodingKey>,
        forKey key: JSONCodingKey
    ) throws -> JSONValue {
        if let value = try? container.decode(Bool.self, forKey: key) {
            return .bool(value)
        }
        if let value = try? container.decode(Int64.self, forKey: key) {
            return .int(value)
        }
        if let value = try? container.decode(Double.self, forKey: key) {
            return .double(value)
        }
        if let value = try? container.decode(String.self, forKey: key) {
            return .string(value)
        }
        if let value = try? container.decodeNil(forKey: key) {
            if value {
                return .null
            }
        }
        if var container = try? container.nestedUnkeyedContainer(forKey: key) {
            return try decodeArray(from: &container)
        }
        if var container = try? container.nestedContainer(keyedBy: JSONCodingKey.self, forKey: key) {
            return try decodeDictionary(from: &container)
        }
        throw decodingError(forCodingPath: container.codingPath)
    }

    private static func decodeArray(from container: inout UnkeyedDecodingContainer) throws -> JSONValue {
        var values: [JSONValue] = []
        while !container.isAtEnd {
            let value = try decode(from: &container)
            values.append(value)
        }
        return .array(values)
    }

    private static func decodeDictionary(from container: inout KeyedDecodingContainer<JSONCodingKey>) throws -> JSONValue {
        var values = [String: JSONValue]()
        for key in container.allKeys {
            let value = try decode(from: &container, forKey: key)
            values[key.stringValue] = value
        }
        return .object(values)
    }

    private static func encode(to container: inout UnkeyedEncodingContainer, array: [JSONValue]) throws {
        for value in array {
            try encode(to: &container, value: value)
        }
    }

    private static func encode(
        to container: inout KeyedEncodingContainer<JSONCodingKey>,
        dictionary: [String: JSONValue]
    ) throws {
        for (key, value) in dictionary {
            let key = JSONCodingKey(stringValue: key)!
            try encode(to: &container, value: value, forKey: key)
        }
    }

    private static func encode(to container: inout SingleValueEncodingContainer, value: JSONValue) throws {
        switch value {
        case let .bool(value):
            try container.encode(value)
        case let .int(value):
            try container.encode(value)
        case let .double(value):
            try container.encode(value)
        case let .string(value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        case .array, .object:
            throw EncodingError.invalidValue(
                value.value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Cannot encode nested JSON value in a single-value container"
                )
            )
        }
    }

    private static func encode(to container: inout UnkeyedEncodingContainer, value: JSONValue) throws {
        switch value {
        case let .bool(value):
            try container.encode(value)
        case let .int(value):
            try container.encode(value)
        case let .double(value):
            try container.encode(value)
        case let .string(value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        case let .array(values):
            var container = container.nestedUnkeyedContainer()
            try encode(to: &container, array: values)
        case let .object(values):
            var container = container.nestedContainer(keyedBy: JSONCodingKey.self)
            try encode(to: &container, dictionary: values)
        }
    }

    private static func encode(
        to container: inout KeyedEncodingContainer<JSONCodingKey>,
        value: JSONValue,
        forKey key: JSONCodingKey
    ) throws {
        switch value {
        case let .bool(value):
            try container.encode(value, forKey: key)
        case let .int(value):
            try container.encode(value, forKey: key)
        case let .double(value):
            try container.encode(value, forKey: key)
        case let .string(value):
            try container.encode(value, forKey: key)
        case .null:
            try container.encodeNil(forKey: key)
        case let .array(values):
            var container = container.nestedUnkeyedContainer(forKey: key)
            try encode(to: &container, array: values)
        case let .object(values):
            var container = container.nestedContainer(keyedBy: JSONCodingKey.self, forKey: key)
            try encode(to: &container, dictionary: values)
        }
    }

    public required init(from decoder: Decoder) throws {
        if var arrayContainer = try? decoder.unkeyedContainer() {
            storage = try JSONAny.decodeArray(from: &arrayContainer)
        } else if var container = try? decoder.container(keyedBy: JSONCodingKey.self) {
            storage = try JSONAny.decodeDictionary(from: &container)
        } else {
            let container = try decoder.singleValueContainer()
            storage = try JSONAny.decode(from: container)
        }
    }

    public func encode(to encoder: Encoder) throws {
        switch storage {
        case let .array(values):
            var container = encoder.unkeyedContainer()
            try JSONAny.encode(to: &container, array: values)
        case let .object(values):
            var container = encoder.container(keyedBy: JSONCodingKey.self)
            try JSONAny.encode(to: &container, dictionary: values)
        default:
            var container = encoder.singleValueContainer()
            try JSONAny.encode(to: &container, value: storage)
        }
    }
}
