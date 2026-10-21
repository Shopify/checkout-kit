import Foundation
import SwiftUI

@available(iOS 16.0, *)
extension ShopifyAcceleratedCheckouts {
    public struct Configuration: Sendable, Equatable {
        /// The domain of the shop without the protocol.
        ///
        /// Example: `my-shop.myshopify.com`
        ///
        /// See: https://shopify.dev/docs/storefronts/themes/getting-started/build-a-theme#get-the-shop-domain
        public var storefrontDomain: String

        /// The storefront access token.
        ///
        /// See: https://shopify.dev/docs/storefronts/themes/getting-started/build-a-theme#get-the-storefront-access-token
        public var storefrontAccessToken: String

        /// Customer identity Checkout Kit applies when it updates a supplied cart during accelerated checkout.
        ///
        /// If an app-provided cart should use an authenticated buyer's identity, set that identity, including the
        /// customer access token, when creating or updating the cart before returning its ID. This configuration does
        /// not initialize app-provided carts.
        ///
        /// Wallets may skip requesting email and phone number fields when they are provided here.
        ///
        /// See: https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate
        public var customer: Customer?

        public init(
            storefrontDomain: String,
            storefrontAccessToken: String,
            customer: Customer? = nil
        ) {
            self.storefrontDomain = storefrontDomain
            self.storefrontAccessToken = storefrontAccessToken
            self.customer = customer
        }
    }

    public struct Customer: Sendable, Equatable {
        /// The email to attribute an order to on `buyerIdentity`
        public let email: String?

        /// The phoneNumber to attribute an order to on `buyerIdentity`
        public let phoneNumber: String?

        /// The customer access token to attribute an order to on `buyerIdentity`
        public let customerAccessToken: String?

        /// Creates customer identity data to attach to checkout buyer identity.
        ///
        /// - Parameters:
        ///   - email: The customer's email address.
        ///   - phoneNumber: The customer's phone number.
        ///   - customerAccessToken: The access token from Shopify customer authentication.
        public init(email: String? = nil, phoneNumber: String? = nil, customerAccessToken: String? = nil) {
            self.email = email
            self.phoneNumber = phoneNumber
            self.customerAccessToken = customerAccessToken
        }
    }
}

@available(iOS 16.0, *)
private struct ShopifyAcceleratedCheckoutsConfigurationKey: EnvironmentKey {
    static let defaultValue: ShopifyAcceleratedCheckouts.Configuration? = nil
}

@available(iOS 16.0, *)
extension EnvironmentValues {
    public var shopifyAcceleratedCheckoutsConfiguration: ShopifyAcceleratedCheckouts.Configuration? {
        get { self[ShopifyAcceleratedCheckoutsConfigurationKey.self] }
        set { self[ShopifyAcceleratedCheckoutsConfigurationKey.self] = newValue }
    }
}
