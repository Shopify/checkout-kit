---
"@shopify/checkout-kit-react-native": patch
---

Use Checkout Kit for Swift and Android `4.0.0-alpha.9`.

`ShopifyCheckoutProvider` no longer applies its initial configuration twice on mount, so a preload started by a child on mount is not invalidated.
