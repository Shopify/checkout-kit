import Foundation

/// Configuration for a Shopify customer account OAuth client.
public struct CustomerAccountConfiguration: Equatable, Sendable {
    public enum BrowserSession: Equatable, Sendable {
        /// Uses the system's persistent browser session so Shopify sign-in can participate in SSO.
        case shared

        /// Uses a temporary browser session whose cookies are discarded after authentication.
        case ephemeral
    }

    /// The shop identifier configured for the Customer Account API.
    public let shopID: String

    /// The Customer Account API public client identifier.
    public let clientID: String

    /// The registered redirect URI that returns authorization to the application.
    public let redirectURI: URL

    /// Controls whether authentication participates in the system browser's shared session.
    public let browserSession: BrowserSession

    /// Creates a customer account configuration.
    public init(
        shopID: String,
        clientID: String,
        redirectURI: URL,
        browserSession: BrowserSession = .shared
    ) {
        self.shopID = shopID
        self.clientID = clientID
        self.redirectURI = redirectURI
        self.browserSession = browserSession
    }
}
