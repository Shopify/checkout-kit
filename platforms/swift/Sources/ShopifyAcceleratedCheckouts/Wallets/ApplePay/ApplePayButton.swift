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

    /// The Apple Pay button label style
    private var label: PayWithApplePayButtonLabel = .plain

    /// The Apple Pay button style
    private var style: PayWithApplePayButtonStyle = .automatic

    /// The corner radius for the button
    private let cornerRadius: CGFloat?

    private let clientContainer: CheckoutProtocolClientContainer

    init(
        identifier: CheckoutIdentifier,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        style: PayWithApplePayButtonStyle = .automatic,
        client: (any CheckoutCommunicationProtocol)? = nil
    ) {
        self.identifier = identifier.parse()
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        self.style = style
        clientContainer = CheckoutProtocolClientContainer(client)
    }

    var body: some View {
        switch identifier {
        case .invariant:
            EmptyView()
        default:
            Internal_ApplePayButton(
                identifier: identifier,
                label: label,
                style: style,
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

    func applePayStyle(_ style: PayWithApplePayButtonStyle) -> some View {
        var view = self
        view.style = style
        return view
    }

    func label(_ label: PayWithApplePayButtonLabel) -> some View {
        var view = self
        view.label = label
        return view
    }
}

/// A view that displays an Apple Pay button for checkout
/// This is an internal view to allow Environment injection of the shared configuration app wide
@available(iOS 16.0, *)
@available(macOS, unavailable)
struct Internal_ApplePayButton: View {
    private let label: PayWithApplePayButtonLabel
    private let style: PayWithApplePayButtonStyle
    private let controller: ApplePayViewController
    private let cornerRadius: CGFloat?
    @Environment(\.colorScheme) private var colorScheme

    init(
        identifier: CheckoutIdentifier,
        label: PayWithApplePayButtonLabel,
        style: PayWithApplePayButtonStyle,
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
        self.label = label
        self.style = style
        self.cornerRadius = cornerRadius
        controller.onCheckoutFail = eventHandlers.checkoutDidFail
        controller.onCheckoutCancel = eventHandlers.checkoutDidCancel
    }

    var body: some View {
        if PKPaymentAuthorizationController.canMakePayments() {
            ApplePayButtonRepresentable(
                buttonType: label.pkPaymentButtonType,
                buttonStyle: style.pkPaymentButtonStyle,
                cornerRadius: cornerRadius ?? 8,
                action: { Task { await controller.onPress() } }
            )
            .id("\(colorScheme)-\(style.pkPaymentButtonStyle.rawValue)")
            .frame(height: 48)
        } else {
            Text("errors.applePay.unsupported".localizedString)
        }
    }
}

// MARK: - Type Conversions

@available(iOS 16.0, *)
extension PayWithApplePayButtonStyle {
    var pkPaymentButtonStyle: PKPaymentButtonStyle {
        switch self {
        case .black: .black
        case .white: .white
        case .whiteOutline: .whiteOutline
        case .automatic: .automatic
        default: .automatic
        }
    }
}

@available(iOS 16.0, *)
extension PayWithApplePayButtonLabel {
    var pkPaymentButtonType: PKPaymentButtonType {
        switch self {
        case .buy: .buy
        case .setUp: .setUp
        case .inStore: .inStore
        case .donate: .donate
        case .checkout: .checkout
        case .book: .book
        case .subscribe: .subscribe
        case .reload: .reload
        case .addMoney: .addMoney
        case .topUp: .topUp
        case .order: .order
        case .rent: .rent
        case .support: .support
        case .contribute: .contribute
        case .tip: .tip
        default: .plain
        }
    }
}
