import Foundation
import PassKit

@available(iOS 16.0, *)
class ErrorHandler {
    enum InterruptReason {
        case currencyChanged
        case outOfStock
        case dynamicTax
        case cartNotReady
        case cartThrottled
        case notEnoughStock
        case other
        /// These errors are unhandled by Portable Wallets
        case unhandled

        var queryParam: String? {
            switch self {
            case .currencyChanged: "wallet_currency_change"
            case .dynamicTax: "wallet_dynamic_tax"
            case .cartNotReady: "wallet_cart_not_ready"
            case .notEnoughStock: "wallet_not_enough_stock"
            case .other: nil
            case .unhandled: nil
            // These are handled in checkout by default
            case .cartThrottled: nil
            case .outOfStock: nil
            }
        }
    }

    enum PaymentSheetAction {
        case showError(errors: [Error])
        case interrupt(reason: InterruptReason, checkoutURL: URL? = nil)
        case continueFlow
    }

    static func useEmirate(shippingCountry: String?) -> Bool {
        return shippingCountry == "AE"
    }

    static func getHighestPriorityAction(actions: [PaymentSheetAction]) -> PaymentSheetAction {
        let sortedActions = actionsSortedByPrecedence(actions: actions)

        guard let action = sortedActions.first else {
            // This list should not be empty, otherwise we would not be in this error handling flow
            ShopifyAcceleratedCheckouts.logger.error("[ErrorHandler][getHighestPriorityAction]: actions list is empty")
            return .interrupt(reason: .other)
        }

        switch action {
        case .showError:
            // We want to surface messages for all errors, not just the first one
            let allErrors = combinedErrors(actions: sortedActions)
            return .showError(errors: allErrors)
        default:
            return action
        }
    }

    static func getShippingCountry(cart: StorefrontAPI.Cart?) -> String? {
        let shippingAddress =
            cart?.delivery?.addresses.first(where: { $0.selected })?
                .address as? StorefrontAPI.CartDeliveryAddress
        return shippingAddress?.countryCode
    }

    static func map(error: Error, cart: StorefrontAPI.Cart?, requiredContactFields: Set<PKContactField>? = nil) -> PaymentSheetAction? {
        let shippingCountry = getShippingCountry(cart: cart)
        switch error {
        case let cartUserError as StorefrontAPI.CartUserError:
            // Handle StorefrontAPI errors directly - we don't have the cart here but the checkout URL
            // is already captured in the delegate
            return ErrorHandler.map(errors: [cartUserError], shippingCountry: shippingCountry, cart: nil, requiredContactFields: requiredContactFields)
        case let apiError as StorefrontAPI.Errors:
            switch apiError {
            case let .response(_, _, payload):
                switch payload {
                case let .cartSubmitForCompletion(submitPayload):
                    return ErrorHandler.map(stage: .submit(submitPayload), shippingCountry: shippingCountry, requiredContactFields: requiredContactFields)
                case let .cartPrepareForCompletion(preparePayload):
                    return ErrorHandler.map(stage: .prepare(preparePayload), shippingCountry: shippingCountry, requiredContactFields: requiredContactFields)
                }
            case let .userError(userErrors, cart):
                return ErrorHandler.map(errors: userErrors, shippingCountry: shippingCountry, cart: cart, requiredContactFields: requiredContactFields)
            case .currencyChanged:
                return .interrupt(reason: .currencyChanged, checkoutURL: cart?.checkoutUrl.url)
            case let .warning(type, cart):
                return ErrorHandler.map(warningType: type, cart: cart)
            default:
                return nil
            }
        default:
            return nil
        }
    }

    private static func actionsSortedByPrecedence(actions: [PaymentSheetAction]) -> [PaymentSheetAction] {
        return actions.sorted { action1, action2 in
            let index1 = getPaymentSheetActionPrecedence(action: action1)
            let index2 = getPaymentSheetActionPrecedence(action: action2)
            return index1 < index2
        }
    }

    private static func getPaymentSheetActionPrecedence(action: PaymentSheetAction) -> Int {
        switch action {
        case let .interrupt(reason, _):
            if reason == .unhandled {
                // Unhandled errors have lowest priority in Portable Wallets
                return 3
            }
            return 1
        case .showError:
            return 2
        case .continueFlow:
            return 4
        }
    }

    private static func combinedErrors(actions: [PaymentSheetAction]) -> [Error] {
        return actions.reduce([]) { acc, action in
            switch action {
            case let .showError(errors):
                return acc + errors
            default:
                return acc
            }
        }
    }
}
