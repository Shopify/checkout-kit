import CryptoKit
import Foundation

struct AuthorizationContext: Equatable {
    let url: URL
    let state: String
    let nonce: String
    let codeVerifier: String
}

struct AuthorizationFlow {
    private let configuration: OAuthConfiguration

    init(configuration: OAuthConfiguration) {
        self.configuration = configuration
    }

    func makeAuthorizationContext() throws -> AuthorizationContext {
        try configuration.validate()

        guard let authorizationEndpoint = configuration.authorizationEndpoint else {
            throw OAuthError.invalidConfiguration
        }

        let codeVerifier = try SecureRandom.urlSafeString()
        let state = try SecureRandom.urlSafeString()
        let nonce = try SecureRandom.urlSafeString()
        let digest = SHA256.hash(data: Data(codeVerifier.utf8))
        let codeChallenge = Data(digest)
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")

        guard var components = URLComponents(url: authorizationEndpoint, resolvingAgainstBaseURL: false) else {
            throw OAuthError.invalidConfiguration
        }

        components.queryItems = [
            URLQueryItem(name: "scope", value: "openid email customer-account-api:full"),
            URLQueryItem(name: "client_id", value: configuration.clientID),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: configuration.redirectURI.absoluteString),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "nonce", value: nonce),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256")
        ]

        guard let url = components.url else {
            throw OAuthError.invalidConfiguration
        }

        return AuthorizationContext(url: url, state: state, nonce: nonce, codeVerifier: codeVerifier)
    }

    func authorizationCode(from callbackURL: URL, expectedState: String) throws -> String {
        guard callbackURL.matchesRedirect(configuration.redirectURI),
              let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
        else {
            throw OAuthError.invalidCallback
        }

        var parameters: [String: String] = [:]
        for queryItem in components.queryItems ?? [] {
            guard let value = queryItem.value, parameters[queryItem.name] == nil else {
                throw OAuthError.invalidCallback
            }
            parameters[queryItem.name] = value
        }

        guard parameters["state"] == expectedState else {
            throw OAuthError.invalidState
        }

        if let error = parameters["error"] {
            throw OAuthError.authorizationFailed(
                code: error,
                description: parameters["error_description"]
            )
        }

        guard let code = parameters["code"], !code.isEmpty else {
            throw OAuthError.missingAuthorizationCode
        }

        return code
    }
}

extension URL {
    func matchesRedirect(_ expected: URL) -> Bool {
        guard let actualComponents = URLComponents(url: self, resolvingAgainstBaseURL: false),
              let expectedComponents = URLComponents(url: expected, resolvingAgainstBaseURL: false)
        else {
            return false
        }

        return actualComponents.scheme?.lowercased() == expectedComponents.scheme?.lowercased()
            && actualComponents.host?.lowercased() == expectedComponents.host?.lowercased()
            && actualComponents.port == expectedComponents.port
            && actualComponents.path == expectedComponents.path
    }
}
