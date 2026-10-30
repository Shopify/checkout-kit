import PassKit
import ShopifyCheckoutKit
import SwiftUI

/// A view that displays an Apple Pay button for checkout
@available(iOS 16.0, *)
@available(macOS, unavailable)
struct ApplePayButton: View {
    /// The configuration for Apple Pay
    @Environment(\.shopifyAcceleratedCheckoutsConfiguration)
    private var configuration: ShopifyAcceleratedCheckouts.Configuration?

    /// The shop settings
    @EnvironmentObject
    private var shopSettings: ShopSettings

    @Environment(\.shopifyApplePayConfiguration)
    private var applePayConfiguration: ShopifyAcceleratedCheckouts.ApplePayConfiguration?

    /// The source used to obtain a cart for checkout
    private let cartSource: CartSource

    /// The event handlers for checkout events
    private let eventHandlers: EventHandlers

    /// The Apple Pay button type
    private let buttonType: PKPaymentButtonType

    /// The Apple Pay button style
    private let buttonStyle: PKPaymentButtonStyle

    /// The corner radius for the button
    private let cornerRadius: CGFloat?

    private let buttonHeight: CGFloat

    init(
        identifier: CheckoutIdentifier,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight,
        buttonType: PKPaymentButtonType = .plain,
        buttonStyle: PKPaymentButtonStyle = .automatic
    ) {
        cartSource = .cart(identifier.parse())
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
        self.buttonType = buttonType
        self.buttonStyle = buttonStyle
    }

    init(
        cartSource: CartSource,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight,
        buttonType: PKPaymentButtonType = .plain,
        buttonStyle: PKPaymentButtonStyle = .automatic
    ) {
        self.cartSource = cartSource
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
        self.buttonType = buttonType
        self.buttonStyle = buttonStyle
    }

    var body: some View {
        if cartSource.isValid() {
            Internal_ApplePayButton(
                cartSource: cartSource,
                buttonType: buttonType,
                buttonStyle: buttonStyle,
                configuration: ApplePayConfigurationWrapper(
                    common: resolvedConfiguration,
                    applePay: resolvedApplePayConfiguration,
                    shopSettings: shopSettings
                ),
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

    private var resolvedApplePayConfiguration: ShopifyAcceleratedCheckouts.ApplePayConfiguration {
        guard let applePayConfiguration else {
            fatalError("Missing ShopifyAcceleratedCheckouts.ApplePayConfiguration. Add .environment(\\.shopifyApplePayConfiguration, ...) to an ancestor view.")
        }
        return applePayConfiguration
    }
}

/// A view that displays an Apple Pay button for checkout
/// This is an internal view to allow Environment injection of the shared configuration app wide
@available(iOS 16.0, *)
@available(macOS, unavailable)
@MainActor
struct Internal_ApplePayButton: View {
    private let buttonType: PKPaymentButtonType
    private let buttonStyle: PKPaymentButtonStyle
    @State private var attempt = WalletButtonAttempt()
    private let cartSource: CartSource
    private let eventHandlers: EventHandlers
    private let configuration: ApplePayConfigurationWrapper
    private let cornerRadius: CGFloat?
    private let buttonHeight: CGFloat
    @Environment(\.colorScheme) private var colorScheme

    func buttonIdentity(colorScheme: ColorScheme) -> String {
        return "\(colorScheme)-\(buttonType.rawValue)-\(buttonStyle.rawValue)"
    }

    init(
        identifier: CheckoutIdentifier,
        buttonType: PKPaymentButtonType,
        buttonStyle: PKPaymentButtonStyle,
        configuration: ApplePayConfigurationWrapper,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight
    ) {
        self.buttonType = buttonType
        self.buttonStyle = buttonStyle
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
        self.configuration = configuration
        cartSource = .cart(identifier)
        self.eventHandlers = eventHandlers
    }

    init(
        cartSource: CartSource,
        buttonType: PKPaymentButtonType,
        buttonStyle: PKPaymentButtonStyle,
        configuration: ApplePayConfigurationWrapper,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonHeight: CGFloat = WalletButtonHeight.defaultHeight
    ) {
        self.buttonType = buttonType
        self.buttonStyle = buttonStyle
        self.cornerRadius = cornerRadius
        self.buttonHeight = buttonHeight
        self.configuration = configuration
        self.cartSource = cartSource
        self.eventHandlers = eventHandlers
    }

    var body: some View {
        if PKPaymentAuthorizationController.canMakePayments() {
            ApplePayButtonRepresentable(
                buttonType: buttonType,
                buttonStyle: buttonStyle,
                cornerRadius: cornerRadius ?? 8,
                action: {
                    Task { @MainActor in
                        // Check the retained attempt before creating a fresh controller for this tap.
                        guard attempt.controller?.isStartingCheckout != true else { return }
                        let controller = ApplePayViewController(
                            cartSource: cartSource,
                            configuration: configuration
                        )
                        controller.eventHandlers = eventHandlers
                        controller.onCheckoutFail = eventHandlers.checkoutDidFail
                        controller.onCheckoutDismiss = eventHandlers.checkoutDidDismiss
                        attempt.controller = controller
                        await controller.onPress()
                    }
                }
            )
            .id(buttonIdentity(colorScheme: colorScheme))
            .frame(height: buttonHeight)
        } else {
            Text("errors.applePay.unsupported".localizedString)
        }
    }
}
