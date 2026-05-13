import Foundation

public enum EnvironmentVariables {
    enum Keys {
        static let storefrontAccessToken = "STOREFRONT_ACCESS_TOKEN"
        static let storefrontDomain = "STOREFRONT_DOMAIN"
        static let apiVersion = "API_VERSION"
    }

    private static func getKey(for key: String) -> String {
        guard let value = Bundle.main.infoDictionary?[key] as? String else {
            fatalError("Environment variable \(key) must be set in the Storefront.xcconfig file")
        }
        return value
    }

    public static let storefrontAccessToken: String = getKey(for: Keys.storefrontAccessToken)

    public static let storefrontDomain: String = getKey(for: Keys.storefrontDomain)

    public static let apiVersion: String = getKey(for: Keys.apiVersion)
}
