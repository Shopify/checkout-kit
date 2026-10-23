---
"@shopify/checkout-kit-react-native": major
---

Accelerated checkout buttons now require either a Storefront `cartId`, or a `variantId` and `getCart` callback. For Buy Now, Checkout Kit calls `getCart` only after the buyer taps a wallet button; create or reuse the app-owned cart and return its ID.
