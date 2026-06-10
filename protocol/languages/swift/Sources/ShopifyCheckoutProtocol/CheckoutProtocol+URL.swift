import Foundation

extension CheckoutProtocol {
    /// Returns the given checkout URL with the query parameters required to
    /// initiate the Embedded Checkout Protocol handshake (`ec_version`,
    /// `ec_delegate`).
    public static func url(
        for url: URL,
        delegations: [String] = defaultDelegations
    ) -> URL {
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return url
        }
        var queryItems = components.queryItems ?? []
        queryItems.removeAll { $0.name == "ec_version" || $0.name == "ec_delegate" }

        queryItems.append(URLQueryItem(name: "ec_version", value: specVersion))
        if !delegations.isEmpty {
            queryItems.append(URLQueryItem(name: "ec_delegate", value: delegations.joined(separator: ",")))
        }

        components.queryItems = queryItems
        return components.url ?? url
    }
}
