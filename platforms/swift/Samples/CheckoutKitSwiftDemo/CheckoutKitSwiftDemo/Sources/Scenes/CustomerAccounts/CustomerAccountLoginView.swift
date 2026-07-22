import AuthenticationServices

/// Retains the host-provided window while an authentication session is active.
///
/// Authentication UI is owned by `ASWebAuthenticationSession`; the demo no
/// longer presents a login `WKWebView`.
@MainActor
final class CustomerAccountPresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: ASPresentationAnchor

    init(anchor: ASPresentationAnchor) {
        self.anchor = anchor
    }

    func presentationAnchor(for _: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}
