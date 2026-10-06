// MARK: Identifier helpers

/// Type of identifier used for checkout
enum CheckoutIdentifier {
    case variant(variantID: String, quantity: Int)
    case cart(cartID: String)
    case invariant(reason: String)

    var prefix: String {
        switch self {
        case .cart: "gid://Shopify/Cart/"
        case .variant: "gid://Shopify/ProductVariant/"
        default: "invariant"
        }
    }

    /// Checks for valid ID signature,
    /// Returns .invariant if validation fails
    func isValid() -> Bool {
        if case .invariant = parse() { return false }
        return true
    }

    /// Checks the `id` component is a valid shopify identifier
    /// Returns `self` if parsing was succesful
    /// Returns `.invariant` if parsing fails
    func parse() -> CheckoutIdentifier {
        switch self {
        case let .cart(cartID):
            guard cartID.lowercased().hasPrefix(prefix.lowercased()) else {
                return .invariant(
                    reason:
                    "[invariant_violation] Invalid 'cartID' format. Expected to start with '\(prefix)', received: '\(cartID)'"
                )
            }
            return self

        case let .variant(variantID, quantity):
            guard variantID.lowercased().hasPrefix(prefix.lowercased()) else {
                return .invariant(
                    reason:
                    "[invariant_violation] Invalid 'variantID' format. Expected to start with '\(prefix)', received: '\(variantID)'"
                )
            }
            guard quantity > 0 else {
                return .invariant(
                    reason:
                    "[invariant_violation] Quantity must be greater than 0, received: \(quantity)"
                )
            }
            return self

        default: return self
        }
    }
}
