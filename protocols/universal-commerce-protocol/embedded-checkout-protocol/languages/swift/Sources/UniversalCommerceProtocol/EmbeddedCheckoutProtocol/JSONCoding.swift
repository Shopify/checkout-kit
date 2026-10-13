import Foundation

// The generator replaces quicktype's encoder/decoder helpers with these maintained
// implementations so model initializers and event descriptors use the same formats.
func newJSONDecoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
        let container = try decoder.singleValueContainer()
        let value = try container.decode(String.self)
        let formatter = ISO8601DateFormatter()

        // JSONDecoder's .iso8601 strategy rejects fractional seconds on older iOS versions.
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) {
            return date
        }

        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: value) {
            return date
        }

        throw DecodingError.dataCorruptedError(
            in: container,
            debugDescription: "Expected an ISO 8601 date-time string"
        )
    }
    return decoder
}

func newJSONEncoder() -> JSONEncoder {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    return encoder
}
