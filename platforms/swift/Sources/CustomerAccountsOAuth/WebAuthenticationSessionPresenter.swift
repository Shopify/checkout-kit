import AuthenticationServices
import Foundation
import UIKit

@MainActor
final class WebAuthenticationSessionPresenter: NSObject {
    private var authenticationSession: ASWebAuthenticationSession?
    private var contextProvider: PresentationContextProvider?

    func authenticate(
        at url: URL,
        callbackScheme: String,
        from viewController: UIViewController,
        browserSession: OAuthConfiguration.BrowserSession
    ) async throws -> URL {
        guard authenticationSession == nil else {
            throw OAuthError.authorizationInProgress
        }

        guard let anchor = viewController.viewIfLoaded?.window ?? viewController.view.window else {
            throw OAuthError.browserPresentationFailed
        }

        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                let provider = PresentationContextProvider(anchor: anchor)
                let session = ASWebAuthenticationSession(
                    url: url,
                    callbackURLScheme: callbackScheme
                ) { [weak self] callbackURL, error in
                    Task { @MainActor in
                        self?.authenticationSession = nil
                        self?.contextProvider = nil

                        let authenticationError = error as? ASWebAuthenticationSessionError
                        let authorizationWasCancelled = authenticationError?.code == .canceledLogin
                        if authorizationWasCancelled {
                            continuation.resume(throwing: OAuthError.authorizationCancelled)
                        } else if error != nil {
                            continuation.resume(
                                throwing: OAuthError.authorizationFailed(code: "browser_error", description: nil)
                            )
                        } else if let callbackURL {
                            continuation.resume(returning: callbackURL)
                        } else {
                            continuation.resume(throwing: OAuthError.invalidCallback)
                        }
                    }
                }
                session.presentationContextProvider = provider
                session.prefersEphemeralWebBrowserSession = browserSession == .ephemeral

                authenticationSession = session
                contextProvider = provider

                guard session.start() else {
                    authenticationSession = nil
                    contextProvider = nil
                    continuation.resume(throwing: OAuthError.browserPresentationFailed)
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

@MainActor
private final class PresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: ASPresentationAnchor

    init(anchor: ASPresentationAnchor) {
        self.anchor = anchor
    }

    func presentationAnchor(for _: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}
