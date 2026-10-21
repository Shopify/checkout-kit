/// Describes the wallet attempt that needs a cart.
///
/// Checkout Kit passes a `CartRequest` to the `getCart` closure of
/// ``ShopifyAcceleratedCheckoutButtons/init(variantID:getCart:)`` once per accepted wallet tap. New properties may be
/// added in future releases; the request has no public initializer.
public struct CartRequest: Sendable {
    /// The wallet the buyer tapped.
    public let wallet: Wallet
}

/// The selected product context for Buy Now buttons.
struct BuyNowContext: Equatable {
    let variantID: String
}

/// The outcome of an app-owned cart request.
///
/// Return ``failed`` when the app has handled a failure itself and Checkout Kit should end the wallet
/// attempt without presenting a wallet or reporting ``ShopifyAcceleratedCheckoutButtons/onFail(_:)``. Return a
/// cart ID with ``cart(_:)`` to continue the attempt.
///
/// This type deliberately has no public initializer so additional outcomes can be added without changing
/// the cart-provider closure signature.
public struct CartResult: Sendable {
    private let cartID: String?

    /// Continues the wallet attempt with this Storefront cart ID.
    public static func cart(_ id: String) -> Self {
        Self(cartID: id)
    }

    /// Ends the wallet attempt quietly after the app has handled the failure.
    public static let failed = Self(cartID: nil)

    var resolvedCartID: String? {
        cartID
    }
}
