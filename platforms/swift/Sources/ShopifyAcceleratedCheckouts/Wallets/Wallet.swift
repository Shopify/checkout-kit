#if !COCOAPODS
    import EmbeddedCheckoutProtocol
#endif
import ShopifyCheckoutKit
import SwiftUI

/// Possible Wallets `AcceleratedCheckouts` can render via the `.wallets` modifier.
public enum Wallet: String {
    case applePay
    case shopPay
}

/// Event handlers for wallet buttons
public struct EventHandlers {
    public var checkoutDidFail: ((CheckoutError) -> Void)?
    public var checkoutDidDismiss: (() -> Void)?
    public var renderStateDidChange: ((RenderState) -> Void)?

    public init(
        checkoutDidFail: ((CheckoutError) -> Void)? = nil,
        checkoutDidDismiss: (() -> Void)? = nil,
        renderStateDidChange: ((RenderState) -> Void)? = nil
    ) {
        self.checkoutDidFail = checkoutDidFail
        self.checkoutDidDismiss = checkoutDidDismiss
        self.renderStateDidChange = renderStateDidChange
    }
}

/// Keeps bridge client storage behind a reference so SwiftUI view values do not
/// embed optional existential storage while they are repeatedly copied.
final class CheckoutProtocolClientContainer: Sendable {
    let advancedClient: (any CheckoutCommunicationProtocol)?
    let callbackClient: CheckoutProtocol.Client

    var client: any CheckoutCommunicationProtocol {
        AcceleratedCheckoutEventCallbackClient(callbacks: callbackClient, advanced: advancedClient)
    }

    init(
        _ advancedClient: (any CheckoutCommunicationProtocol)? = nil,
        callbacks: CheckoutProtocol.Client = .init()
    ) {
        self.advancedClient = advancedClient
        callbackClient = callbacks
    }
}

private struct AcceleratedCheckoutEventCallbackClient: CheckoutCommunicationProtocol {
    let callbacks: CheckoutProtocol.Client
    let advanced: (any CheckoutCommunicationProtocol)?

    func process(_ message: String) async -> String? {
        _ = await callbacks.process(message)
        return await advanced?.process(message)
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
