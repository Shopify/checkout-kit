import ShopifyCheckoutKit
import SwiftUI

/// A wallet that `ShopifyAcceleratedCheckoutButtons` can render via the `.wallets` modifier.
///
/// Use the provided wallet constants, such as ``applePay`` and ``shopPay``. New wallet constants may be
/// added in future releases without requiring existing apps to update exhaustive `switch` statements.
public struct Wallet: RawRepresentable, Hashable, Sendable {
    /// The stable wallet name used for persistence and bridge interoperability.
    public let rawValue: String

    /// Apple Pay.
    public static let applePay: Wallet = .init(identifier: "applePay")

    /// Shop Pay.
    public static let shopPay: Wallet = .init(identifier: "shopPay")

    /// Creates a supported wallet from its stable name, returning nil for unknown names.
    public init?(rawValue: String) {
        switch rawValue {
        case Self.applePay.rawValue, Self.shopPay.rawValue:
            self.rawValue = rawValue
        default:
            return nil
        }
    }

    private init(identifier: String) {
        rawValue = identifier
    }
}

/// Event handlers for wallet buttons
public struct EventHandlers {
    public var checkoutDidStart: ((CheckoutStartEvent) -> Void)?
    public var checkoutDidUpdate: ((CheckoutUpdateEvent) -> Void)?
    public var checkoutDidComplete: ((CheckoutCompleteEvent) -> Void)?
    public var checkoutAction: ((CheckoutLink) -> CheckoutLinkAction)?
    public var checkoutDidFail: ((CheckoutError) -> Void)?

    /// Called after the accelerated checkout presentation closes, independently of checkout outcome.
    public var checkoutDidDismiss: (() -> Void)?
    public var renderStateDidChange: ((RenderState) -> Void)?

    public init(
        checkoutDidFail: ((CheckoutError) -> Void)? = nil,
        checkoutDidDismiss: (() -> Void)? = nil,
        renderStateDidChange: ((RenderState) -> Void)? = nil,
        checkoutDidStart: ((CheckoutStartEvent) -> Void)? = nil,
        checkoutDidUpdate: ((CheckoutUpdateEvent) -> Void)? = nil,
        checkoutDidComplete: ((CheckoutCompleteEvent) -> Void)? = nil,
        checkoutAction: ((CheckoutLink) -> CheckoutLinkAction)? = nil
    ) {
        self.checkoutDidStart = checkoutDidStart
        self.checkoutDidUpdate = checkoutDidUpdate
        self.checkoutDidComplete = checkoutDidComplete
        self.checkoutAction = checkoutAction
        self.checkoutDidFail = checkoutDidFail
        self.checkoutDidDismiss = checkoutDidDismiss
        self.renderStateDidChange = renderStateDidChange
    }
}

extension View {
    func walletButtonStyle(bg: Color = Color.black, cornerRadius: CGFloat? = nil) -> some View {
        let defaultCornerRadius: CGFloat = 8
        let radius = cornerRadius ?? defaultCornerRadius
        return frame(height: 48)
            .background(bg)
            .clipShape(RoundedRectangle(cornerRadius: radius >= 0 ? radius : defaultCornerRadius))
    }
}

struct ContentFadeButtonStyle: ButtonStyle {
    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
