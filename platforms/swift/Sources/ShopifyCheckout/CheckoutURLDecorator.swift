#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

enum CheckoutURLDecorator {
    static func decorate(
        _ url: URL,
        configuration: Configuration = ShopifyCheckoutKit.configuration
    ) -> URL {
        let decorated = EmbeddedCheckoutProtocol.url(
            for: url,
            options: .init(
                delegations: CheckoutProtocol.defaultDelegations,
                colorScheme: configuration.appearance.colorSchemeValue
            )
        )

        guard var components = URLComponents(url: decorated, resolvingAgainstBaseURL: false) else {
            return decorated
        }

        var queryItems = components.queryItems ?? []
        queryItems.removeAll { $0.name == Self.brandingQueryItemName }
        queryItems.append(URLQueryItem(name: Self.brandingQueryItemName, value: configuration.appearance.brandingValue))
        components.queryItems = queryItems

        return components.url ?? decorated
    }

    private static let brandingQueryItemName = "ck_branding"
}

extension Configuration.Appearance {
    fileprivate var colorSchemeValue: String {
        switch self {
        case let .app(colorScheme):
            return colorScheme.rawValue
        case .storefront:
            return Configuration.ColorScheme.light.rawValue
        }
    }

    fileprivate var brandingValue: String {
        switch self {
        case .app:
            return "app"
        case .storefront:
            return "shop"
        }
    }
}
