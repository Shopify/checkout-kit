/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
    case sdkError(underlying: Swift.Error, recoverable: Bool = true)

    case checkoutUnavailable(message: String, code: CheckoutUnavailable, recoverable: Bool)

    case checkoutExpired(message: String, code: CheckoutErrorCode, recoverable: Bool = false)

    public var isRecoverable: Bool {
        switch self {
        case let .checkoutExpired(_, _, recoverable),
             let .checkoutUnavailable(_, _, recoverable),
             let .sdkError(_, recoverable):
            return recoverable
        }
    }
}
