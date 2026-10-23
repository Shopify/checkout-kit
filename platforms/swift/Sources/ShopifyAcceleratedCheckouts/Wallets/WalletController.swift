import ShopifyCheckoutKit
import SwiftUI

/// Retains the active controller across button redraws and shares its in-flight state between tap actions.
@available(iOS 16.0, *)
@MainActor
final class WalletButtonAttempt {
    var controller: WalletController?
}

@available(iOS 16.0, *)
@MainActor
class WalletController: ObservableObject, CheckoutDelegate {
    var eventHandlers: EventHandlers = .init()
    @Published var cartSource: CartSource
    @Published var storefront: StorefrontAPIProtocol
    @Published var checkoutViewController: CheckoutViewController?
    @Published var configuration: ShopifyAcceleratedCheckouts.Configuration
    /// True while an accepted tap is resolving the app's cart, so repeated taps don't call the provider again.
    var isStartingCheckout = false

    init(cartSource: CartSource, storefront: StorefrontAPIProtocol, configuration: ShopifyAcceleratedCheckouts.Configuration) {
        self.cartSource = cartSource
        self.storefront = storefront
        self.configuration = configuration
    }

    convenience init(identifier: CheckoutIdentifier, storefront: StorefrontAPIProtocol, configuration: ShopifyAcceleratedCheckouts.Configuration) {
        self.init(cartSource: .cart(identifier), storefront: storefront, configuration: configuration)
    }

    /// Resolves the app's cart for this attempt (calling its provider once, if any) and loads it.
    func fetchCartByCheckoutIdentifier(wallet: Wallet) async throws -> StorefrontAPI.Types.Cart {
        let resolved = try await cartSource.resolve(for: CartRequest(wallet: wallet))
        guard case let .cart(id) = resolved,
              let cart = try await storefront.cart(by: GraphQLScalars.ID(id))
        else {
            throw ShopifyAcceleratedCheckouts.Error.cartAcquisition(cartID: resolved.diagnosticCartID)
        }
        return cart
    }

    func present(url: URL) async throws {
        guard let topViewController = getTopViewController() else {
            throw ShopifyAcceleratedCheckouts.Error.invariant(expected: "topViewController")
        }
        checkoutViewController = ShopifyCheckout.present(
            checkout: url,
            from: topViewController,
            entryPoint: .acceleratedCheckouts,
            delegate: self
        )
    }

    func checkoutDidStart(_ event: CheckoutStartEvent) {
        eventHandlers.checkoutDidStart?(event)
    }

    func checkoutDidUpdate(_ event: CheckoutUpdateEvent) {
        eventHandlers.checkoutDidUpdate?(event)
    }

    func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
        eventHandlers.checkoutDidComplete?(event)
    }

    func checkoutAction(for link: CheckoutLink) -> CheckoutLinkAction {
        eventHandlers.checkoutAction?(link) ?? .default
    }

    func checkoutDidFail(_ event: CheckoutFailureEvent) {
        eventHandlers.checkoutDidFail?(event.error)
    }

    func checkoutDidDismiss() {
        eventHandlers.checkoutDidDismiss?()
    }

    func getTopViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first
        else {
            return nil
        }

        var topController = window.rootViewController
        while let presentedController = topController?.presentedViewController {
            topController = presentedController
        }
        return topController
    }
}
