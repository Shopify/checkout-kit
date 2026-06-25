import Foundation

public enum EmbeddedCheckoutProtocol {
    public static let specVersion = "2026-04-08"

    package static let readyMethod = "ec.ready"
    package static let parseErrorCode = -32700
    package static let parseErrorMessage = "Parse error"

    /// Options controlling the query parameters appended to a checkout URL when
    /// initiating the Embedded Checkout Protocol handshake.
    public struct Options: Sendable {
        public var delegations: [Delegation]
        public var colorScheme: String?
        public var auth: String?

        public init(
            delegations: [Delegation] = [],
            colorScheme: String? = nil,
            auth: String? = nil
        ) {
            self.delegations = delegations
            self.colorScheme = colorScheme
            self.auth = auth
        }
    }

    /// Returns the given checkout URL with the query parameters required to
    /// initiate the Embedded Checkout Protocol handshake (`ec_version`,
    /// `ec_delegate`, `ec_auth`, `ec_color_scheme`).
    public static func url(for url: URL, options: Options = .init()) -> URL {
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return url
        }
        var queryItems = components.queryItems ?? []
        queryItems.removeAll {
            $0.name == "ec_version"
                || $0.name == "ec_delegate"
                || $0.name == "ec_auth"
                || $0.name == "ec_color_scheme"
        }

        queryItems.append(URLQueryItem(name: "ec_version", value: specVersion))

        if !options.delegations.isEmpty {
            queryItems.append(URLQueryItem(name: "ec_delegate", value: options.delegations.map(\.rawValue).joined(separator: ",")))
        }

        if let auth = options.auth {
            queryItems.append(URLQueryItem(name: "ec_auth", value: auth))
        }

        if let colorScheme = options.colorScheme {
            queryItems.append(URLQueryItem(name: "ec_color_scheme", value: colorScheme))
        }

        components.queryItems = queryItems
        return components.url ?? url
    }
}
