# Checkout Kit for Android changelog

## 4.0.0-alpha.9

### Major Changes

- Move the public checkout APIs into `com.shopify.checkoutkit.checkout`. Update Kotlin and Java imports from `com.shopify.checkoutkit`, including `ShopifyCheckoutKit`, `Checkout`, configuration, presentation, and event types. The Maven coordinate remains `com.shopify:checkout-kit`.

  Replace configuration data-class constructors and `copy()` calls with builders or Kotlin configuration blocks for preloading, telemetry, sheet options, snap points, dismissal, and drag handles. For example, replace `Preloading(enabled = false)` with `Preloading { enabled = false }`. Java callers can obtain `Preloading.builder()`, call `setEnabled(false)`, and then call `build()`.

  Rename checkout resources to use the `checkout_` prefix. Apps that override SDK resources or select them in UI tests must update those references; the close button ID is now `checkout_close_button`.

  Notify `onDismiss` after a Checkout Kit-managed presentation closes, including closure following a terminal failure. `onFail` runs before `onDismiss` in that case. Order completion remains separate from dismissal, and caller-controlled `CheckoutHandle.dismiss()` does not invoke `onDismiss`.

  Allow hosts to handle or cancel raw contact and deep-link navigation through the checkout link callback. Render Cloudflare managed challenges for presented checkouts and discard challenged background preloads so they can be retried when presented. Trust Shopify-owned `shop.com` origins, including subdomains, alongside `shop.app` when an origin allowlist is configured.

  Apply only the matching light or dark customization block when customizing an explicit color scheme.

## Earlier releases

Notes for 4.0.0-alpha.8 and earlier are on [GitHub Releases](https://github.com/Shopify/checkout-kit/releases).
