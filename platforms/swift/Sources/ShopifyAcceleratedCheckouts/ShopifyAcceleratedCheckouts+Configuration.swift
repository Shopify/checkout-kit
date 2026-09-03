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

        /// Data to attach to the buyerIdentity during cart creation
        /// - Apple Pay sheet will skip requesting email/phone number fields if provided here
        /// - Customer will *override* existing cart.buyerIdentity if you are using cartId
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

@available(iOS 16.0, *)
private struct ShopifyAcceleratedCheckoutsConfigurationModifier: ViewModifier {
    let configuration: ShopifyAcceleratedCheckouts.Configuration

    func body(content: Content) -> some View {
        content
            .environment(\.shopifyAcceleratedCheckoutsConfiguration, configuration)
            .task(id: prefetchIdentity) {
                await ShopSettingsPrefetcher.prefetch(configuration: configuration)
            }
    }

    private var prefetchIdentity: ShopSettingsPrefetchIdentity {
        ShopSettingsPrefetchIdentity(
            storefrontDomain: configuration.storefrontDomain,
            storefrontAccessToken: configuration.storefrontAccessToken
        )
    }
}

@available(iOS 16.0, *)
private struct ShopSettingsPrefetchIdentity: Equatable {
    let storefrontDomain: String
    let storefrontAccessToken: String
}

@available(iOS 16.0, *)
enum ShopSettingsPrefetcher {
    static func prefetch(configuration: ShopifyAcceleratedCheckouts.Configuration) async {
        let startedAt = AcceleratedCheckoutDebugTiming.now
        ShopifyAcceleratedCheckouts.logger.debug("Shop settings prefetch started.")
        let storefront = StorefrontAPI(
            storefrontDomain: configuration.storefrontDomain,
            storefrontAccessToken: configuration.storefrontAccessToken
        )

        do {
            _ = try await storefront.shop()
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings prefetch completed in \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: startedAt)) ms."
            )
        } catch {
            ShopifyAcceleratedCheckouts.logger.debug(
                "Shop settings prefetch failed after \(AcceleratedCheckoutDebugTiming.elapsedMilliseconds(since: startedAt)) ms."
            )
        }
    }
}

@available(iOS 16.0, *)
extension View {
    /// Configures accelerated checkouts and prefetches shared shop settings.
    ///
    /// Apply this modifier to an ancestor view as soon as the shop configuration is known.
    /// Accelerated checkout buttons reuse the prefetched result automatically.
    public func shopifyAcceleratedCheckouts(
        _ configuration: ShopifyAcceleratedCheckouts.Configuration
    ) -> some View {
        modifier(ShopifyAcceleratedCheckoutsConfigurationModifier(configuration: configuration))
    }
}
