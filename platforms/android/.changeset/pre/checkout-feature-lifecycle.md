---
"@shopify/checkout-kit-android": major
---

Move checkout lifecycle APIs from `ShopifyCheckoutKit` to `ShopifyCheckout` without compatibility forwarding methods. Replace `ShopifyCheckoutKit.present`, `preload`, and `configure` with their `ShopifyCheckout` equivalents. The embedded view now takes the checkout URL first, matching `present` and `preload`: use `ShopifyCheckout.create(checkoutUrl, context) { ... }` and `ShopifyCheckout(checkoutUrl, context, listener)`. Replace `ShopifyCheckoutKit.invalidate()` with `ShopifyCheckout.clearPreload()`, and read configuration using `ShopifyCheckout.getConfiguration()`.

These operations retain shared checkout state; constructing embedded checkout content does not create an isolated SDK client. Dependency coordinates, the package namespace, and SDK version metadata are unchanged. Update explicit lifecycle imports from `com.shopify.checkoutkit.checkout.ShopifyCheckoutKit` to `com.shopify.checkoutkit.checkout.ShopifyCheckout`. SDK log messages previously tagged `ShopifyCheckoutKit` are now tagged `ShopifyCheckout`.
