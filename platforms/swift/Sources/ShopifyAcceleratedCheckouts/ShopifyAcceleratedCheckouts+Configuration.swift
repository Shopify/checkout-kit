import Foundation
import SwiftUI

@available(iOS 16.0, *)
extension ShopifyAcceleratedCheckouts {
    public class Configuration: ObservableObject, Copyable {
        /// The domain of the shop without the protocol.
        ///
        /// Example: `my-shop.myshopify.com`
        ///
        /// See: https://shopify.dev/docs/storefronts/themes/getting-started/build-a-theme#get-the-shop-domain
        @Published public var storefrontDomain: String

        /// The storefront access token.
        ///
        /// See: https://shopify.dev/docs/storefronts/themes/getting-started/build-a-theme#get-the-storefront-access-token
        @Published public var storefrontAccessToken: String

        /// Data to attach to the buyerIdentity during cart creation
        /// - Apple Pay sheet will skip requesting email/phone number fields if provided here
        /// - Customer will *override* existing cart.buyerIdentity if you are using cartId
        ///
        /// See: https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate
        @Published public var customer: Customer?

        public init(
            storefrontDomain: String,
            storefrontAccessToken: String,
            customer: Customer? = nil
        ) {
            self.storefrontDomain = storefrontDomain
            self.storefrontAccessToken = storefrontAccessToken
            self.customer = customer
        }

        package required init(copy: Configuration) {
            storefrontDomain = copy.storefrontDomain
            storefrontAccessToken = copy.storefrontAccessToken
            customer = copy.customer?.copy()
        }
    }

    public class Customer: ObservableObject, Copyable {
        /// The email to attribute an order to on `buyerIdentity`
        @Published public var email: String?

        /// The phoneNumber to attribute an order to on `buyerIdentity`
        @Published public var phoneNumber: String?

        /// The customer access token to attribute an order to on `buyerIdentity`
        @Published public var customerAccessToken: String?

        /// Creates a customer for authenticated Shopify users.
        ///
        /// Use this initializer when you have a customer access token from Shopify authentication.
        /// The customer's email and phone will be fetched from their Shopify account.
        ///
        /// - Parameter customerAccessToken: The access token from Shopify customer authentication
        public init(customerAccessToken: String) {
            self.customerAccessToken = customerAccessToken
            email = nil
            phoneNumber = nil
        }

        /// Creates a customer for guest checkout or explicit contact override.
        ///
        /// Use this initializer when you want to pre-fill customer contact information
        /// without Shopify authentication.
        ///
        /// - Parameters:
        ///   - email: The customer's email address
        ///   - phoneNumber: The customer's phone number
        public init(email: String?, phoneNumber: String?) {
            self.email = email
            self.phoneNumber = phoneNumber
            customerAccessToken = nil
        }

        @available(*, deprecated, message: "Use init(customerAccessToken:) for customer accounts or init(email:phoneNumber:) for other users.")
        public init(email: String?, phoneNumber: String?, customerAccessToken: String? = nil) {
            self.email = email
            self.phoneNumber = phoneNumber
            self.customerAccessToken = customerAccessToken
        }

        package required init(copy: Customer) {
            email = copy.email
            phoneNumber = copy.phoneNumber
            customerAccessToken = copy.customerAccessToken
        }
    }
}
