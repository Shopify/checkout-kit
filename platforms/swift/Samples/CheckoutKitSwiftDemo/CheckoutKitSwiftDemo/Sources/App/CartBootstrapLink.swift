import Foundation

struct CartBootstrapLink {
    let variantId: String?
    let productIndex: Int?
    let quantity: Int

    private static let scheme = "checkout-kit-swift"
    private static let host = "cart"

    static func parse(_ url: URL) throws -> CartBootstrapLink? {
        guard url.scheme == scheme else { return nil }

        guard url.host == host else {
            throw CartBootstrapError.unsupportedPath
        }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let queryItems = components?.queryItems ?? []

        func queryValue(_ name: String) -> String? {
            return queryItems
                .first(where: { $0.name == name })?
                .value?
                .trimmingCharacters(in: .whitespacesAndNewlines)
        }

        let variantId = queryValue("variantId")
        let productIndexParam = queryValue("productIndex")
        let quantityParam = queryValue("quantity") ?? "1"

        guard let quantity = Int(quantityParam), quantity > 0 else {
            throw CartBootstrapError.invalidQuantity
        }

        if variantId?.isEmpty == false, productIndexParam?.isEmpty == false {
            throw CartBootstrapError.ambiguousVariant
        }

        if let variantId, !variantId.isEmpty {
            return CartBootstrapLink(variantId: variantId, productIndex: nil, quantity: quantity)
        }

        guard let productIndexParam, !productIndexParam.isEmpty else {
            throw CartBootstrapError.missingVariant
        }

        guard let productIndex = Int(productIndexParam), productIndex >= 0 else {
            throw CartBootstrapError.invalidProductIndex
        }

        return CartBootstrapLink(variantId: nil, productIndex: productIndex, quantity: quantity)
    }
}

enum CartBootstrapError: LocalizedError {
    case unsupportedPath
    case missingVariant
    case ambiguousVariant
    case invalidQuantity
    case invalidProductIndex
    case productVariantNotFound

    var errorDescription: String? {
        switch self {
        case .unsupportedPath:
            return "Unsupported cart bootstrap path"
        case .missingVariant:
            return "Missing variantId or productIndex"
        case .ambiguousVariant:
            return "Use variantId or productIndex, not both"
        case .invalidQuantity:
            return "quantity must be a positive integer"
        case .invalidProductIndex:
            return "productIndex must be a non-negative integer"
        case .productVariantNotFound:
            return "Cart bootstrap product variant was not found"
        }
    }
}
