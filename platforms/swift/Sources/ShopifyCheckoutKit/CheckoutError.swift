import Foundation

public enum CheckoutErrorCode: String, Codable {
    case storefrontPasswordRequired = "storefront_password_required"
    case cartExpired = "cart_expired"
    case cartCompleted = "cart_completed"
    case invalidCart = "invalid_cart"
    case unknown

    public static func from(_ code: String?) -> CheckoutErrorCode {
        let fallback = CheckoutErrorCode.unknown

        guard let errorCode = code else {
            return fallback
        }

        return CheckoutErrorCode(rawValue: errorCode) ?? fallback
    }
}

public enum CheckoutUnavailable {
    case clientError(code: CheckoutErrorCode)
    case httpError(statusCode: Int)
}

public enum CheckoutError: Swift.Error {
    case sdkError(underlying: Swift.Error)

    case checkoutUnavailable(message: String, code: CheckoutUnavailable)

    case checkoutExpired(message: String, code: CheckoutErrorCode)
}
