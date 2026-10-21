---
"@shopify/checkout-kit-react-native": major
---

**Breaking:** Configure the checkout appearance like the native SDKs. `Configuration.appearance` replaces the top-level `colorScheme` and `colors` keys:

- `appearance: {type: CheckoutAppearanceType.app, colorScheme?, colors?}` uses Checkout Kit's built-in style, not the storefront's branding, with a `light`, `dark` or `automatic` color scheme. `colorScheme` defaults to `automatic`.
- `appearance: {type: CheckoutAppearanceType.storefront, colors?}` uses the storefront's branding.
- `ColorScheme` is renamed to `CheckoutColorScheme`, and `ColorScheme.storefront` is removed. Use `CheckoutAppearanceType.storefront` instead.
- `CheckoutColors` has the same fields on iOS and Android: `webViewBackgroundColor`, `headerBackgroundColor`, `headerTitleColor`, `progressIndicatorColor`, `closeIconTintColor` and `headerBorderColor`, plus `dragHandleColor` on Android. The fields map to the color fields of the native `CheckoutColors`. The old `backgroundColor`, `tintColor`, `headerTextColor`, `closeButtonColor` and Android `progressIndicator` names are removed. Android's `headerBackgroundColor` keeps its name.
- Each `setConfig` call with `appearance` replaces the whole appearance. Colors that it does not give return to the native defaults. Colors from an earlier appearance no longer remain on iOS.
- `getConfig()` returns `appearance` as `{type, colorScheme?}` instead of `colorScheme`, and no longer returns iOS colors.

On iOS, every `setConfig` call now clears the preloaded checkout. Android already did this. Call `preload` again after any configuration change, including title-only updates.

See the migration table in the README.
