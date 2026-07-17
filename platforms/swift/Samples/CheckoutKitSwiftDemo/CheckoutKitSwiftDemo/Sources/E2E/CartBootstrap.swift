import Foundation

struct CartBootstrapRequest: Sendable {
    let productIndex: Int
    let quantity: Int
}

enum CartBootstrap {
    private static let scheme = "com.shopify.checkoutkit.swiftdemo"
    private static let host = "cart"

    static func request(from url: URL) throws -> CartBootstrapRequest? {
        guard url.scheme?.lowercased() == scheme else {
            return nil
        }

        guard url.host?.lowercased() == host, url.path.isEmpty || url.path == "/" else {
            throw ValidationError.unsupportedRoute
        }

        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw ValidationError.invalidURL
        }

        return try CartBootstrapRequest(
            productIndex: positiveInteger(named: "productIndex", in: components, allowingZero: true),
            quantity: positiveInteger(named: "quantity", in: components, allowingZero: false)
        )
    }

    private static func positiveInteger(
        named name: String,
        in components: URLComponents,
        allowingZero: Bool
    ) throws -> Int {
        let values = components.queryItems?.filter { $0.name == name } ?? []
        guard values.count == 1, let rawValue = values.first?.value, let value = Int(rawValue) else {
            throw ValidationError.invalidParameter(name: name)
        }

        guard allowingZero ? value >= 0 : value > 0 else {
            throw ValidationError.invalidParameter(name: name)
        }

        return value
    }

    enum ValidationError: LocalizedError, Sendable {
        case invalidURL
        case unsupportedRoute
        case invalidParameter(name: String)

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "The cart bootstrap URL is invalid."
            case .unsupportedRoute:
                return "The cart bootstrap route is unsupported."
            case let .invalidParameter(name):
                return "The cart bootstrap parameter \(name) is invalid."
            }
        }
    }
}
