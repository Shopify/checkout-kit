import ShopifyCheckoutKit
import SwiftUI

@available(iOS 16.0, *)
@MainActor
class WalletController: ObservableObject, @unchecked Sendable {
    @Published var identifier: CheckoutIdentifier
    @Published var storefront: StorefrontAPIProtocol
    @Published var checkoutViewController: CheckoutViewController?
    @Published var configuration: ShopifyAcceleratedCheckouts.Configuration

    init(identifier: CheckoutIdentifier, storefront: StorefrontAPIProtocol, configuration: ShopifyAcceleratedCheckouts.Configuration) {
        self.identifier = identifier
        self.storefront = storefront
        self.configuration = configuration
    }

    func fetchCartByCheckoutIdentifier() async throws -> StorefrontAPI.Types.Cart {
        switch identifier {
        case let .cart(id):
            guard let cart = try await storefront.cart(by: GraphQLScalars.ID(id)) else {
                throw ShopifyAcceleratedCheckouts.Error.cartAcquisition(identifier: identifier)
            }
            return cart

        case let .variant(id, quantity):
            let items = Array(repeating: GraphQLScalars.ID(id), count: quantity)
            return try await storefront.cartCreate(
                with: items,
                customer: configuration.customer
            )

        case .invariant:
            throw ShopifyAcceleratedCheckouts.Error.cartAcquisition(identifier: identifier)
        }
    }

    func present(url: URL, client: (any CheckoutCommunicationProtocol)?) async throws {
        guard let topViewController = getTopViewController() else {
            throw ShopifyAcceleratedCheckouts.Error.invariant(expected: "topViewController")
        }
        checkoutViewController = ShopifyCheckoutKit.present(
            checkout: url,
            from: topViewController,
            entryPoint: .acceleratedCheckouts,
            client: client
        )
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
