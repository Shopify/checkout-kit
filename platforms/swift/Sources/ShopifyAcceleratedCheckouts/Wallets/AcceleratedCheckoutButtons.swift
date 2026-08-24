import PassKit
import ShopifyCheckoutKit
import SwiftUI

/// Render state for AcceleratedCheckoutButtons
public enum RenderState: Equatable {
    case loading
    case rendered
    case error(reason: String)
}

@available(iOS 16.0, *)
extension ShopifyAcceleratedCheckouts {
    /// Controls how accelerated checkout buttons represent their initial loading state.
    public enum LoadingPresentation: Sendable, Equatable {
        /// Show neutral placeholders that match the configured wallet button layout.
        case automatic

        /// Render no loading UI. Use this when the containing app supplies its own loading state.
        case hidden
    }
}

/// Renders a Checkout buttons for a cart or product variant
///
/// Note:
/// - The `wallets` modifier can be used to limit the buttons rendered
/// - The order of the buttons is the same as the order of the `wallets` modifier
/// - omission of the `wallets` modifier will render all buttons
@available(iOS 16.0, *)
public struct AcceleratedCheckoutButtons: View {
    @Environment(\.shopifyAcceleratedCheckoutsConfiguration)
    private var configuration: ShopifyAcceleratedCheckouts.Configuration?

    let identifier: CheckoutIdentifier
    public var wallets: [Wallet] = [.shopPay, .applePay]
    var eventHandlers: EventHandlers = .init()
    var cornerRadius: CGFloat?
    var clientContainer: CheckoutProtocolClientContainer = .init()
    var loadingPresentation: ShopifyAcceleratedCheckouts.LoadingPresentation = .automatic

    /// The Apple Pay button type
    private var applePayButtonType: PKPaymentButtonType = .plain
    private var applePayButtonStyle: PKPaymentButtonStyle = .automatic

    @State private var shopSettings: ShopSettings?
    @State private var currentRenderState: RenderState = .loading {
        didSet {
            eventHandlers.renderStateDidChange?(currentRenderState)
        }
    }

    /// Initializes accelerated checkout buttons with a cart ID
    /// - Parameters:
    ///   - cartID: The cart ID to checkout (must start with gid://shopify/Cart/)
    public init(cartID: String) {
        identifier = .cart(cartID: cartID).parse()
        if case let .invariant(reason) = identifier {
            ShopifyAcceleratedCheckouts.logger.error(reason)
            _currentRenderState = State(initialValue: .error(reason: reason))
        }
    }

    /// Initializes accelerated checkout buttons with a variant ID
    /// - Parameters:
    ///  - variantID: The variant ID to checkout (must start with gid://shopify/ProductVariant/)
    ///  - quantity: The quantity of the variant to checkout
    public init(variantID: String, quantity: Int) {
        identifier = .variant(variantID: variantID, quantity: quantity).parse()
        if case let .invariant(reason) = identifier {
            _currentRenderState = State(initialValue: .error(reason: reason))
            ShopifyAcceleratedCheckouts.logger.error(reason)
        }
    }

    public var body: some View {
        VStack(spacing: WalletButtonLayout.spacing) {
            if let shopSettings {
                ForEach(wallets, id: \.self) {
                    switch $0 {
                    case .applePay:
                        ApplePayButton(
                            identifier: identifier,
                            eventHandlers: eventHandlers,
                            cornerRadius: cornerRadius,
                            buttonType: applePayButtonType,
                            buttonStyle: applePayButtonStyle,
                            client: clientContainer.client
                        )
                    case .shopPay:
                        ShopPayButton(
                            identifier: identifier,
                            eventHandlers: eventHandlers,
                            cornerRadius: cornerRadius,
                            client: clientContainer.client
                        )
                    }
                }
                .environmentObject(shopSettings)
            } else if currentRenderState == .loading, loadingPresentation == .automatic {
                ForEach(wallets, id: \.self) { _ in
                    WalletButtonSkeleton(cornerRadius: cornerRadius)
                }
            }
        }
        .task { await loadShopSettings() }
        .onAppear {
            eventHandlers.renderStateDidChange?(currentRenderState)
        }
    }

    private var resolvedConfiguration: ShopifyAcceleratedCheckouts.Configuration {
        guard let configuration else {
            fatalError("Missing ShopifyAcceleratedCheckouts.Configuration. Add .shopifyAcceleratedCheckouts(...) or .environment(\\.shopifyAcceleratedCheckoutsConfiguration, ...) to an ancestor view.")
        }
        return configuration
    }

