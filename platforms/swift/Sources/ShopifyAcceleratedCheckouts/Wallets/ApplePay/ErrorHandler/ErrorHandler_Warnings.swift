import Foundation
import PassKit

@available(iOS 16.0, *)
extension ErrorHandler {
    static func map(
        warningType: StorefrontAPI.WarningType,
        cart: StorefrontAPI.Types.Cart?
    ) -> PaymentSheetAction {
        switch warningType {
        case .outOfStock:
            return .interrupt(reason: .outOfStock, checkoutURL: cart?.checkoutUrl.url)
        case .notEnoughStock:
            return .interrupt(reason: .notEnoughStock, checkoutURL: cart?.checkoutUrl.url)
        }
    }
}
