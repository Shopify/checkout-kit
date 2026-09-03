import ApolloAPI
import Foundation
import UIKit

@MainActor
struct E2ESampleAppTarget: E2ECommandTarget {
    func selectBuyerIdentityMode(_ mode: BuyerIdentityMode) async {
        appConfiguration.buyerIdentityMode = mode
    }

    func resetCart() async {
        CartManager.shared.resetCart()
    }

    func variantId(atProductIndex index: Int) async throws -> String {
        let network = Network.shared

        let query = Storefront.GetProductsQuery(
            first: .some(Int32(index + 1)),
            after: .none,
            country: network.countryCode,
            language: network.languageCode
        )

        let response = try await network.apollo.fetch(query: query)
        let products = response.data?.products.nodes ?? []

        guard index < products.count, let variantId = products[index].variants.nodes.first?.id else {
            throw E2EControllerError.productIndexOutOfRange(index)
        }

        return variantId
    }

    func addCartLine(variantId: String, quantity: Int) async throws {
        let cart = try await CartManager.shared.performCartLinesAdd(variant: variantId)

        guard quantity > 1, let lineId = cart.lines.nodes.first?.id else {
            return
        }

        _ = try await CartManager.shared.performCartLinesUpdate(id: lineId, quantity: quantity)
    }

    func showCart() async {
        let sceneDelegate = UIApplication.shared.connectedScenes
            .compactMap { $0.delegate as? SceneDelegate }
            .first

        sceneDelegate?.navigateTo(.cart)
    }

    func report(failure message: String) async {
        print("[E2E] \(message)")
    }
}
