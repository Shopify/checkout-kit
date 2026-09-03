// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

extension Storefront.Objects {
  /// Links a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) to a [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan), providing the pricing details for that specific combination. Each allocation includes the checkout charge amount, any remaining balance due for the purchase, and up to two price adjustments that show how the selling plan affects the variant's price.
  ///
  /// Selling plan allocations are available on product variants and [cart lines](https://shopify.dev/docs/api/storefront/current/objects/CartLine), enabling storefronts to display information such as subscription or purchase option pricing before and during checkout.
  static let SellingPlanAllocation = ApolloAPI.Object(
    typename: "SellingPlanAllocation",
    implementedInterfaces: [],
    keyFields: nil
  )
}