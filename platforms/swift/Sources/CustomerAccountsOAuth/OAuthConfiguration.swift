import Foundation

package struct OAuthConfiguration {
    package enum BrowserSession {
        case shared
        case ephemeral
    }

    package let shopID: String
    package let clientID: String
    package let redirectURI: URL
    package let browserSession: BrowserSession

    package init(shopID: String, clientID: String, redirectURI: URL, browserSession: BrowserSession) {
        self.shopID = shopID
        self.clientID = clientID
        self.redirectURI = redirectURI
        self.browserSession = browserSession
    }

    package var issuer: URL? {
        URL(string: "https://shopify.com/authentication/\(shopID)")
    }

    package var authorizationEndpoint: URL? {
        issuer?.appendingPathComponent("oauth/authorize")
    }

    package var tokenEndpoint: URL? {
        issuer?.appendingPathComponent("oauth/token")
    }

    package var logoutEndpoint: URL? {
        issuer?.appendingPathComponent("logout")
    }

    package var callbackScheme: String? {
        redirectURI.scheme
    }

    package func validate() throws {
        guard !shopID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !clientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              issuer != nil,
              authorizationEndpoint != nil,
              tokenEndpoint != nil,
              logoutEndpoint != nil
        else {
            throw OAuthError.invalidConfiguration
        }

        guard let scheme = redirectURI.scheme,
              !scheme.isEmpty,
              redirectURI.query == nil,
              redirectURI.fragment == nil
        else {
            throw OAuthError.invalidConfiguration
        }
    }
}
