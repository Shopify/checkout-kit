# Checkout Kit for Swift changelog

## 4.1.0

### Minor Changes

- Add an opt-in `.buttonHeight(_:)` modifier for Shop Pay and Apple Pay accelerated checkout buttons. Buttons default to 48pt and accept heights from 30pt to 64pt. Values outside that range are clamped; zero, negative, or non-finite values use the default. Read the applied height from `resolvedButtonHeight`.

## 4.0.0

### Major Changes

- Accelerated checkout buttons now obtain Buy Now carts from your app after a wallet is selected. Replace `ShopifyAcceleratedCheckoutButtons(variantID:quantity:)` with either an existing `cartID` or the new `variantID:getCart:` initializer.
- Rename the `CheckoutColors` color properties and their `init` labels so that each color name ends in `Color`. The old names are removed without deprecated aliases. `closeIcon` and `headerBorderColor` keep their names.

  | Before | After |
  | --- | --- |
  | `webViewBackground` | `webViewBackgroundColor` |
  | `headerBackground` | `headerBackgroundColor` |
  | `headerFont` | `headerTitleColor` |
  | `progressIndicator` | `progressIndicatorColor` |
  | `closeIconTint` | `closeIconTintColor` |

  The initializer is now `CheckoutColors(webViewBackgroundColor:headerBackgroundColor:headerTitleColor:progressIndicatorColor:closeIcon:closeIconTintColor:headerBorderColor:)`. For example, replace `CheckoutColors(progressIndicator: .systemBlue)` with `CheckoutColors(progressIndicatorColor: .systemBlue)`, and `$0.headerFont = .label` with `$0.headerTitleColor = .label`.
- Move checkout lifecycle APIs from `ShopifyCheckoutKit` to `ShopifyCheckout` without compatibility forwarding methods. Replace `ShopifyCheckoutKit.present`, `preload`, and `configure` with their `ShopifyCheckout` equivalents. Replace `ShopifyCheckoutKit.invalidate()` with `ShopifyCheckout.clearPreload()`, and read configuration using `ShopifyCheckout.configuration`.

  These operations retain shared checkout state; constructing embedded checkout content does not create an isolated SDK client. Package/import names and SDK version metadata are unchanged. The default checkout log prefix changes from `ShopifyCheckoutKit` to `ShopifyCheckout`; the OSLog subsystem remains `com.shopify.checkoutkit`.

  Embedded `ShopifyCheckout` now reads shared appearance and title defaults when it is displayed, not when it is created; `.appearance(...)` and `.title(...)` modifiers still take precedence.
- Replace the `Wallet` enum with an extensible value type. Existing `.applePay` and `.shopPay` values remain available; update exhaustive `switch` statements to handle unknown wallet values.
- Move native color customization into `CheckoutAppearance`, `CheckoutColorScheme`, and `CheckoutColors`. These replace `Configuration.Appearance`, `Configuration.ColorScheme`, and the configuration-level `backgroundColor`, `tintColor`, and `closeButtonTintColor` properties and SwiftUI modifiers. Use `CheckoutColors.webViewBackgroundColor`, `progressIndicatorColor`, and `closeIconTintColor` through `.appearance(...)` instead. For example, use `.appearance(.storefront(colors: CheckoutColors(progressIndicatorColor: .systemBlue)))`. Automatic appearance supports independent light and dark palettes.

  Read shared configuration through the read-only `ShopifyCheckout.configuration` snapshot. Update configuration with the main-actor `ShopifyCheckout.configure { ... }` API, which now invalidates cached preloads after every configuration update. Preload again after changing configuration. SwiftUI checkout modifiers apply to that checkout instance without changing global configuration or invalidating the global preload cache.

  Update the bundled protocol models to use initializers with required arguments and configuration closures for optional fields, plus `with { ... }` for modified copies. Protocol values such as checkout status and message severity are open values; include a `default` case in switches. Checkout start, update, and completion event initializers are public for constructing test fixtures.

  Notify dismissal after the checkout presentation closes, including closure following a terminal failure. Failure callbacks run before dismissal callbacks in that case; order completion does not itself dismiss checkout. Caller-controlled UIKit dismissal or clearing a SwiftUI sheet binding does not invoke the checkout dismissal callback.

  Add the required checkout protocol query parameters when creating `CheckoutViewController` directly. Report Apple Pay presentation failures through `onFail` and notify accelerated checkout dismissal when the Apple Pay presentation closes.
- Add optional reasons to `PreloadState.idle` to distinguish the initial state from invalidation and expiry. Replace `.idle` values with `.idle()` and the former `.expired` state with `.idle(reason: .expired)`. Explicit invalidation and preloads that become inapplicable now report `.idle(reason: .invalidated)`; operational failures remain `.failed(reason:message:)`.

  Invalidating an empty cache preserves its last state, including an expiry or failure reason, without notifying observers.

  `IdleReason` is an extensible string-backed value with named constants. Compare known reasons or use a `default` branch so future reasons do not require source changes.
- Rename `CheckoutLinkAction.open` to `default`. Return `default` when your app does not handle a checkout link and Checkout Kit should use its default link-opening behavior.

### Minor Changes

- Add the `checkout_kit_ready_duration_ms` telemetry histogram, which measures the time from the start of the initial checkout navigation until checkout sends `ec.ready`, or until a presented checkout ends before sending it. It carries `result` (`ready` or `not_ready`) and `preloaded` attributes.
- Rename the SwiftUI accelerated checkout buttons view to `ShopifyAcceleratedCheckoutButtons`. The previous `AcceleratedCheckoutButtons` name remains available as a deprecated typealias with a migration fix-it.

  Restore the previous `CheckoutSheet` SwiftUI view name as a deprecated typealias for `ShopifyCheckout`, with a migration fix-it.

### Patch Changes

- Record `checkout_kit_confirmation_reached` telemetry when a checkout presentation ends on the order confirmation page, labelled with whether a valid `ec.complete` was received, so missing completion messages can be measured.
- Use a lighter default progress indicator color in dark mode. The default `CheckoutColors.progressIndicatorColor` is now `#1773B0` in light mode and `#1E8CC8` in dark mode, matching Android.

## Earlier releases

Earlier release notes are on [GitHub Releases](https://github.com/Shopify/checkout-kit/releases).
