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
            identifier: identifier,
            storefront: StorefrontAPI(
                storefrontDomain: configuration.storefrontDomain,
                storefrontAccessToken: configuration.storefrontAccessToken
            ),
            configuration: configuration
        )
        self.eventHandlers = eventHandlers
        self.identifier = identifier.parse()
    }

    func onPress() async {
        do {
            let cart = try await fetchCartByCheckoutIdentifier()
            guard let url = cart.checkoutUrl.url.appendQueryParam(name: "payment", value: "shop_pay") else {
                throw ShopifyAcceleratedCheckouts.Error.invariant(expected: "url")
            }
            try await present(url: url)
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
