---
"@shopify/checkout-kit-swift": major
---

Accelerated checkout buttons now obtain Buy Now carts from your app after a wallet is selected. Replace `ShopifyAcceleratedCheckoutButtons(variantID:quantity:)` with either an existing `cartID` or the new `variantID:getCart:` initializer.
