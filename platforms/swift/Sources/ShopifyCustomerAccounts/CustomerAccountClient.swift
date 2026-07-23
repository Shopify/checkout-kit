internal import CustomerAccountsOAuth
import Foundation
import UIKit

/// Authenticates customers and manages their Customer Account API session.
@MainActor
public final class CustomerAccountClient {
    /// The immutable configuration used by this client.
    public let configuration: CustomerAccountConfiguration

    /// The current session, or `nil` when no customer is authenticated.
    public private(set) var session: CustomerAccountSession?

    /// Whether the client currently has an authenticated session.
    public var isAuthenticated: Bool {
        session != nil
    }

    private let oauthClient: OAuthClient

    /// Creates an instance-based customer account client.
    public init(configuration: CustomerAccountConfiguration) {
        self.configuration = configuration
        oauthClient = OAuthClient(
            configuration: OAuthConfiguration(
                shopID: configuration.shopID,
                clientID: configuration.clientID,
                redirectURI: configuration.redirectURI,
                browserSession: configuration.browserSession == .shared ? .shared : .ephemeral
            )
        )
    }

    /// Restores persisted credentials and refreshes them when necessary.
    @discardableResult
    public func restoreSession() async throws -> CustomerAccountSession? {
        do {
            session = try await oauthClient.restoreSession().map(CustomerAccountSession.init)
            return session
        } catch {
            throw CustomerAccountError(error)
        }
    }

    /// Presents Shopify sign-in from a view controller and establishes a session.
    @discardableResult
    public func signIn(from viewController: UIViewController) async throws -> CustomerAccountSession {
        do {
            let authenticatedSession = try CustomerAccountSession(await oauthClient.signIn(from: viewController))
            session = authenticatedSession
            return authenticatedSession
        } catch {
            throw CustomerAccountError(error)
        }
    }

    /// Returns a fresh Customer Account API access token, refreshing it when necessary.
    public func accessToken() async throws -> String {
        do {
            let accessToken = try await oauthClient.accessToken()
            session = oauthClient.session.map(CustomerAccountSession.init)
            return accessToken
        } catch {
            session = oauthClient.session.map(CustomerAccountSession.init)
            throw CustomerAccountError(error)
        }
    }

    /// Signs out of Shopify's shared browser session and removes local credentials.
    public func signOut(from viewController: UIViewController) async throws {
        do {
            try await oauthClient.signOut(from: viewController)
            session = nil
        } catch {
            session = nil
            throw CustomerAccountError(error)
        }
    }

    /// Removes local credentials without presenting Shopify's browser logout flow.
    public func clearSession() throws {
        do {
            try oauthClient.clearSession()
            session = nil
        } catch {
            session = nil
            throw CustomerAccountError(error)
        }
    }
}

extension CustomerAccountSession {
    fileprivate init(_ session: OAuthSession) {
        self.init(email: session.email, accessTokenExpiresAt: session.accessTokenExpiresAt)
    }
}
