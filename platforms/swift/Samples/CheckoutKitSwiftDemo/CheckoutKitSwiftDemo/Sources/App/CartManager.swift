import Apollo
import ApolloAPI
import Combine
import Foundation
import PassKit
import ShopifyCheckoutKit

protocol UserErrorDisplayable {
    var message: String { get }
}

extension Storefront.CartUserErrorFragment: UserErrorDisplayable {}
extension Storefront.CartCreateMutation.Data.CartCreate.UserError: UserErrorDisplayable {}
extension Storefront.CartLinesAddMutation.Data.CartLinesAdd.UserError: UserErrorDisplayable {}
extension Storefront.CartLinesUpdateMutation.Data.CartLinesUpdate.UserError: UserErrorDisplayable {}

@MainActor
class CartManager: ObservableObject {
    static let shared = CartManager()

    // MARK: Properties

    public var redirectUrl: URL?

    @Published var cart: Storefront.CartFragment?
    @Published var isDirty: Bool = false

    // MARK: Initializers

    init() {}

    // MARK: Cart Actions

    func performCartLinesAdd(variant: String, quantity: Int = 1) async throws -> Storefront.CartFragment {
        let line = try createCartLineInput(variant: variant, quantity: quantity)

        guard let cartId = cart?.id else {
            return try await performCartCreate(lines: [line])
        }

        let lines = [line]
        let network = Network.shared

        let mutation = Storefront.CartLinesAddMutation(
            cartId: cartId,
            lines: lines,
            country: network.countryCode,
            language: network.languageCode
        )

        do {
            let data = try await performMutation(mutation)

            guard let payload = data.cartLinesAdd else {
                throw CartManager.Errors.payloadUnwrap
            }

            guard payload.userErrors.isEmpty else {
                throw CartManager.Errors.invariant(
                    message: CartManager.userErrorMessage(errors: payload.userErrors)
                )
            }

            guard let cartData = payload.cart?.fragments.cartFragment else {
                throw Errors.invariant(message: "cart returned nil")
            }

            cart = cartData
            isDirty = true

            return cartData
        } catch let error as Errors {
            throw error
        } catch {
            throw Errors.apiErrors(requestName: "cartLinesAdd", message: "\(error)")
        }
    }

    func performCartLinesUpdate(id: String, quantity: Int) async throws -> Storefront.CartFragment {
        guard let cartId = cart?.id else {
            return try await performCartCreate(items: [id])
        }

        let lines = [
            Storefront.CartLineUpdateInput(id: id, quantity: .some(Int32(quantity)))
        ]

        let network = Network.shared

        let mutation = Storefront.CartLinesUpdateMutation(
            cartId: cartId,
            lines: lines,
            country: network.countryCode,
            language: network.languageCode
        )

        do {
            let data = try await performMutation(mutation)

            guard let payload = data.cartLinesUpdate else {
                throw CartManager.Errors.payloadUnwrap
            }

            guard payload.userErrors.isEmpty else {
                throw CartManager.Errors.invariant(
                    message: CartManager.userErrorMessage(errors: payload.userErrors)
                )
            }

            guard let cartData = payload.cart?.fragments.cartFragment else {
                throw Errors.invariant(message: "cart returned nil")
            }

            cart = cartData
            isDirty = true

            return cartData
        } catch let error as Errors {
            throw error
        } catch {
            throw Errors.apiErrors(requestName: "cartLinesUpdate", message: "\(error)")
        }
    }

    func seedCart(variant: String, quantity: Int = 1) async throws -> Storefront.CartFragment {
        resetCart()
        return try await performCartLinesAdd(variant: variant, quantity: quantity)
    }

    private func performCartCreate(items: [String] = []) async throws -> Storefront.CartFragment {
        let lines = try items.map { try createCartLineInput(variant: $0, quantity: 1) }
        return try await performCartCreate(lines: lines)
    }

    private func performCartCreate(lines: [Storefront.CartLineInput]) async throws -> Storefront.CartFragment {
        var customerAccessToken: String?
        if CustomerAccountManager.shared.isAuthenticated {
            customerAccessToken = try? await CustomerAccountManager.shared.getValidAccessToken()
        }
        let input = StorefrontInputFactory.shared.createCartInput(lines: lines, customerAccessToken: customerAccessToken)
        let network = Network.shared

        let mutation = Storefront.CartCreateMutation(
            input: input,
            country: network.countryCode,
            language: network.languageCode
        )

        do {
            let data = try await performMutation(mutation)

            guard let payload = data.cartCreate else {
                throw CartManager.Errors.payloadUnwrap
            }

            guard payload.userErrors.isEmpty else {
                throw CartManager.Errors.invariant(
                    message: CartManager.userErrorMessage(errors: payload.userErrors)
                )
            }

            guard let cartData = payload.cart?.fragments.cartFragment else {
                throw Errors.invariant(message: "cart returned nil")
            }

            cart = cartData
            isDirty = true

            return cartData
        } catch let error as Errors {
            throw error
        } catch {
            throw Errors.apiErrors(requestName: "cartCreate", message: "\(error)")
        }
    }

    private func performMutation<T: GraphQLMutation>(_ mutation: T) async throws -> T.Data
        where T.ResponseFormat == SingleResponseFormat
    {
        let response = try await Network.shared.apollo.perform(mutation: mutation)

        if let data = response.data {
            return data
        } else if let errors = response.errors {
            throw Errors.apiErrors(
                requestName: String(describing: T.self),
                message: errors.map { $0.message ?? "" }.joined(separator: ", ")
            )
        } else {
            throw Errors.payloadUnwrap
        }
    }

    func resetCart() {
        cart = nil
        isDirty = false
    }

    private func createCartLineInput(variant: String, quantity: Int) throws -> Storefront.CartLineInput {
        guard let lineQuantity = Int32(exactly: quantity), lineQuantity > 0 else {
            throw Errors.invariant(message: "Cart quantity must be a positive integer")
        }

        return Storefront.CartLineInput(quantity: .some(lineQuantity), merchandiseId: variant)
    }
}

extension CartManager {
    enum Errors: LocalizedError {
        case missingPostalAddress, invalidPaymentData,
             invalidBillingAddress, payloadUnwrap
        case apiErrors(requestName: String, message: String)
        case invariant(message: String)

        var failureReason: String? {
            switch self {
            case .missingPostalAddress:
                return "Postal Address is nil"
            case .invalidPaymentData:
                return "Invalid Payment Data"
            case .invalidBillingAddress:
                return "Mapping billing address failed"
            case .payloadUnwrap:
                return "Request Payload failed to unwrap"
            case let .apiErrors(requestName, message):
                return "Request: \(requestName) Failed. Message: \(message)"
            case let .invariant(message):
                return "invariant failed: \(message)"
            }
        }

        var recoverySuggestion: String? {
            switch self {
            case .missingPostalAddress:
                return "Check `PKContact.postalAddress`"
            case .invalidPaymentData:
                return "Decoding failed - check the PKPayment"
            case .invalidBillingAddress:
                return "Ensure `billingContact.postalAddress` is not nil"
            case .payloadUnwrap:
                return "Check the previous request was executed"
            case let .apiErrors(requestName, _):
                return "Check the API payload for more details: \(requestName)"
            case .invariant:
                return "Resolve preconditions before continuing"
            }
        }
    }

    static func userErrorMessage(errors: [some UserErrorDisplayable]) -> String {
        return "userErrors should be [], received: \(errors.map { $0.message }.joined(separator: ", "))"
    }
}
