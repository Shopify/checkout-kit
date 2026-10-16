---
"@shopify/checkout-kit-swift": major
---

Move native color customization into `CheckoutAppearance`, `CheckoutColorScheme`, and `CheckoutColors`. These replace `Configuration.Appearance`, `Configuration.ColorScheme`, and the configuration-level `backgroundColor`, `tintColor`, and `closeButtonTintColor` properties and SwiftUI modifiers. Use `CheckoutColors.webViewBackground`, `progressIndicator`, and `closeIconTint` through `.appearance(...)` instead. For example, use `.appearance(.storefront(colors: CheckoutColors(progressIndicator: .systemBlue)))`. Automatic appearance supports independent light and dark palettes.

Make `ShopifyCheckoutKit.configuration` a read-only snapshot. Update configuration with the main-actor `ShopifyCheckoutKit.configure { ... }` API, which now invalidates cached preloads after every configuration update. Preload again after changing configuration. SwiftUI checkout modifiers apply to that checkout instance without changing global configuration or invalidating the global preload cache.

Update the bundled protocol models to use initializers with required arguments and configuration closures for optional fields, plus `with { ... }` for modified copies. Protocol values such as checkout status and message severity are open values; include a `default` case in switches. Checkout start, update, and completion event initializers are public for constructing test fixtures.

Notify dismissal after the checkout presentation closes, including closure following a terminal failure. Failure callbacks run before dismissal callbacks in that case; order completion does not itself dismiss checkout. Caller-controlled UIKit dismissal or clearing a SwiftUI sheet binding does not invoke the checkout dismissal callback.

Add the required checkout protocol query parameters when creating `CheckoutViewController` directly. Report Apple Pay presentation failures through `onFail` and notify accelerated checkout dismissal when the Apple Pay presentation closes.
