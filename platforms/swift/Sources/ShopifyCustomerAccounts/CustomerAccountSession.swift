import Foundation

/// Non-sensitive information about the current customer account session.
public struct CustomerAccountSession: Equatable, Sendable {
    /// The validated email claim returned by Shopify, when available.
    public let email: String?

    /// The approximate time at which the current access token expires.
    public let accessTokenExpiresAt: Date
}
