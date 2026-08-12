import Foundation

enum E2EControlLinkError: LocalizedError, Equatable, Hashable {
    case unsupportedCommand
    case unknownParameters(command: String, names: [String])
    case missingProductSelector
    case ambiguousProductSelector
    case blankVariantId
    case invalidQuantity
    case invalidProductIndex
    case invalidBuyerIdentityMode
    case blankEmail

    var errorDescription: String? {
        switch self {
        case .unsupportedCommand:
            return "Unsupported e2e command"
        case let .unknownParameters(command, names):
            return "Unknown \(command) parameters: \(names.joined(separator: ", "))"
        case .missingProductSelector:
            return "Missing variantId or productIndex"
        case .ambiguousProductSelector:
            return "Use variantId or productIndex, not both"
        case .blankVariantId:
            return "variantId must not be blank"
        case .invalidQuantity:
            return "quantity must be a positive integer"
        case .invalidProductIndex:
            return "productIndex must be a non-negative integer"
        case .invalidBuyerIdentityMode:
            return "buyerIdentityMode must be guest, hardcoded, or customerAccount"
        case .blankEmail:
            return "email must not be blank"
        }
    }
}

enum E2EControlLink: Equatable {
    case reset
    case cart(CartCommand)
    case signIn(email: String?)

    struct CartCommand: Equatable {
        var variantId: String?
        var productIndex: Int?
        var quantity: Int = 1
        var buyerIdentityMode: BuyerIdentityMode?
    }

    static let host = "e2e"

    private static let schemeSeparator = "://"
    private static let parseOriginScheme = "https://"

    private static let resetParameters: Set<String> = []
    private static let cartParameters: Set<String> = ["variantId", "productIndex", "quantity", "buyerIdentityMode"]
    private static let signInParameters: Set<String> = ["email"]

    static func parse(_ url: String) throws -> E2EControlLink? {
        guard let separator = url.range(of: schemeSeparator) else {
            return nil
        }

        let authorityAndPath = String(url[separator.upperBound...])

        guard let components = URLComponents(string: parseOriginScheme + authorityAndPath),
              components.host == host
        else {
            return nil
        }

        let parameters = Parameters(percentEncoded: components.percentEncodedQueryItems)

        switch components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) {
        case "reset":
            try rejectUnknownParameters("reset", parameters, resetParameters)
            return .reset
        case "cart":
            try rejectUnknownParameters("cart", parameters, cartParameters)
            return try .cart(cartCommand(from: parameters))
        case "signIn":
            try rejectUnknownParameters("signIn", parameters, signInParameters)
            return try .signIn(email: signInEmail(from: parameters))
        default:
            throw E2EControlLinkError.unsupportedCommand
        }
    }

    private static func rejectUnknownParameters(
        _ command: String,
        _ parameters: Parameters,
        _ allowed: Set<String>
    ) throws {
        let unknown = parameters.names.filter { !allowed.contains($0) }.sorted()

        guard unknown.isEmpty else {
            throw E2EControlLinkError.unknownParameters(command: command, names: unknown)
        }
    }

    private static func cartCommand(from parameters: Parameters) throws -> CartCommand {
        guard !parameters.isEmpty else {
            throw E2EControlLinkError.missingProductSelector
        }

        let quantity = try quantity(from: parameters)
        let buyerIdentityMode = try buyerIdentityMode(from: parameters)

        if parameters.contains("variantId"), parameters.contains("productIndex") {
            throw E2EControlLinkError.ambiguousProductSelector
        }

        if let variantId = parameters.value("variantId") {
            guard !variantId.isEmpty else {
                throw E2EControlLinkError.blankVariantId
            }
            return CartCommand(variantId: variantId, quantity: quantity, buyerIdentityMode: buyerIdentityMode)
        }

        guard let productIndexParameter = parameters.value("productIndex") else {
            throw E2EControlLinkError.missingProductSelector
        }

        guard let productIndex = nonNegativeInteger(from: productIndexParameter) else {
            throw E2EControlLinkError.invalidProductIndex
        }

        return CartCommand(productIndex: productIndex, quantity: quantity, buyerIdentityMode: buyerIdentityMode)
    }

    private static func quantity(from parameters: Parameters) throws -> Int {
        guard let parameter = parameters.value("quantity") else {
            return 1
        }

        guard let quantity = nonNegativeInteger(from: parameter), quantity >= 1 else {
            throw E2EControlLinkError.invalidQuantity
        }

        return quantity
    }

    private static func nonNegativeInteger(from value: String) -> Int? {
        guard !value.isEmpty, value.allSatisfy({ $0.isASCII && $0.isNumber }) else {
            return nil
        }

        guard let parsed = Int(value), parsed <= Int(Int32.max) else {
            return nil
        }

        return parsed
    }

    private static func buyerIdentityMode(from parameters: Parameters) throws -> BuyerIdentityMode? {
        guard let parameter = parameters.value("buyerIdentityMode") else {
            return nil
        }

        guard let buyerIdentityMode = BuyerIdentityMode(rawValue: parameter) else {
            throw E2EControlLinkError.invalidBuyerIdentityMode
        }

        return buyerIdentityMode
    }

    private static func signInEmail(from parameters: Parameters) throws -> String? {
        guard let email = parameters.value("email") else {
            return nil
        }

        guard !email.isEmpty else {
            throw E2EControlLinkError.blankEmail
        }

        return email
    }

    private struct Parameters {
        private let values: [String: String]

        init(percentEncoded queryItems: [URLQueryItem]?) {
            values = (queryItems ?? []).reduce(into: [:]) { result, item in
                let value = Self.decode(item.value ?? "")

                result[Self.decode(item.name)] = value.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }

        private static func decode(_ value: String) -> String {
            let spaced = value.replacingOccurrences(of: "+", with: " ")

            return spaced.removingPercentEncoding ?? spaced
        }

        var isEmpty: Bool {
            values.isEmpty
        }

        var names: [String] {
            Array(values.keys)
        }

        func contains(_ name: String) -> Bool {
            values[name] != nil
        }

        func value(_ name: String) -> String? {
            values[name]
        }
    }
}
