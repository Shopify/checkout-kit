import AuthenticationServices
import CommonCrypto
import Foundation
import ShopifyCheckoutKit

enum CustomerAccountError: LocalizedError {
    case missingConfiguration
    case invalidAuthorizationCode
    case tokenExchangeFailed(String)
    case tokenRefreshFailed(String)
    case notAuthenticated
    case invalidState
    case invalidCallback
    case authorizationInProgress
    case authorizationCancelled
    case authorizationFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "Missing Customer Account API configuration"
        case .invalidAuthorizationCode:
            return "Invalid authorization code received"
        case let .tokenExchangeFailed(message):
            return "Token exchange failed: \(message)"
        case let .tokenRefreshFailed(message):
            return "Token refresh failed: \(message)"
        case .notAuthenticated:
            return "User is not authenticated"
        case .invalidState:
            return "Invalid state parameter - possible CSRF attack"
        case .invalidCallback:
            return "Invalid authorization callback"
        case .authorizationInProgress:
            return "Another authorization request is already in progress"
        case .authorizationCancelled:
            return "Authorization was cancelled"
        case let .authorizationFailed(message):
            return "Authorization failed: \(message)"
        }
    }
}

@MainActor
final class CustomerAccountManager: ObservableObject {
    static let shared = CustomerAccountManager()

    private let logger = OSLogger(prefix: "CustomerAccount", logLevel: ShopifyCheckoutKit.configuration.logLevel)
    private let shopId: String?
    private let clientId: String?

    private var redirectUri: String? {
        InfoDictionary.shared.customerAccountApiRedirectUri
    }

    private var callbackScheme: String? {
        guard let shopId else { return nil }
        return "shop.\(shopId).app"
    }

    var authorizationEndpoint: String? {
        guard let shopId else { return nil }
        return "https://shopify.com/authentication/\(shopId)/oauth/authorize"
    }

    var tokenEndpoint: String? {
        guard let shopId else { return nil }
        return "https://shopify.com/authentication/\(shopId)/oauth/token"
    }

    var logoutEndpoint: String? {
        guard let shopId else { return nil }
        return "https://shopify.com/authentication/\(shopId)/logout"
    }

    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var customerEmail: String?
    @Published var tokenExpiresAt: Date?

    private var codeVerifier: String?
    private var savedState: String?
    private var authenticationSession: ASWebAuthenticationSession?
    private var presentationContextProvider: CustomerAccountPresentationContextProvider?

    private init() {
        shopId = InfoDictionary.shared.customerAccountApiShopId
        clientId = InfoDictionary.shared.customerAccountApiClientId
        checkExistingSession()
    }

