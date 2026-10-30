import ShopifyCheckoutKit
import SwiftUI

@available(iOS 16.0, *)
internal struct ShopPayButton: View {
    @Environment(\.shopifyAcceleratedCheckoutsConfiguration)
    private var configuration: ShopifyAcceleratedCheckouts.Configuration?

    let cartSource: CartSource
    let eventHandlers: EventHandlers
    let cornerRadius: CGFloat?
    let buttonHeight: CGFloat

    init(
        identifier: CheckoutIdentifier,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight
    ) {
        cartSource = .cart(identifier.parse())
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
    }

    init(
        cartSource: CartSource,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight
    ) {
        self.cartSource = cartSource
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
    }

    var body: some View {
        if cartSource.isValid() {
            Internal_ShopPayButton(
                cartSource: cartSource,
                configuration: resolvedConfiguration,
                eventHandlers: eventHandlers,
                cornerRadius: cornerRadius,
                buttonHeight: buttonHeight
            )
        }
    }

    private var resolvedConfiguration: ShopifyAcceleratedCheckouts.Configuration {
        guard let configuration else {
            fatalError("Missing ShopifyAcceleratedCheckouts.Configuration. Add .environment(\\.shopifyAcceleratedCheckoutsConfiguration, ...) to an ancestor view.")
        }
        return configuration
    }
}

/// Internal_ wrapper component allows `ShopifyAcceleratedCheckouts.Configuration` to be
/// DI into ShopPayViewController at init, avoiding optionality checks through ViewController
@available(iOS 16.0, *)
@MainActor
internal struct Internal_ShopPayButton: View {
    @State private var attempt = WalletButtonAttempt()
    private let cartSource: CartSource
    private let configuration: ShopifyAcceleratedCheckouts.Configuration
    private let eventHandlers: EventHandlers
    private let cornerRadius: CGFloat?
    private let buttonHeight: CGFloat

    init(
        identifier: CheckoutIdentifier,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight
    ) {
        cartSource = .cart(identifier)
        self.configuration = configuration
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
    }

    init(
        cartSource: CartSource,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight
    ) {
        self.cartSource = cartSource
        self.configuration = configuration
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
    }

    var body: some View {
        Button(
            action: {
                Task { @MainActor in
                    // Check the retained attempt before creating a fresh controller for this tap.
                    guard attempt.controller?.isStartingCheckout != true else { return }
                    let controller = ShopPayViewController(
                        cartSource: cartSource,
                        configuration: configuration,
                        eventHandlers: eventHandlers
                    )

                    // Retain the delegate while checkout events redraw the button's parent.
                    attempt.controller = controller
                    await controller.onPress()
                }
            },
            label: {
                HStack {
                    SwiftUI.Image("shop-pay-logo", bundle: .acceleratedCheckouts)
                        .resizable()
                        .scaledToFit()
                        .frame(height: 24)
                        .frame(maxWidth: .infinity)
                        .accessibilityLabel("Shop Pay")
                }
                .frame(height: buttonHeight)
                // This ensures that the blue background is clickable
                .background(Color.shopPayBlue)
            }
        )
        .walletButtonStyle(bg: Color.shopPayBlue, cornerRadius: cornerRadius, height: buttonHeight)
        .buttonStyle(ContentFadeButtonStyle())
    }
}
