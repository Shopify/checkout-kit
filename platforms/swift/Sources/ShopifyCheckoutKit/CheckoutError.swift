#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import Foundation

/// Stable, consumer-facing reason for a terminal checkout presentation failure.
public enum CheckoutErrorCode: String, Codable, Sendable {
    /// The storefront requires a password and cannot be used by Checkout Kit.
    case storefrontPasswordRequired = "storefront_password_required"

    /// Checkout requires a customer account that is not available to the current session.
    case customerAccountRequired = "customer_account_required"

    /// The cart or checkout session is no longer available. Create a new cart before retrying.
    case cartExpired = "cart_expired"

    /// The cart has already completed checkout.
    case cartCompleted = "cart_completed"

    /// The cart is invalid or cannot be used to continue checkout.
    case invalidCart = "invalid_cart"

    /// Checkout returned an HTTP error response. See ``CheckoutError/httpStatusCode``.
    case httpError = "http_error"

    /// Checkout navigation failed before an HTTP response was available.
    case networkError = "network_error"

    /// An internal Checkout Kit error occurred, for example when a protocol message could not be decoded.
    case sdkError = "sdk_error"

    /// An unexpected error occurred.
    case unknown
}

/// A terminal checkout presentation failure delivered through ``CheckoutDelegate/checkoutDidFail(error:)``
/// or ``ShopifyCheckout/onFail(_:)``.
///
/// Use ``code`` for application behavior. Use ``message`` and ``underlyingError`` only for debugging
/// and logging. ``httpStatusCode`` is present only when an HTTP response caused failure. Your app owns
/// recovery actions such as retrying, recreating a cart, authenticating a buyer, and reopening checkout.
public struct CheckoutError: LocalizedError {
    /// Stable code for this failure.
    public let code: CheckoutErrorCode

    /// Diagnostic description. Do not use it as a stable recovery or analytics key.
    public let message: String

    /// HTTP status for an HTTP-response failure, otherwise `nil`.
    public let httpStatusCode: Int?

    /// Native diagnostic cause, when one is available. This value is not guaranteed to be Sendable.
    public let underlyingError: (any Error)?

    /// Creates a terminal checkout presentation failure.
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

    /// Creates an SDK failure using an underlying native error as diagnostic context.
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
