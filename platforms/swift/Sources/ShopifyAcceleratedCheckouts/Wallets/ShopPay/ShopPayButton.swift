import ShopifyCheckoutKit
import SwiftUI

@available(iOS 16.0, *)
internal struct ShopPayButton: View {
    @Environment(\.shopifyAcceleratedCheckoutsConfiguration)
    private var configuration: ShopifyAcceleratedCheckouts.Configuration?

    let identifier: CheckoutIdentifier
    let eventHandlers: EventHandlers
    let cornerRadius: CGFloat?

    init(
        identifier: CheckoutIdentifier,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?
    ) {
        self.identifier = identifier.parse()
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
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
                cornerRadius: cornerRadius
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
    @State private var controller: ShopPayViewController?
    private let identifier: CheckoutIdentifier
    private let configuration: ShopifyAcceleratedCheckouts.Configuration
    private let eventHandlers: EventHandlers
    private let cornerRadius: CGFloat?

    init(
        identifier: CheckoutIdentifier,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers(),
        cornerRadius: CGFloat?
    ) {
        self.identifier = identifier
        self.configuration = configuration
        self.eventHandlers = eventHandlers
        self.cornerRadius = cornerRadius
    }

    var body: some View {
        Button(
            action: {
                Task { @MainActor in
                    let controller = ShopPayViewController(
                        identifier: identifier,
                        configuration: configuration,
                        eventHandlers: eventHandlers
                    )

                    // Retain the delegate while checkout events redraw the button's parent.
                    self.controller = controller
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
                .frame(height: 48)
                // This ensures that the blue background is clickable
                .background(Color.shopPayBlue)
            }
        )
        .walletButtonStyle(bg: Color.shopPayBlue, cornerRadius: cornerRadius)
        .buttonStyle(ContentFadeButtonStyle())
    }
}
