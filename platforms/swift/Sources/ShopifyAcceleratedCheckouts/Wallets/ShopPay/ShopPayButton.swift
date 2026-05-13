import ShopifyCheckoutKit
import SwiftUI

@available(iOS 16.0, *)
internal struct ShopPayButton: View {
    @Environment(\.shopifyAcceleratedCheckoutsConfiguration)
    private var configuration: ShopifyAcceleratedCheckouts.Configuration?

    let identifier: CheckoutIdentifier
    let eventHandlers: EventHandlers
    let cornerRadius: CGFloat?
    let clientContainer: CheckoutProtocolClientContainer

    init(
        identifier: CheckoutIdentifier,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        client: (any CheckoutCommunicationProtocol)? = nil
    ) {
        self.identifier = identifier.parse()
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
        clientContainer = CheckoutProtocolClientContainer(client)
    }

    var body: some View {
        switch identifier {
        case .invariant:
            EmptyView()
        default:
            Internal_ShopPayButton(
                identifier: identifier,
                configuration: resolvedConfiguration,
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
}

/// Internal_ wrapper component allows `ShopifyAcceleratedCheckouts.Configuration` to be
/// DI into ShopPayViewController at init, avoiding optionality checks through ViewController
@available(iOS 16.0, *)
@MainActor
internal struct Internal_ShopPayButton: View {
    private var controller: ShopPayViewController
    private let cornerRadius: CGFloat?

    init(
        identifier: CheckoutIdentifier,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?,
        client: (any CheckoutCommunicationProtocol)? = nil
    ) {
        controller = ShopPayViewController(
            identifier: identifier,
            configuration: configuration,
            eventHandlers: eventHandlers
        )
        self.cornerRadius = cornerRadius
        controller.client = client
    }

    var body: some View {
        Button(
            action: {
                Task { @MainActor in await controller.onPress() }
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
                .frame(height: 48)
                // This ensures that the blue background is clickable
                .background(Color.shopPayBlue)
            }
        )
        .walletButtonStyle(bg: Color.shopPayBlue, cornerRadius: cornerRadius)
        .buttonStyle(ContentFadeButtonStyle())
    }
}
