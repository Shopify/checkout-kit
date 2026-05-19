import Foundation

/// High-level API for Storefront operations using the custom GraphQL client
@available(iOS 16.0, *)
class StorefrontAPI: ObservableObject, StorefrontAPIProtocol {
    let client: GraphQLClient

    /// Initialize the Storefront API
    /// - Parameters:
    ///   - storefrontDomain: The shop domain (e.g., "example.myshopify.com")
    ///   - storefrontAccessToken: The storefront access token
    ///   - apiVersion: The API version to use (defaults to "2026-04")
    ///   - countryCode: Optional country code for localization
    ///   - languageCode: Optional language code for localization
    init(
        storefrontDomain: String,
        storefrontAccessToken: String,
        apiVersion: String = ShopifyAcceleratedCheckouts.apiVersion,
        countryCode: CountryCode? = nil,
        languageCode: LanguageCode? = nil
    ) {
        let url = URL(string: "https://\(storefrontDomain)/api/\(apiVersion)/graphql.json")!

        client = GraphQLClient(
            url: url,
            headers: ["X-Shopify-Storefront-Access-Token": storefrontAccessToken],
            context: InContextDirective(
                countryCode: countryCode,
                languageCode: languageCode
            )
        )
    }
}

@available(iOS 16.0, *)
protocol StorefrontAPIProtocol {
    // MARK: - Query Methods

    func cart(by id: GraphQLScalars.ID) async throws -> StorefrontAPI.Cart?
    func shop() async throws -> StorefrontAPI.Shop

    // MARK: - Mutation Methods

    @discardableResult func cartCreate(
        with items: [GraphQLScalars.ID], customer: ShopifyAcceleratedCheckouts.Customer?
    ) async throws -> StorefrontAPI.Cart

    @discardableResult func cartBuyerIdentityUpdate(
        id: GraphQLScalars.ID,
        input buyerIdentity: StorefrontAPI.CartBuyerIdentityUpdateInput
    ) async throws -> StorefrontAPI.Cart

    @discardableResult func cartDeliveryAddressesReplace(
        id: GraphQLScalars.ID,
        address: StorefrontAPI.Address,
        validate: Bool
    ) async throws -> StorefrontAPI.Cart

    @discardableResult func cartSelectedDeliveryOptionsUpdate(
        id: GraphQLScalars.ID,
        deliveryGroupId: GraphQLScalars.ID,
        deliveryOptionHandle: String
    ) async throws -> StorefrontAPI.Cart?

    @discardableResult func cartPaymentUpdate(
        id: GraphQLScalars.ID,
        totalAmount: StorefrontAPI.MoneyV2,
        applePayPayment: StorefrontAPI.ApplePayPayment
    ) async throws -> StorefrontAPI.Cart

    @discardableResult func cartBillingAddressUpdate(
        id: GraphQLScalars.ID,
        billingAddress: StorefrontAPI.Address
    ) async throws -> StorefrontAPI.Cart

    func cartRemovePersonalData(id: GraphQLScalars.ID) async throws

    func cartPrepareForCompletion(id: GraphQLScalars.ID) async throws
        -> StorefrontAPI.CartStatusReady

    func cartSubmitForCompletion(id: GraphQLScalars.ID) async throws -> StorefrontAPI.SubmitSuccess
}
