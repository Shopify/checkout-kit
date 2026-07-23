import Foundation
import UIKit

@MainActor
package final class OAuthClient {
    private let configuration: OAuthConfiguration
    private let authorizationFlow: AuthorizationFlow
    private let tokenClient: TokenClient
    private let credentialStore: any CredentialStore
    private let browserPresenter: WebAuthenticationSessionPresenter
    private let clock: @Sendable () -> Date

    private var credentials: StoredCredentials?
    private var refreshTask: Task<StoredCredentials, any Error>?

    package var session: OAuthSession? {
        credentials?.session
    }

    package init(configuration: OAuthConfiguration) {
        let httpClient = URLSessionHTTPClient()
        self.configuration = configuration
        authorizationFlow = AuthorizationFlow(configuration: configuration)
        tokenClient = TokenClient(configuration: configuration, httpClient: httpClient)
        credentialStore = KeychainCredentialStore(configuration: configuration)
        browserPresenter = WebAuthenticationSessionPresenter()
        clock = Date.init
    }

    init(
        configuration: OAuthConfiguration,
        httpClient: any HTTPClient,
        credentialStore: any CredentialStore,
        browserPresenter: WebAuthenticationSessionPresenter = WebAuthenticationSessionPresenter(),
        clock: @escaping @Sendable () -> Date = Date.init
    ) {
        self.configuration = configuration
        authorizationFlow = AuthorizationFlow(configuration: configuration)
        tokenClient = TokenClient(configuration: configuration, httpClient: httpClient, clock: clock)
        self.credentialStore = credentialStore
        self.browserPresenter = browserPresenter
        self.clock = clock
    }

    package func restoreSession() async throws -> OAuthSession? {
        try configuration.validate()
        guard let storedCredentials = try credentialStore.load() else {
            credentials = nil
            return nil
        }

        credentials = storedCredentials
        if storedCredentials.isAccessTokenFresh(at: clock()) {
            return storedCredentials.session
        }

        guard storedCredentials.refreshToken != nil else {
            try clearSession()
            return nil
        }

        _ = try await refresh(storedCredentials)
        return session
    }

    package func signIn(from viewController: UIViewController) async throws -> OAuthSession {
        let context = try authorizationFlow.makeAuthorizationContext()
        guard let callbackScheme = configuration.callbackScheme else {
            throw OAuthError.invalidConfiguration
        }

        let callbackURL = try await browserPresenter.authenticate(
            at: context.url,
            callbackScheme: callbackScheme,
            from: viewController,
            browserSession: configuration.browserSession
        )
        let authorizationCode = try authorizationFlow.authorizationCode(
            from: callbackURL,
            expectedState: context.state
        )
        let newCredentials = try await tokenClient.exchangeAuthorizationCode(
            authorizationCode,
            codeVerifier: context.codeVerifier,
            expectedNonce: context.nonce
        )

        try credentialStore.save(newCredentials)
        credentials = newCredentials
        return newCredentials.session
    }

    package func accessToken() async throws -> String {
        let currentCredentials: StoredCredentials
        if let credentials {
            currentCredentials = credentials
        } else if let storedCredentials = try credentialStore.load() {
            credentials = storedCredentials
            currentCredentials = storedCredentials
        } else {
            throw OAuthError.notAuthenticated
        }

        if currentCredentials.isAccessTokenFresh(at: clock()) {
            return currentCredentials.accessToken
        }

        return try await refresh(currentCredentials).accessToken
    }

    package func signOut(from viewController: UIViewController) async throws {
        let currentCredentials: StoredCredentials?
        if let credentials {
            currentCredentials = credentials
        } else {
            currentCredentials = try credentialStore.load()
        }
        guard let currentCredentials else {
            try clearSession()
            return
        }

        do {
            guard let logoutEndpoint = configuration.logoutEndpoint,
                  let callbackScheme = configuration.callbackScheme,
                  var components = URLComponents(url: logoutEndpoint, resolvingAgainstBaseURL: false)
            else {
                throw OAuthError.invalidConfiguration
            }

            components.queryItems = [
                URLQueryItem(name: "id_token_hint", value: currentCredentials.idToken),
                URLQueryItem(name: "post_logout_redirect_uri", value: configuration.redirectURI.absoluteString)
            ]
            guard let logoutURL = components.url else {
                throw OAuthError.invalidConfiguration
            }

            let callbackURL = try await browserPresenter.authenticate(
                at: logoutURL,
                callbackScheme: callbackScheme,
                from: viewController,
                browserSession: configuration.browserSession
            )
            guard callbackURL.matchesRedirect(configuration.redirectURI) else {
                throw OAuthError.invalidCallback
            }
        } catch {
            try? clearSession()
            throw error
        }

        try clearSession()
    }

    package func clearSession() throws {
        refreshTask?.cancel()
        refreshTask = nil
        credentials = nil
        try credentialStore.remove()
    }

    private func refresh(_ existing: StoredCredentials) async throws -> StoredCredentials {
        if let refreshTask {
            return try await refreshTask.value
        }

        let task = Task { @MainActor [credentialStore, tokenClient] in
            let refreshed = try await tokenClient.refresh(existing)
            try Task.checkCancellation()
            try credentialStore.save(refreshed)
            self.credentials = refreshed
            return refreshed
        }
        refreshTask = task

        do {
            let refreshed = try await task.value
            refreshTask = nil
            return refreshed
        } catch {
            refreshTask = nil
            if let oauthError = error as? OAuthError, oauthError.invalidatesSession {
                try? clearSession()
            }
            throw error
        }
    }
}
