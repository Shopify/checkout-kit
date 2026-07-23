import Foundation

package enum OAuthError: Error, Equatable {
    case invalidConfiguration
    case randomGenerationFailed
    case authorizationInProgress
    case authorizationCancelled
    case authorizationFailed(code: String, description: String?)
    case browserPresentationFailed
    case invalidCallback
    case invalidState
    case missingAuthorizationCode
    case invalidTokenResponse
    case networkRequestFailed
    case tokenRequestFailed(code: String, description: String?)
    case invalidIDToken
    case invalidIssuer
    case invalidAudience
    case expiredIDToken
    case invalidIssuedAt
    case invalidNonce
    case notAuthenticated
    case storageFailed(status: Int32)

    package var invalidatesSession: Bool {
        if case let .tokenRequestFailed(code, _) = self {
            return code == "invalid_grant" || code == "invalid_token"
        }
        return false
    }
}
