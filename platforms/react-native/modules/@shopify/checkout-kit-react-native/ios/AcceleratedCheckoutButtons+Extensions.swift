import _PassKit_SwiftUI
import Foundation
import PassKit
import SwiftUI

// MARK: - Apple Pay Button

@available(iOS 16.0, *)
extension PayWithApplePayButtonLabel {
    static func from(_ string: String?, fallback: PayWithApplePayButtonLabel = .plain) -> PayWithApplePayButtonLabel {
        guard let string, let value = map[string] else {
            return fallback
        }

        return value
    }

    private static let map: [String: PayWithApplePayButtonLabel] = [
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
extension PayWithApplePayButtonStyle {
    static func from(_ string: String?, fallback: PayWithApplePayButtonStyle = .automatic) -> PayWithApplePayButtonStyle {
        guard let string, let value = map[string] else {
            return fallback
        }

        return value
    }

    private static let map: [String: PayWithApplePayButtonStyle] = [
        "automatic": .automatic,
        "black": .black,
        "white": .white,
        "whiteOutline": .whiteOutline
    ]
}
