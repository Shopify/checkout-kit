import Foundation
import PassKit

// MARK: - Apple Pay Button

@available(iOS 16.0, *)
extension PKPaymentButtonType {
    static func from(_ string: String?, fallback: PKPaymentButtonType = .plain) -> PKPaymentButtonType {
        guard let string, let value = map[string] else {
            return fallback
        }

        return value
    }

    private static let map: [String: PKPaymentButtonType] = [
        "addMoney": .addMoney,
        "book": .book,
        "buy": .buy,
        "checkout": .checkout,
        "continue": .continue,
        "contribute": .contribute,
        "donate": .donate,
        "inStore": .inStore,
        "order": .order,
        "plain": .plain,
        "reload": .reload,
        "rent": .rent,
        "setUp": .setUp,
        "subscribe": .subscribe,
        "support": .support,
        "tip": .tip,
        "topUp": .topUp
    ]
}

// MARK: - Apple Pay Button Style

@available(iOS 16.0, *)
extension PKPaymentButtonStyle {
    static func from(_ string: String?, fallback: PKPaymentButtonStyle = .automatic) -> PKPaymentButtonStyle {
        guard let string, let value = map[string] else {
            return fallback
        }

        return value
    }

    private static let map: [String: PKPaymentButtonStyle] = [
        "automatic": .automatic,
        "black": .black,
        "white": .white,
        "whiteOutline": .whiteOutline
    ]
}
