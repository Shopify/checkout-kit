import Foundation

protocol HTTPClient: Sendable {
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

struct URLSessionHTTPClient: HTTPClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else {
            throw OAuthError.invalidTokenResponse
        }
        return (data, response)
    }
}

struct TokenClient {
    private let configuration: OAuthConfiguration
    private let httpClient: any HTTPClient
    private let validator: IDTokenValidator
    private let clock: @Sendable () -> Date

    init(
        configuration: OAuthConfiguration,
        httpClient: any HTTPClient,
        clock: @escaping @Sendable () -> Date = Date.init
    ) {
        self.configuration = configuration
        self.httpClient = httpClient
        validator = IDTokenValidator(configuration: configuration, clock: clock)
        self.clock = clock
    }

    func exchangeAuthorizationCode(
        _ code: String,
        codeVerifier: String,
        expectedNonce: String
    ) async throws -> StoredCredentials {
        let response = try await requestToken(parameters: [
            "grant_type": "authorization_code",
            "client_id": configuration.clientID,
            "redirect_uri": configuration.redirectURI.absoluteString,
            "code": code,
            "code_verifier": codeVerifier
        ])

        guard let idToken = response.idToken else {
            throw OAuthError.invalidTokenResponse
        }

        let email = try validator.validate(idToken, expectedNonce: expectedNonce)
        return try credentials(from: response, idToken: idToken, email: email)
    }

    func refresh(_ existing: StoredCredentials) async throws -> StoredCredentials {
        guard let refreshToken = existing.refreshToken else {
            throw OAuthError.notAuthenticated
        }

        let response = try await requestToken(parameters: [
            "grant_type": "refresh_token",
            "client_id": configuration.clientID,
            "refresh_token": refreshToken
        ])

        let idToken = response.idToken ?? existing.idToken
        let email: String?
        if response.idToken != nil {
            email = try validator.validate(idToken, expectedNonce: nil)
        } else {
            email = existing.email
        }

        return try credentials(
            from: response,
            refreshToken: response.refreshToken ?? refreshToken,
            idToken: idToken,
            email: email
        )
    }

    private func requestToken(parameters: [String: String]) async throws -> TokenResponse {
        try configuration.validate()
        guard let tokenEndpoint = configuration.tokenEndpoint else {
            throw OAuthError.invalidConfiguration
        }

        var request = URLRequest(url: tokenEndpoint)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = parameters
            .sorted { $0.key < $1.key }
            .map { "\($0.key.formEncoded)=\($0.value.formEncoded)" }
            .joined(separator: "&")
            .data(using: .utf8)

        let data: Data
        let response: HTTPURLResponse
        do {
            (data, response) = try await httpClient.data(for: request)
        } catch let error as OAuthError {
            throw error
        } catch {
            throw OAuthError.networkRequestFailed
        }
        guard (200 ..< 300).contains(response.statusCode) else {
            let serverError = try? JSONDecoder().decode(OAuthServerError.self, from: data)
            throw OAuthError.tokenRequestFailed(
                code: serverError?.error ?? "http_\(response.statusCode)",
                description: serverError?.errorDescription
            )
        }

        guard let tokenResponse = try? JSONDecoder().decode(TokenResponse.self, from: data),
              !tokenResponse.accessToken.isEmpty,
              tokenResponse.expiresIn > 0,
              tokenResponse.tokenType.caseInsensitiveCompare("Bearer") == .orderedSame
        else {
            throw OAuthError.invalidTokenResponse
        }

        return tokenResponse
    }

    private func credentials(
        from response: TokenResponse,
        refreshToken: String? = nil,
        idToken: String,
        email: String?
    ) throws -> StoredCredentials {
        let resolvedRefreshToken = refreshToken ?? response.refreshToken
        return StoredCredentials(
            accessToken: response.accessToken,
            refreshToken: resolvedRefreshToken,
            idToken: idToken,
            tokenType: response.tokenType,
            accessTokenExpiresAt: clock().addingTimeInterval(response.expiresIn),
            email: email
        )
    }
}

extension String {
    fileprivate var formEncoded: String {
        addingPercentEncoding(
            withAllowedCharacters: CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        ) ?? self
    }
}