    private func loadShopSettings() async {
        guard identifier.isValid() else { return }

        do {
            currentRenderState = .loading
            let configuration = resolvedConfiguration
            let storefront = StorefrontAPI(
                storefrontDomain: configuration.storefrontDomain,
                storefrontAccessToken: configuration.storefrontAccessToken
            )
            let shop = try await storefront.shop()
            shopSettings = ShopSettings(from: shop)
            currentRenderState = .rendered
        } catch {
            let reason = "Error loading shop settings: \(error)"
            ShopifyAcceleratedCheckouts.logger.error(reason)
            currentRenderState = .error(reason: reason)
        }
    }
}

// MARK: AcceleratedCheckoutButtons Modifiers

@available(iOS 16.0, *)
extension AcceleratedCheckoutButtons {
    /// Controls the loading UI shown while shop settings are being fetched.
    ///
    /// The default `.automatic` presentation renders neutral placeholders matching the
    /// number, height, spacing, and corner radius of the configured wallet buttons.
    /// Use `.hidden` when the containing app provides its own loading UI.
    public func loadingPresentation(
        _ presentation: ShopifyAcceleratedCheckouts.LoadingPresentation
    ) -> AcceleratedCheckoutButtons {
        var newView = self
        newView.loadingPresentation = presentation
        return newView
    }

    public func applePayButtonType(_ type: PKPaymentButtonType) -> AcceleratedCheckoutButtons {
        var view = self
        view.applePayButtonType = type
        return view
    }

    public func applePayButtonStyle(_ style: PKPaymentButtonStyle) -> AcceleratedCheckoutButtons {
        var view = self
        view.applePayButtonStyle = style
        return view
    }

    /// Modifies the wallet options supported
    /// Defaults: [.applePay]
    public func wallets(_ wallets: [Wallet]) -> AcceleratedCheckoutButtons {
        var newView = self
        newView.wallets = wallets
        return newView
    }

    /// Sets the corner radius for all checkout buttons
    ///
    /// Use this modifier to customize the corner radius of the buttons:
    ///
    /// ```swift
    /// AcceleratedCheckoutButtons(cartID: cartId)
    ///     .cornerRadius(12)
    /// ```
    ///
    /// - Parameter radius: The corner radius to apply to all buttons (default: 8). Negative values will use the default.
    /// - Returns: A view with the custom corner radius applied
    public func cornerRadius(_ radius: CGFloat) -> AcceleratedCheckoutButtons {
        var newView = self
        newView.cornerRadius = radius
        return newView
    }

    /// Adds an action to perform when the checkout encounters an error.
    ///
    /// Use this modifier to handle checkout errors:
    ///
    /// ```swift
    /// AcceleratedCheckoutButtons(cartID: cartId)
    ///     .onFail { error in
    ///         // Show error alert with details
    ///         showErrorAlert(error: error)
    ///     }
    /// ```
    ///
    /// - Parameter action: The action to perform when checkout fails
    /// - Returns: A view with the checkout error handler set
    public func onFail(_ action: @escaping (CheckoutError) -> Void) -> AcceleratedCheckoutButtons {
        var newView = self
        newView.eventHandlers.checkoutDidFail = action
        return newView
    }

    /// Adds an action to perform when the buyer dismisses the checkout experience.
    ///
    /// Use this modifier to handle checkout dismissal:
    ///
    /// ```swift
    /// AcceleratedCheckoutButtons(cartID: cartId)
    ///     .onDismiss {
    ///         // Reset checkout presentation state
    ///         resetCheckoutState()
    ///     }
    /// ```
    ///
    /// - Parameter action: The action to perform when the buyer dismisses checkout
    /// - Returns: A view with the checkout dismissal handler set
    public func onDismiss(_ action: @escaping () -> Void) -> AcceleratedCheckoutButtons {
        var newView = self
        newView.eventHandlers.checkoutDidDismiss = action
        return newView
    }

    /// Adds an action to perform when the render state changes.
    ///
    /// Use this modifier to handle render state changes:
    ///
    /// ```swift
    /// AcceleratedCheckoutButtons(cartID: cartId)
    ///     .onRenderStateChange { state in
    ///         switch state {
    ///         case .loading:
    ///             // Show skeleton loading state
    ///         case .rendered:
    ///             // Show rendered buttons
    ///         case .fallback:
    ///             // Show error fallback state
    ///         }
    ///     }
    /// ```
    ///
    /// - Parameter action: The action to perform when render state changes
    /// - Returns: A view with the render state change handler set
    public func onRenderStateChange(_ action: @escaping (RenderState) -> Void)
        -> AcceleratedCheckoutButtons
    {
        var newView = self
        newView.eventHandlers.renderStateDidChange = action
        return newView
    }

    public func connect(_ client: (any CheckoutCommunicationProtocol)?) -> AcceleratedCheckoutButtons {
        var newView = self
        newView.clientContainer = CheckoutProtocolClientContainer(client)
        return newView
    }
}
