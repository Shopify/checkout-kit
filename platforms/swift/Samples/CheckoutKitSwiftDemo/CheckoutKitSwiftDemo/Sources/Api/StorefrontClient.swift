import ApolloAPI
import Foundation

public struct StorefrontURL {
    public let url: URL

    private let slug = "([\\w\\d_-]+)"

    init(from url: URL) {
        self.url = url
    }

    public func isThankYouPage() -> Bool {
        return url.path.range(of: "/thank[-_]you", options: .regularExpression) != nil
    }

    public func isCheckout() -> Bool {
        return url.path.contains("/checkout")
    }

    public func isCart() -> Bool {
        return url.path.contains("/cart")
    }

    public func isCollection() -> Bool {
        return url.path.range(of: "/collections/\(slug)", options: .regularExpression) != nil
    }

    public func isProduct() -> Bool {
        return url.path.range(of: "/products/\(slug)", options: .regularExpression) != nil
    }

    public func getProductSlug() -> String? {
        guard isProduct() else { return nil }

        let pattern = "/products/([\\w_-]+)"
        if let match = url.path.range(
            of: pattern, options: .regularExpression, range: nil, locale: nil
        ) {
            return url.path[match].components(separatedBy: "/").last
        }
        return nil
    }
}

@MainActor
class StorefrontInputFactory {
    static let shared = StorefrontInputFactory()

    private let vaultedContactInfo: InfoDictionary = .shared

    enum Errors: Error {
        case invariant(String)
    }

    public func createCartInput(lines cartLines: [Storefront.CartLineInput], customerAccessToken: String? = nil) -> Storefront.CartInput {
        let lines: GraphQLNullable<[Storefront.CartLineInput]> = .some(cartLines)

        switch appConfiguration.buyerIdentityMode {
        case .guest:
            return Storefront.CartInput(lines: lines)

        case .hardcoded:
            let deliveryAddress = Storefront.CartDeliveryAddressInput(
                address1: .some(vaultedContactInfo.address1),
                address2: .some(vaultedContactInfo.address2),
                city: .some(vaultedContactInfo.city),
                company: .some(""),
                countryCode: .some(GraphQLEnum(
                    Storefront.CountryCode(rawValue: vaultedContactInfo.country) ?? .us
                )),
                firstName: .some(vaultedContactInfo.firstName),
                lastName: .some(vaultedContactInfo.lastName),
                phone: .some(vaultedContactInfo.phone),
                provinceCode: .some(vaultedContactInfo.province),
                zip: .some(vaultedContactInfo.zip)
            )

            let buyerIdentity = Storefront.CartBuyerIdentityInput(
                email: vaultedContactInfo.email.isEmpty ? .none : .some(vaultedContactInfo.email),
                phone: vaultedContactInfo.phone.isEmpty ? .none : .some(vaultedContactInfo.phone),
                customerAccessToken: customerAccessToken.map { .some($0) } ?? .none
            )

            let delivery = Storefront.CartDeliveryInput(
                addresses: .some([
                    Storefront.CartSelectableAddressInput(
                        address: Storefront.CartAddressInput(
                            deliveryAddress: .some(deliveryAddress)
                        ),
                        selected: .some(true),
                        oneTimeUse: .some(true)
                    )
                ])
            )

            return Storefront.CartInput(
                lines: lines,
                buyerIdentity: .some(buyerIdentity),
                delivery: .some(delivery)
            )

        case .customerAccount:
            guard let token = customerAccessToken else {
                return Storefront.CartInput(lines: lines)
            }
            return Storefront.CartInput(
                lines: lines,
                buyerIdentity: .some(
                    Storefront.CartBuyerIdentityInput(
                        customerAccessToken: .some(token)
                    )
                )
            )
        }
    }
}
