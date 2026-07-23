internal import CustomerAccountsOAuth
import Foundation

public enum CustomerAccountError: LocalizedError, Equatable, Sendable {
    case invalidConfiguration
    case authorizationInProgress
    case authorizationCancelled
    case authorizationFailed(code: String, description: String?)
    case browserPresentationFailed
    case invalidCallback
    case invalidState
    case invalidTokenResponse
    case networkRequestFailed
    case tokenRequestFailed(code: String, description: String?)
    case invalidIDToken
    case notAuthenticated
    case storageFailed

    public var errorDescription: String? {
        switch self {
        case .invalidConfiguration:
            "The Customer Account API configuration is invalid."
        case .authorizationInProgress:
            "Another customer account authorization is already in progress."
        case .authorizationCancelled:
            "Authorization was cancelled."
        case let .authorizationFailed(code, description):
            description ?? "Authorization failed with error: \(code)."
        case .browserPresentationFailed:
            "The authentication session could not be presented."
        case .invalidCallback:
            "The authorization callback is invalid."
        case .invalidState:
            "The authorization response did not match the request."
        case .invalidTokenResponse:
            "The authorization server returned an invalid token response."
        case .networkRequestFailed:
            "The customer account request could not be completed."
        case let .tokenRequestFailed(code, description):
            description ?? "The token request failed with error: \(code)."
        case .invalidIDToken:
            "The authorization server returned an invalid identity token."
        case .notAuthenticated:
            "No customer account session is available."
        case .storageFailed:
            "The customer account session could not be stored securely."
        }
    }

    // swiftlint:disable:next cyclomatic_complexity
    package init(_ error: any Error) {
        guard let error = error as? OAuthError else {
            self = .storageFailed
            return
        }

        self = switch error {
        case .invalidConfiguration, .randomGenerationFailed:
            .invalidConfiguration
        case .authorizationInProgress:
            .authorizationInProgress
        case .authorizationCancelled:
            .authorizationCancelled
        case let .authorizationFailed(code, description):
            .authorizationFailed(code: code, description: description)
        case .browserPresentationFailed:
            .browserPresentationFailed
        case .invalidCallback, .missingAuthorizationCode:
            .invalidCallback
        case .invalidState:
            .invalidState
        case .invalidTokenResponse:
            .invalidTokenResponse
        case .networkRequestFailed:
            .networkRequestFailed
        case let .tokenRequestFailed(code, description):
            .tokenRequestFailed(code: code, description: description)
        case .invalidIDToken, .invalidIssuer, .invalidAudience, .expiredIDToken, .invalidIssuedAt, .invalidNonce:
            .invalidIDToken
        case .notAuthenticated:
            .notAuthenticated
        case .storageFailed:
            .storageFailed
        }
    }
}
