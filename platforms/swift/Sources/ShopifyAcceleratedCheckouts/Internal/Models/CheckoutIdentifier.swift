// MARK: Identifier helpers

/// Names the closure that supplies the app's Storefront cart result for one accepted checkout attempt.
typealias CartProvider = @MainActor (CartRequest) async throws -> CartResult

/// Signals that an app has handled its cart-request failure and the wallet attempt should end quietly.
struct HandledCartRequestFailure: Error {}

/// Resolves the Storefront cart a checkout attempt starts from.
enum CartSource {
    /// A cart ID for a cart page, where the cart already exists when the buttons are created.
    case cart(CheckoutIdentifier)
    /// A cart ID resolved by the app after the buyer taps a wallet button, such as on a product Buy Now page.
    case provider(CartProvider)

    func isValid() -> Bool {
        guard case let .cart(identifier) = self else { return true }
        return identifier.isValid()
    }

    /// Resolves the cart for one checkout attempt.
    /// A provider is called exactly once per call; its cart ID is validated like a fixed cart ID.
    @MainActor
    func resolve(for request: CartRequest) async throws -> CheckoutIdentifier {
        switch self {
        case let .cart(identifier):
            return identifier.parse()
        case let .provider(provider):
            let result = try await provider(request)
            guard let cartID = result.resolvedCartID else {
                throw HandledCartRequestFailure()
            }
            return CheckoutIdentifier.cart(cartID: cartID).parse()
        }
    }
}

/// Identifies a Storefront cart.
enum CheckoutIdentifier {
    case cart(cartID: String)
    case invariant(reason: String)

    static let cartPrefix = "gid://Shopify/Cart/"

    var diagnosticCartID: String? {
        guard case let .cart(cartID) = parse() else { return nil }
        return String(cartID.prefix { $0 != "?" && $0 != "#" })
    }

    /// Checks for valid ID signature,
    /// Returns false if validation fails. A provider is validated when it is resolved.
    func isValid() -> Bool {
        if case .invariant = parse() {
            return false
        }
        return true
    }

    /// Checks the `id` component is a valid shopify identifier
    /// Returns `self` if parsing was succesful
    /// Returns `.invariant` if parsing fails
    func parse() -> CheckoutIdentifier {
        switch self {
        case let .cart(cartID):
            guard cartID.lowercased().hasPrefix(Self.cartPrefix.lowercased()) else {
                return .invariant(
                    reason:
                    "[invariant_violation] Invalid 'cartID' format. Expected to start with '\(Self.cartPrefix)'"
                )
            }
            return self

        case .invariant:
            return self
        }
    }
}