    func generateCodeVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return base64URLEncode(Data(bytes))
    }

    func generateCodeChallenge(for verifier: String) -> String {
        guard let data = verifier.data(using: .utf8) else {
            return ""
        }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }

        return base64URLEncode(Data(hash))
    }

    private func base64URLEncode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func generateState() -> String {
        var bytes = [UInt8](repeating: 0, count: 27)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return base64URLEncode(Data(bytes))
    }

    private func buildAuthorizationURL() -> URL? {
        guard let authorizationEndpoint, let clientId, let redirectUri else {
            return nil
        }

        codeVerifier = generateCodeVerifier()
        savedState = generateState()

        guard let verifier = codeVerifier, let state = savedState else {
            return nil
        }

        let codeChallenge = generateCodeChallenge(for: verifier)

        var components = URLComponents(string: authorizationEndpoint)
        components?.queryItems = [
            URLQueryItem(name: "scope", value: "openid email customer-account-api:full"),
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: redirectUri),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256")
        ]

        return components?.url
    }

    func validateState(_ state: String) -> Bool {
        guard let savedState else {
            return false
        }
        return state == savedState
    }

    func signIn(from presentationAnchor: ASPresentationAnchor) async throws {
        guard authenticationSession == nil else {
            throw CustomerAccountError.authorizationInProgress
        }

        guard let authorizationURL = buildAuthorizationURL(), let callbackScheme else {
            throw CustomerAccountError.missingConfiguration
        }

        isLoading = true
        defer {
            isLoading = false
            codeVerifier = nil
            savedState = nil
        }

        let callbackURL = try await presentAuthenticationSession(
            url: authorizationURL,
            callbackScheme: callbackScheme,
            from: presentationAnchor
        )
        let code = try authorizationCode(from: callbackURL)
        try await exchangeCodeForTokens(code: code)
    }

    private func authorizationCode(from callbackURL: URL) throws -> String {
        guard let callbackScheme,
              let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
              components.scheme == callbackScheme,
              components.host == "callback"
        else {
            throw CustomerAccountError.invalidCallback
        }

        let queryItems = components.queryItems ?? []
        let parameters = Dictionary(uniqueKeysWithValues: queryItems.compactMap { item -> (String, String)? in
            guard let value = item.value else { return nil }
            return (item.name, value)
        })

        guard let state = parameters["state"], validateState(state) else {
            throw CustomerAccountError.invalidState
        }

        if let error = parameters["error"] {
            throw CustomerAccountError.authorizationFailed(error)
        }

        guard let code = parameters["code"] else {
            throw CustomerAccountError.invalidAuthorizationCode
        }
        return code
    }

    private func exchangeCodeForTokens(code: String) async throws {
        logger.debug("Exchanging authorization code for tokens...")

        guard let verifier = codeVerifier else {
            logger.error("No code verifier available")
            throw CustomerAccountError.invalidAuthorizationCode
        }

        guard let clientId, let redirectUri else {
            logger.error("Missing client ID or redirect URI")
            throw CustomerAccountError.missingConfiguration
        }

        let body: [String: String] = [
            "grant_type": "authorization_code",
            "client_id": clientId,
            "redirect_uri": redirectUri,
            "code": code,
            "code_verifier": verifier
        ]

        let tokens = try await performTokenRequest(body: body)
        logger.debug("Token exchange successful, expires at: \(tokens.expiresAt)")
        KeychainHelper.shared.saveTokens(tokens)
        isAuthenticated = true
        tokenExpiresAt = tokens.expiresAt
        extractEmailFromIdToken(tokens.idToken)

        CartManager.shared.resetCart()
        ShopifyCheckoutKit.invalidate()

        codeVerifier = nil
        savedState = nil
        logger.debug("Login complete")
    }

    func refreshAccessToken() async throws {
        logger.debug("Starting token refresh...")

        guard let tokens = KeychainHelper.shared.getTokens(),
              let refreshToken = tokens.refreshToken
        else {
            logger.error("No tokens or refresh token available")
            throw CustomerAccountError.notAuthenticated
        }

        guard let clientId else {
            logger.error("Missing client ID configuration")
            throw CustomerAccountError.missingConfiguration
        }

        let existingEmail = KeychainHelper.shared.getEmail()
        let existingIdToken = tokens.idToken
        logger.debug("Preserved existing ID token: \(existingIdToken != nil)")

        isLoading = true
        defer { isLoading = false }

        let body: [String: String] = [
            "grant_type": "refresh_token",
            "client_id": clientId,
            "refresh_token": refreshToken
        ]

        let newTokens = try await performTokenRequest(body: body)
        logger.debug("Token refresh successful, new expiry: \(newTokens.expiresAt)")

        let tokensToSave = OAuthTokenResult(
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken ?? refreshToken,
            expiresIn: newTokens.expiresIn,
            idToken: newTokens.idToken ?? existingIdToken,
            tokenType: newTokens.tokenType
        )
        KeychainHelper.shared.saveTokens(tokensToSave)
        tokenExpiresAt = tokensToSave.expiresAt
        logger.debug("Saved tokens with ID token preserved: \(tokensToSave.idToken != nil)")

        if let newIdToken = newTokens.idToken {
            logger.debug("New ID token received, extracting email")
            extractEmailFromIdToken(newIdToken)
        } else if let existingEmail {
            logger.debug("No new ID token, preserving existing email")
            customerEmail = existingEmail
        } else if let existingIdToken {
            logger.debug("No stored email but have original ID token, extracting...")
            extractEmailFromIdToken(existingIdToken)
        } else {
            logger.error("No ID token in refresh response and no stored email or ID token")
        }
    }

    func getValidAccessToken() async throws -> String {
        logger.debug("Getting valid access token...")

        guard let tokens = KeychainHelper.shared.getTokens() else {
            logger.error("No tokens available")
            throw CustomerAccountError.notAuthenticated
        }

        if tokens.isExpiringSoon {
            logger.debug("Token expiring soon (expires at: \(tokens.expiresAt)), refreshing...")
            try await refreshAccessToken()
            guard let refreshedTokens = KeychainHelper.shared.getTokens() else {
                logger.error("No tokens after refresh")
                throw CustomerAccountError.notAuthenticated
            }
            logger.debug("Returning refreshed access token")
            return refreshedTokens.accessToken
        }

        logger.debug("Returning valid access token (expires at: \(tokens.expiresAt))")
        return tokens.accessToken
    }

    func logout() async {
        logger.debug("Logging out...")
        let idToken = KeychainHelper.shared.getTokens()?.idToken
        clearLocalSession()

        if let idToken {
            // Mobile clients receive an empty 200 response from this endpoint,
            // so presenting it in ASWebAuthenticationSession would never call back.
            logger.debug("Sending logout request to server")
            await performLogoutRequest(idTokenHint: idToken)
        }
        logger.debug("Logout complete")
    }

    private func performLogoutRequest(idTokenHint: String) async {
        guard let logoutEndpoint else { return }
        guard var components = URLComponents(string: logoutEndpoint) else { return }
        components.queryItems = [
            URLQueryItem(name: "id_token_hint", value: idTokenHint)
        ]

        guard let url = components.url else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        _ = try? await URLSession.shared.data(for: request)
    }

    private func clearLocalSession() {
        KeychainHelper.shared.clearTokens()
        isAuthenticated = false
        customerEmail = nil
        tokenExpiresAt = nil
        codeVerifier = nil
        savedState = nil

        CartManager.shared.resetCart()
        ShopifyCheckoutKit.invalidate()
    }

    func checkExistingSession() {
        logger.debug("Checking existing session...")

        guard let tokens = KeychainHelper.shared.getTokens() else {
            logger.debug("No tokens found in keychain")
            return
        }

        customerEmail = KeychainHelper.shared.getEmail()

        if !tokens.isExpired {
            logger.debug("Tokens valid, expires at: \(tokens.expiresAt)")
            isAuthenticated = true
            tokenExpiresAt = tokens.expiresAt
            if customerEmail == nil {
                logger.debug("No stored email, attempting extraction from ID token")
                extractEmailFromIdToken(tokens.idToken)
            }
        } else if tokens.refreshToken != nil {
            logger.debug("Access token expired, attempting refresh...")
            Task {
                do {
                    try await refreshAccessToken()
                    isAuthenticated = true
                    logger.debug("Session restored after refresh")
                } catch {
                    logger.error("Refresh failed: \(error), logging out")
                    await logout()
                }
            }
        } else {
            logger.error("Token expired and no refresh token available, logging out")
            Task {
                await logout()
            }
        }
    }

    private func performTokenRequest(body: [String: String]) async throws -> OAuthTokenResult {
        guard let tokenEndpoint, let url = URL(string: tokenEndpoint) else {
            throw CustomerAccountError.tokenExchangeFailed("Invalid token endpoint URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let bodyString = body.sorted(by: { $0.key < $1.key })
            .map { "\(formEncode($0.key))=\(formEncode($0.value))" }
            .joined(separator: "&")
        request.httpBody = bodyString.data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw CustomerAccountError.tokenExchangeFailed("Invalid response")
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw CustomerAccountError.tokenExchangeFailed("Status \(httpResponse.statusCode): \(errorMessage)")
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        struct TokenResponse: Decodable {
            let accessToken: String
            let refreshToken: String?
            let expiresIn: Int
            let idToken: String?
            let tokenType: String
        }

        let tokenResponse = try decoder.decode(TokenResponse.self, from: data)

        return OAuthTokenResult(
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn,
            idToken: tokenResponse.idToken,
            tokenType: tokenResponse.tokenType
        )
    }

    private func formEncode(_ value: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private func extractEmailFromIdToken(_ idToken: String?) {
        guard let idToken else {
            logger.debug("extractEmailFromIdToken called with nil ID token")
            return
        }

        let parts = idToken.split(separator: ".")
        guard parts.count == 3 else {
            logger.error("Invalid ID token format (expected 3 parts, got \(parts.count))")
            return
        }

        var payload = String(parts[1])
        while payload.count % 4 != 0 {
            payload += "="
        }
        payload = payload
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            logger.error("Failed to decode ID token payload")
            return
        }

        guard let email = json["email"] as? String else {
            logger.error("No 'email' claim found in ID token")
            return
        }

        customerEmail = email
        KeychainHelper.shared.saveEmail(email)
    }

    private func presentAuthenticationSession(
        url: URL,
        callbackScheme: String,
        from presentationAnchor: ASPresentationAnchor
    ) async throws -> URL {
        guard authenticationSession == nil else {
            throw CustomerAccountError.authorizationInProgress
        }

        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                let contextProvider = CustomerAccountPresentationContextProvider(anchor: presentationAnchor)
                let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                    Task { @MainActor in
                        self?.authenticationSession = nil
                        self?.presentationContextProvider = nil

                        if let authenticationError = error as? ASWebAuthenticationSessionError,
                           authenticationError.code == .canceledLogin
                        {
                            continuation.resume(throwing: CustomerAccountError.authorizationCancelled)
                        } else if let error {
                            continuation.resume(throwing: CustomerAccountError.authorizationFailed(error.localizedDescription))
                        } else if let callbackURL {
                            continuation.resume(returning: callbackURL)
                        } else {
                            continuation.resume(throwing: CustomerAccountError.invalidCallback)
                        }
                    }
                }
                session.presentationContextProvider = contextProvider
                session.prefersEphemeralWebBrowserSession = false

                authenticationSession = session
                presentationContextProvider = contextProvider

                guard session.start() else {
                    authenticationSession = nil
                    presentationContextProvider = nil
                    continuation.resume(throwing: CustomerAccountError.authorizationFailed("Unable to start the browser session"))
                    return
                }
            }
        } onCancel: {
            Task { @MainActor [weak self] in
                self?.authenticationSession?.cancel()
            }
        }
    }
}
