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

    /// The identifier to use for checkout
    private let identifier: CheckoutIdentifier

    /// The event handlers for checkout events
    private let eventHandlers: EventHandlers

    /// The Apple Pay button type
    private let buttonType: PKPaymentButtonType

    /// The Apple Pay button style
    private let buttonStyle: PKPaymentButtonStyle

    /// The corner radius for the button
    private let cornerRadius: CGFloat?

    private let clientContainer: CheckoutProtocolClientContainer

    init(
        identifier: CheckoutIdentifier,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        buttonType: PKPaymentButtonType = .plain,
        buttonStyle: PKPaymentButtonStyle = .automatic,
        client: (any CheckoutCommunicationProtocol)? = nil
    ) {
        self.identifier = identifier.parse()
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.buttonType = buttonType
        self.buttonStyle = buttonStyle
        clientContainer = CheckoutProtocolClientContainer(client)
    }

    var body: some View {
        switch identifier {
        case .invariant:
            EmptyView()
        default:
            Internal_ApplePayButton(
                identifier: identifier,
                buttonType: buttonType,
                buttonStyle: buttonStyle,
                configuration: ApplePayConfigurationWrapper(
                    common: resolvedConfiguration,
                    applePay: resolvedApplePayConfiguration,
                    shopSettings: shopSettings
                ),
                eventHandlers: eventHandlers,
                cornerRadius: cornerRadius,
                client: clientContainer.client
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
    private let controller: ApplePayViewController
    private let cornerRadius: CGFloat?
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
        client: (any CheckoutCommunicationProtocol)? = nil
    ) {
        controller = ApplePayViewController(
            identifier: identifier,
            configuration: configuration,
            client: client
        )
        self.buttonType = buttonType
        self.buttonStyle = buttonStyle
        self.cornerRadius = cornerRadius
        controller.onCheckoutFail = eventHandlers.checkoutDidFail
        controller.onCheckoutDismiss = eventHandlers.checkoutDidDismiss
    }

    var body: some View {
        if PKPaymentAuthorizationController.canMakePayments() {
            ApplePayButtonRepresentable(
                buttonType: buttonType,
                buttonStyle: buttonStyle,
                cornerRadius: cornerRadius ?? 8,
                action: { Task { @MainActor in await controller.onPress() } }
            )
            .id(buttonIdentity(colorScheme: colorScheme))
            .frame(height: 48)
        } else {
            Text("errors.applePay.unsupported".localizedString)
        }
    }
}
