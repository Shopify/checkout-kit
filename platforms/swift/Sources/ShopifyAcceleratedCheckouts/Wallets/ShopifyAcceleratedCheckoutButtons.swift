import PassKit
import ShopifyCheckoutKit
import SwiftUI

/// Render state for ShopifyAcceleratedCheckoutButtons
public enum RenderState: Equatable {
    case loading
    case rendered
    case error(reason: String)
}

/// Renders accelerated checkout buttons for an app-owned Storefront cart
///
/// Note:
/// - The `wallets` modifier can be used to limit the buttons rendered
/// - The order of the buttons is the same as the order of the `wallets` modifier
/// - omission of the `wallets` modifier will render all buttons
@available(iOS 16.0, *)
public struct ShopifyAcceleratedCheckoutButtons: View {
    @Environment(\.shopifyAcceleratedCheckoutsConfiguration)
    private var configuration: ShopifyAcceleratedCheckouts.Configuration?

    let cartSource: CartSource
    let buyNowContext: BuyNowContext?
    public var wallets: [Wallet] = [.shopPay, .applePay]
    var eventHandlers: EventHandlers = .init()
    var cornerRadius: CGFloat?
    var buttonHeight: CGFloat?

    /// The Apple Pay button type
    private var applePayButtonType: PKPaymentButtonType = .plain
    private var applePayButtonStyle: PKPaymentButtonStyle = .automatic

    @State private var shopSettings: ShopSettings?
    @State private var currentRenderState: RenderState = .loading {
        didSet {
            eventHandlers.renderStateDidChange?(currentRenderState)
        }
    }

    /// Initializes accelerated checkout buttons with an existing cart ID.
    /// - Parameters:
    ///   - cartID: The Storefront cart ID (must start with gid://shopify/Cart/)
    public init(cartID: String) {
        let identifier = CheckoutIdentifier.cart(cartID: cartID).parse()
        cartSource = .cart(identifier)
        buyNowContext = nil
        if case let .invariant(reason) = identifier {
            ShopifyAcceleratedCheckouts.logger.error(reason)
            _currentRenderState = State(initialValue: .error(reason: reason))
        }
    }

    /// Initializes Buy Now accelerated checkout buttons that ask the app for its cart when the buyer taps.
    ///
    /// The selected variant describes the product being purchased and gives Checkout Kit product context it can use
    /// to determine wallet-button eligibility. Checkout Kit calls `getCart` once per accepted wallet tap, never while
    /// rendering. The app owns cart creation, reuse, variants, quantities, and buyer identity. If a cart should use
    /// an authenticated buyer's identity, set it, including the customer access token, before returning its ID.
    /// ``ShopifyAcceleratedCheckouts/Configuration/customer`` is applied by later wallet buyer-identity updates and
    /// does not initialize an app-provided cart.
    ///
    /// - Return ``CartResult/cart(_:)`` with the Storefront cart ID to continue.
    /// - Return ``CartResult/failed`` when the app has already handled the failure. No wallet opens and
    ///   ``onFail(_:)`` isn't called.
    /// - Throw an error when Checkout Kit should report the failed attempt through ``onFail(_:)``. A thrown
    ///   `CancellationError` is treated like any other thrown error; return ``CartResult/failed`` for a
    ///   merchant-handled cancellation.
    ///
    /// ```swift
    /// ShopifyAcceleratedCheckoutButtons(variantID: variantID) { request in
    ///     .cart(try await cartStore.prepareBuyNowCart(variantID: variantID, quantity: 1))
    /// }
    /// ```
    ///
    /// - Parameters:
    ///   - variantID: The currently selected Storefront product variant ID.
    ///   - getCart: Returns the cart result for this attempt.
    public init(
        variantID: String,
        getCart: @escaping @MainActor (CartRequest) async throws -> CartResult
    ) {
        cartSource = .provider(getCart)
        buyNowContext = BuyNowContext(variantID: variantID)
    }

    public var body: some View {
        VStack {
            if let shopSettings {
                VStack {
                    ForEach(wallets, id: \.self) { wallet in
                        switch wallet {
                        case .applePay:
                            ApplePayButton(
                                cartSource: cartSource,
                                eventHandlers: eventHandlers,
                                cornerRadius: cornerRadius,
                                buttonHeight: resolvedButtonHeight,
                                buttonType: applePayButtonType,
                                buttonStyle: applePayButtonStyle
                            )
                        case .shopPay:
                            ShopPayButton(
                                cartSource: cartSource,
                                eventHandlers: eventHandlers,
                                cornerRadius: cornerRadius,
                                buttonHeight: resolvedButtonHeight
                            )
                        default:
                            EmptyView()
                        }
                    }
                }.environmentObject(shopSettings)
            }
        }
        .task { await loadShopSettings() }
        .onAppear {
            eventHandlers.renderStateDidChange?(currentRenderState)
        }
    }

    /// The height each wallet button renders at.
    public var resolvedButtonHeight: CGFloat {
        WalletButtonHeight.resolve(buttonHeight)
    }

    private var resolvedConfiguration: ShopifyAcceleratedCheckouts.Configuration {
        guard let configuration else {
            fatalError("Missing ShopifyAcceleratedCheckouts.Configuration. Add .environment(\\.shopifyAcceleratedCheckoutsConfiguration, ...) to an ancestor view.")
        }
        return configuration
    }

