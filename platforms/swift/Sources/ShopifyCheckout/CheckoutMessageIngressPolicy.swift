import Foundation

/// Transport metadata available before an incoming message enters protocol dispatch.
///
/// WebKit owns the authoritative frame and origin metadata. Keeping that metadata
/// separate from the untrusted message body prevents protocol handlers from being
/// responsible for transport admission decisions. Origin details are resolved lazily
/// because open-by-default admission does not need to inspect them.
struct IncomingCheckoutMessage {
    let isMainFrame: Bool
    let resolveOrigin: () -> MessageOrigin
    let resolveRequestURL: () -> URL?
}

/// Applies the SDK's admission rules to incoming checkout messages.
///
/// A message may be valid checkout protocol while still being rejected because its
/// transport metadata is not admitted.
struct CheckoutMessageIngressPolicy {
    enum Decision: Equatable {
        case accepted
        case rejected(CheckoutMessageRejection)
    }

    let configuredOrigins: [String]
    let checkoutURL: URL?

    func evaluate(_ message: IncomingCheckoutMessage) -> Decision {
        guard message.isMainFrame else {
            return .rejected(
                CheckoutMessageRejection(origin: message.resolveOrigin().description, reason: .childFrame)
            )
        }

        let patterns = MessageOriginValidator.effectiveAllowlist(
            configuredOrigins: configuredOrigins,
            checkoutURL: checkoutURL
        )
        guard let patterns else { return .accepted }

        // WKSecurityOrigin reports both the default port and explicit port zero
        // as zero. The frame request URL preserves the explicit spelling.
        guard message.resolveRequestURL()?.port != 0 else {
            return .rejected(
                CheckoutMessageRejection(origin: message.resolveOrigin().description, reason: .unsupportedPort)
            )
        }

        let origin = message.resolveOrigin()
        guard MessageOriginValidator.isAllowed(origin: origin, patterns: patterns) else {
            return .rejected(
                CheckoutMessageRejection(origin: origin.description, reason: .originNotAllowed)
            )
        }

        return .accepted
    }
}
