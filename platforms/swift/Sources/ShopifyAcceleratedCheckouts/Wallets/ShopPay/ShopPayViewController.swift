import ShopifyCheckoutKit
import SwiftUI

@available(iOS 16.0, *)
@MainActor
class ShopPayViewController: WalletController {
    init(
        identifier: CheckoutIdentifier,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers()
    ) {
        super.init(
            cartSource: .cart(identifier),
            storefront: StorefrontAPI(
                storefrontDomain: configuration.storefrontDomain,
                storefrontAccessToken: configuration.storefrontAccessToken
            ),
            configuration: configuration
        )
        self.eventHandlers = eventHandlers
    }

    convenience init(
        cartSource: CartSource,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers()
    ) {
        self.init(
            identifier: .invariant(reason: "Cart source has not been resolved"),
            configuration: configuration,
            eventHandlers: eventHandlers
        )
        self.cartSource = cartSource
    }

    func onPress() async {
        guard !isStartingCheckout else { return }
        isStartingCheckout = true
        defer { isStartingCheckout = false }
        do {
            let cart = try await fetchCartByCheckoutIdentifier(wallet: .shopPay)
            guard let url = cart.checkoutUrl.url.appendQueryParam(name: "payment", value: "shop_pay") else {
                throw ShopifyAcceleratedCheckouts.Error.invariant(expected: "url")
            }
            try await present(url: url)
        } catch is HandledCartRequestFailure {
            ShopifyAcceleratedCheckouts.logger.debug("[present] Cart request was handled by the app")
        } catch {
            let error = CheckoutError(
                code: .sdkError,
                message: error.localizedDescription,
                underlyingError: error
            )
            ShopifyAcceleratedCheckouts.logger.error("[present] Failed to create cart: \(error)")
            eventHandlers.checkoutDidFail?(error)
        }
    }
}
