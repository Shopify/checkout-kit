import ShopifyCheckoutKit
import SwiftUI

@available(iOS 16.0, *)
@MainActor
class ShopPayViewController: WalletController {
    var eventHandlers: EventHandlers
    var client: (any CheckoutCommunicationProtocol)?

    override var checkoutDelegate: (any CheckoutDelegate)? {
        self
    }

    init(
        identifier: CheckoutIdentifier,
        configuration: ShopifyAcceleratedCheckouts.Configuration,
        eventHandlers: EventHandlers = EventHandlers()
    ) {
        self.eventHandlers = eventHandlers
        super.init(
            identifier: identifier,
            storefront: StorefrontAPI(
                storefrontDomain: configuration.storefrontDomain,
                storefrontAccessToken: configuration.storefrontAccessToken
            ),
            configuration: configuration
        )
        self.identifier = identifier.parse()
    }

    func onPress() async {
        do {
            let cart = try await fetchCartByCheckoutIdentifier()
            guard let url = cart.checkoutUrl.url.appendQueryParam(name: "payment", value: "shop_pay") else {
                throw ShopifyAcceleratedCheckouts.Error.invariant(expected: "url")
            }
            try await present(url: url, client: client)
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

@available(iOS 16.0, *)
extension ShopPayViewController: CheckoutDelegate {
    nonisolated func checkoutDidDismiss() {
        MainActor.assumeIsolated {
            eventHandlers.checkoutDidDismiss?()
        }
    }

    nonisolated func checkoutDidFail(error: CheckoutError) {
        MainActor.assumeIsolated {
            eventHandlers.checkoutDidFail?(error)
        }
    }
}
