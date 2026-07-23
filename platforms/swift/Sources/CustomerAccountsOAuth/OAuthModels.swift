import Foundation

package struct OAuthSession: Equatable {
    package let email: String?
    package let accessTokenExpiresAt: Date
}

struct StoredCredentials: Codable, Equatable {
    let accessToken: String
    let refreshToken: String?
    let idToken: String
    let tokenType: String
    let accessTokenExpiresAt: Date
    let email: String?

    func isAccessTokenFresh(at date: Date, tolerance: TimeInterval = 60) -> Bool {
        accessTokenExpiresAt.timeIntervalSince(date) > tolerance
    }

    var session: OAuthSession {
        OAuthSession(email: email, accessTokenExpiresAt: accessTokenExpiresAt)
    }
}

struct TokenResponse: Decodable {
    let accessToken: String
    let refreshToken: String?
    let expiresIn: TimeInterval
    let idToken: String?
    let tokenType: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case idToken = "id_token"
        case tokenType = "token_type"
    }
}

struct OAuthServerError: Decodable {
    let error: String
    let errorDescription: String?

    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
    }
}
