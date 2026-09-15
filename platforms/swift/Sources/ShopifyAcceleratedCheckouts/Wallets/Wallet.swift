import ShopifyCheckoutKit
import SwiftUI

/// Possible Wallets `AcceleratedCheckouts` can render via the `.wallets` modifier.
public enum Wallet: String {
    case applePay
    case shopPay
}

/// Event handlers for wallet buttons
public struct EventHandlers {
    public var checkoutDidStart: ((CheckoutStartEvent) -> Void)?
    public var checkoutDidUpdate: ((CheckoutUpdateEvent) -> Void)?
    public var checkoutDidComplete: ((CheckoutCompleteEvent) -> Void)?
    public var checkoutAction: ((CheckoutLink) -> CheckoutLinkAction)?
    public var checkoutDidFail: ((CheckoutError) -> Void)?
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