    private func loadShopSettings() async {
        guard cartSource.isValid() else { return }

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

// MARK: ShopifyAcceleratedCheckoutButtons Modifiers

@available(iOS 16.0, *)
extension ShopifyAcceleratedCheckoutButtons {
    public func applePayButtonType(_ type: PKPaymentButtonType) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.applePayButtonType = type
        return view
    }

    public func applePayButtonStyle(_ style: PKPaymentButtonStyle) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.applePayButtonStyle = style
        return view
    }

    /// Modifies the wallet options supported
    /// Defaults: [.applePay]
    public func wallets(_ wallets: [Wallet]) -> ShopifyAcceleratedCheckoutButtons {
        var newView = self
        newView.wallets = wallets
        return newView
    }

    /// Sets the corner radius for all checkout buttons
    ///
    /// Use this modifier to customize the corner radius of the buttons:
    ///
    /// ```swift
    /// ShopifyAcceleratedCheckoutButtons(cartID: cartId)
    ///     .cornerRadius(12)
    /// ```
    ///
    /// - Parameter radius: The corner radius to apply to all buttons (default: 8). Negative values will use the default.
    /// - Returns: A view with the custom corner radius applied
    public func cornerRadius(_ radius: CGFloat) -> ShopifyAcceleratedCheckoutButtons {
        var newView = self
        newView.cornerRadius = radius
        return newView
    }

    /// Sets the height of all wallet buttons.
    ///
    /// ```swift
    /// ShopifyAcceleratedCheckoutButtons(cartID: cartId)
    ///     .buttonHeight(56)
    /// ```
    ///
    /// - Parameter height: The button height (default: 48). Values are clamped to 30–64; zero, negative, or non-finite values use the default.
    /// - Returns: A view with the custom button height applied
    public func buttonHeight(_ height: CGFloat) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.buttonHeight = height
        return view
    }

    /// Called when a checkout presented by an accelerated button starts.
    public func onStart(_ action: @escaping (CheckoutStartEvent) -> Void) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.eventHandlers.checkoutDidStart = action
        return view
    }

    /// Called when the buyer-visible state of a presented checkout changes.
    public func onUpdate(_ action: @escaping (CheckoutUpdateEvent) -> Void) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.eventHandlers.checkoutDidUpdate = action
        return view
    }

    /// Called when a presented checkout completes.
    public func onComplete(_ action: @escaping (CheckoutCompleteEvent) -> Void) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.eventHandlers.checkoutDidComplete = action
        return view
    }

    /// Chooses how to handle a link clicked in a presented checkout.
    public func onLinkClick(_ action: @escaping (CheckoutLink) -> CheckoutLinkAction) -> ShopifyAcceleratedCheckoutButtons {
        var view = self
        view.eventHandlers.checkoutAction = action
        return view
    }

    /// Adds an action to perform when the checkout encounters an error.
    ///
    /// Use this modifier to handle checkout errors:
    ///
    /// ```swift
    /// ShopifyAcceleratedCheckoutButtons(cartID: cartId)
    ///     .onFail { error in
    ///         // Show error alert with details
    ///         showErrorAlert(error: error)
    ///     }
    /// ```
    ///
    /// - Parameter action: The action to perform when checkout fails
    /// - Returns: A view with the checkout error handler set
    public func onFail(_ action: @escaping (CheckoutError) -> Void) -> ShopifyAcceleratedCheckoutButtons {
        var newView = self
        newView.eventHandlers.checkoutDidFail = action
        return newView
    }

    /// Adds an action to perform after the accelerated checkout presentation closes.
    ///
    /// Dismissal describes presentation lifecycle independently of checkout outcome. When a
    /// terminal failure closes checkout, the `onFail` action runs before this action.
    ///
    /// Use this modifier to handle checkout dismissal:
    ///
    /// ```swift
    /// ShopifyAcceleratedCheckoutButtons(cartID: cartId)
    ///     .onDismiss {
    ///         // Reset checkout presentation state
    ///         resetCheckoutState()
    ///     }
    /// ```
    ///
    /// - Parameter action: The action to perform after the checkout presentation closes
    /// - Returns: A view with the checkout dismissal handler set
    public func onDismiss(_ action: @escaping () -> Void) -> ShopifyAcceleratedCheckoutButtons {
        var newView = self
        newView.eventHandlers.checkoutDidDismiss = action
        return newView
    }

    /// Adds an action to perform when the render state changes.
    ///
    /// Use this modifier to handle render state changes:
    ///
    /// ```swift
    /// ShopifyAcceleratedCheckoutButtons(cartID: cartId)
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
        -> ShopifyAcceleratedCheckoutButtons
    {
        var newView = self
        newView.eventHandlers.renderStateDidChange = action
        return newView
    }
}

/// Use `ShopifyAcceleratedCheckoutButtons` instead.
@available(iOS 16.0, *)
@available(*, deprecated, renamed: "ShopifyAcceleratedCheckoutButtons")
public typealias AcceleratedCheckoutButtons = ShopifyAcceleratedCheckoutButtons
