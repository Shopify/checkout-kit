---
"@shopify/checkout-kit-swift": major
---

Move checkout lifecycle APIs from `ShopifyCheckoutKit` to `ShopifyCheckout` without compatibility forwarding methods. Replace `ShopifyCheckoutKit.present`, `preload`, and `configure` with their `ShopifyCheckout` equivalents. Replace `ShopifyCheckoutKit.invalidate()` with `ShopifyCheckout.clearPreload()`, and read configuration using `ShopifyCheckout.configuration`.

These operations retain shared checkout state; constructing embedded checkout content does not create an isolated SDK client. Package/import names and SDK version metadata are unchanged. The default checkout log prefix changes from `ShopifyCheckoutKit` to `ShopifyCheckout`; the OSLog subsystem remains `com.shopify.checkoutkit`.

Embedded `ShopifyCheckout` now reads shared appearance and title defaults when it is displayed, not when it is created; `.appearance(...)` and `.title(...)` modifiers still take precedence.
