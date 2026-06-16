import Foundation

// MARK: - GraphQL Operation

/// GraphQLOperation binds a query (data to be requested)
/// with a response Decoder(Codable to decode the data requested).
struct GraphQLRequest<T: Decodable & Sendable>: Encodable {
    private(set) var query: String
    let responseType: T.Type
    let encodedVariables: [String: AnyCodable]

    var variables: [String: Any] {
        encodedVariables.mapValues { $0.value }
    }

    enum CodingKeys: String, CodingKey {
        case query
        case variables
    }

    init(query: String, responseType: T.Type, variables: [String: Any] = [:]) {
        self.init(
            query: query,
            responseType: responseType,
            encodedVariables: variables.mapValues(AnyCodable.init)
        )
    }

    init(query: String, responseType: T.Type, encodedVariables: [String: AnyCodable]) {
        self.query = query
        self.responseType = responseType
        self.encodedVariables = encodedVariables
    }

    init(
        operation: GraphQLDocument.Queries,
        responseType: T.Type,
        variables: [String: Any] = [:]
    ) {
        self.init(
            query: GraphQLDocument.build(operation: operation),
            responseType: responseType,
            variables: variables
        )
    }

    init(
        operation: GraphQLDocument.Mutations,
        responseType: T.Type,
        variables: [String: Any] = [:]
    ) {
        self.init(
            query: GraphQLDocument.build(operation: operation),
            responseType: responseType,
            variables: variables
        )
    }

    /// Encodes for use as urlRequest.httpBody
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        try container.encode(query, forKey: .query)

        if !encodedVariables.isEmpty {
            try container.encode(encodedVariables, forKey: .variables)
        }
    }

    /// Minify the GraphQL query by removing unnecessary whitespace and newlines
    func minify() -> GraphQLRequest<T> {
        let lines = query.components(separatedBy: .newlines)
        let nonCommentLines = lines.filter { line in
            !line.trimmingCharacters(in: .whitespaces).hasPrefix("#")
        }

        let joined = nonCommentLines.joined(separator: " ")

        // Replace multiple whitespace characters with a single space
        let whitespacePattern = "\\s+"
        guard let regex = try? NSRegularExpression(pattern: whitespacePattern, options: []) else {
            return self
        }

        let range = NSRange(location: 0, length: joined.utf16.count)
        let minified = regex.stringByReplacingMatches(
            in: joined, options: [], range: range, withTemplate: " "
        )

        let minifiedQuery = minified.trimmingCharacters(in: .whitespaces)
        return GraphQLRequest(
            query: minifiedQuery,
            responseType: responseType,
            encodedVariables: encodedVariables
        )
    }
}
