#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

/// Stable, consumer-facing reason for a terminal checkout presentation failure.
public enum CheckoutErrorCode: String, Codable, Sendable {
    case storefrontPasswordRequired = "storefront_password_required"
    case customerAccountRequired = "customer_account_required"
    case cartExpired = "cart_expired"
    case cartCompleted = "cart_completed"
    case invalidCart = "invalid_cart"
    case httpError = "http_error"
    case networkError = "network_error"
    case sdkError = "sdk_error"
    case unknown
}

/// A terminal checkout presentation failure.
public struct CheckoutError: LocalizedError {
    public let code: CheckoutErrorCode
    public let message: String
    public let httpStatusCode: Int?

    /// Native diagnostic context. This value is not guaranteed to be Sendable.
    public let underlyingError: (any Error)?

    public init(
        code: CheckoutErrorCode,
        message: String,
        httpStatusCode: Int? = nil,
        underlyingError: (any Error)? = nil
    ) {
        self.code = code
        self.message = message
        self.httpStatusCode = httpStatusCode
        self.underlyingError = underlyingError
    }

    public var errorDescription: String? {
        message
    }

    internal static func sdkError(underlying: any Error) -> Self {
        Self(code: .sdkError, message: underlying.localizedDescription, underlyingError: underlying)
    }
}

extension CheckoutError {
    internal static func http(statusCode: Int, message: String) -> CheckoutError {
        CheckoutError(
            code: statusCode == 410 ? .cartExpired : .httpError,
            message: message,
            httpStatusCode: statusCode
        )
    }

    internal static func network(message: String, underlyingError: (any Error)? = nil) -> CheckoutError {
        CheckoutError(code: .networkError, message: message, underlyingError: underlyingError)
    }

    internal static func sdk(message: String, underlyingError: (any Error)? = nil) -> CheckoutError {
        CheckoutError(code: .sdkError, message: message, underlyingError: underlyingError)
    }

    internal static func unknown(message: String, underlyingError: (any Error)? = nil) -> CheckoutError {
        CheckoutError(code: .unknown, message: message, underlyingError: underlyingError)
    }

    internal static func terminalProtocol(error: ErrorResponse) -> CheckoutError {
        let representative = error.messages.first {
            $0.type == .error && $0.severity == .unrecoverable
        }

        return CheckoutError(
            code: representative?.code.checkoutErrorCode ?? .unknown,
            message: representative?.content ?? "Embedded checkout reported a terminal error."
        )
    }
}

extension String? {
    fileprivate var checkoutErrorCode: CheckoutErrorCode {
        // This is intentionally an allowlist rather than CheckoutErrorCode(rawValue:). Only
        // Checkout-originated recovery codes are mapped from terminal ECP messages; transport
        // and SDK codes are assigned by Checkout Kit, so web-asserted values map to unknown.
        switch self?.lowercased() {
        case "storefront_password_required": .storefrontPasswordRequired
        case "customer_account_required": .customerAccountRequired
        case "cart_expired": .cartExpired
        case "cart_completed": .cartCompleted
        case "invalid_cart": .invalidCart
        default: .unknown
        }
    }
}
