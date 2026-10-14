/// Details about an incoming checkout message rejected by the transport admission policy.
struct CheckoutMessageRejection: Equatable {
    /// Stable reason the message was rejected.
    enum Reason: Equatable {
        /// The message was sent from a child frame rather than the checkout document.
        case childFrame

        /// The message request URL used explicit port zero, which WebKit cannot represent safely.
        case unsupportedPort

        /// The message origin was not included in the effective allowlist.
        case originNotAllowed
    }

    /// Origin the message was received from, for example `https://example.com`.
    let origin: String

    /// Stable reason the message was rejected.
    let reason: Reason
}

extension CheckoutMessageRejection.Reason {
    var logDescription: String {
        switch self {
        case .childFrame:
            return "message was sent from a child frame"
        case .unsupportedPort:
            return "origin uses unsupported port 0"
        case .originNotAllowed:
            return "origin is not in the allowlist"
        }
    }
}
