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

enum WalletButtonHeight {
    static let defaultHeight: CGFloat = 48
    /// Apple's minimum height for Apple Pay buttons.
    static let minimum: CGFloat = 30
    /// Apple sets no maximum; this cap keeps buttons from growing out of proportion.
    static let maximum: CGFloat = 64

    static func resolve(_ requested: CGFloat?) -> CGFloat {
        guard let requested, requested.isFinite, requested > 0 else {
            return defaultHeight
        }
        return min(max(requested, minimum), maximum)
    }
}

extension View {
    func walletButtonStyle(
        bg: Color = Color.black,
        cornerRadius: CGFloat? = nil,
        height: CGFloat = WalletButtonHeight.defaultHeight
    ) -> some View {
        let defaultCornerRadius: CGFloat = 8
        let radius = cornerRadius ?? defaultCornerRadius
        return frame(height: height)
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
