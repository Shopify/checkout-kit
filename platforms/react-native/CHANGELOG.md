# Checkout Kit for React Native changelog

## 4.0.2

### Patch Changes

- Update Checkout Kit for Swift to 4.2.0 and Android to 4.1.0. Both SDKs continue to report preload state when checkout opens before loading finishes. On iOS, clearing a preload while checkout is open reports `idle` with reason `invalidated` after dismissal. On Android, reopening a dismissed checkout in the same activity can reuse its preload until it expires.

## 4.0.1

### Patch Changes

- Correct the iOS checkout title localization instructions to use the resource key read by Checkout Kit V4.
- `setConfig` now rejects with a `TypeError`, and changes nothing, when `title`, `preloading`, `telemetry`, `allowedMessageOrigins` or `logLevel` has the wrong type or is `null`. The error has `code: 'set_config_failed'`, the same code that Android already used. The check runs in JavaScript before the native SDK is called, so iOS and Android reject the same values with the same error. Before, on iOS, `{preloading: false, allowedMessageOrigins: [1]}` resolved and turned off preloading, and `{title: 'Checkout', preloading: null}` resolved and changed the title. A rejected call does not clear the preloaded checkout and does not change `acceleratedCheckouts`. A setting that is `undefined` is ignored, and `null` entries in `allowedMessageOrigins` are dropped. An unknown `logLevel` still resolves and keeps the current value. `appearance` is not checked, so it works as before on iOS and Android: an `appearance` that the SDK cannot read does not reject, and the other settings still apply.

  `setConfig` now applies `acceleratedCheckouts` after the native SDK accepts the configuration, just before the Promise resolves. `acceleratedCheckoutsReady` updates at that time, not when you call `setConfig`. For the `ShopifyCheckoutProvider` `configuration` prop, `useShopifyCheckout().acceleratedCheckoutsAvailable` updates after that configuration applies.

## 4.0.0

### Major Changes

- Accelerated checkout buttons now require either a Storefront `cartId`, or a `variantId` and `getCart` callback. For Buy Now, Checkout Kit calls `getCart` only after the buyer taps a wallet button; create or reuse the app-owned cart and return its ID.
- **Breaking:** Configure the checkout appearance like the native SDKs. `Configuration.appearance` replaces the top-level `colorScheme` and `colors` keys:

  - `appearance: {type: CheckoutAppearanceType.app, colorScheme?, colors?}` uses Checkout Kit's built-in style, not the storefront's branding, with a `light`, `dark` or `automatic` color scheme. `colorScheme` defaults to `automatic`.
  - `appearance: {type: CheckoutAppearanceType.storefront, colors?}` uses the storefront's branding.
  - `ColorScheme` is renamed to `CheckoutColorScheme`, and `ColorScheme.storefront` is removed. Use `CheckoutAppearanceType.storefront` instead.
  - `CheckoutColors` has the same fields on iOS and Android: `webViewBackgroundColor`, `headerBackgroundColor`, `headerTitleColor`, `progressIndicatorColor`, `closeIconTintColor` and `headerBorderColor`, plus `dragHandleColor` on Android. The fields map to the color fields of the native `CheckoutColors`. The old `backgroundColor`, `tintColor`, `headerTextColor`, `closeButtonColor` and Android `progressIndicator` names are removed. Android's `headerBackgroundColor` keeps its name.
  - Each `setConfig` call with `appearance` replaces the whole appearance. Colors that it does not give return to the native defaults. Colors from an earlier appearance no longer remain on iOS.
  - `getConfig()` returns `appearance` as `{type, colorScheme?}` instead of `colorScheme`, and no longer returns iOS colors.

  On iOS, every `setConfig` call now clears the preloaded checkout. Android already did this. Call `preload` again after any configuration change, including title-only updates.

  See the migration table in the README.
- Adapt React Native preload observation to the native idle lifecycle model. Expired and invalidated preloads now emit `{type: 'idle', reason: 'expired' | 'invalidated'}` instead of a separate `expired` state. Initial idle has no reason, and unfamiliar native idle reasons are preserved.

  Map appearance colors to their renamed native properties.
- Rename the `open` link action to `default`. Use `default` when your app does not handle a checkout link and Checkout Kit should use its default link-opening behavior.
- Align React Native checkout lifecycle APIs with native SDKs. Rename `invalidate()` to `clearPreload()` and update native bridges to call `ShopifyCheckout` lifecycle methods instead of the removed `ShopifyCheckoutKit` entry points.
- **Breaking:** `setConfig` now returns `Promise<Configuration>`, on `ShopifyCheckout` and on `useShopifyCheckout()`. The Promise resolves after the native SDK applies the configuration, with the configuration that the native SDK reports right after it applies this call. Overlapping calls each resolve with their own configuration. If you call `getConfig()` before the Promise resolves, it can return the earlier values.

  ```tsx
  const applied = await shopifyCheckout.setConfig({title: 'Checkout'});
  applied; // {title: 'Checkout', ...}
  ```

  Calls apply and resolve in call order. Input that the SDK ignores, such as an unknown `logLevel`, still resolves, and the resolved configuration keeps the current value. The Promise rejects only when the native module cannot read the configuration, for example when a value has the wrong type. A rejected call changes nothing. The `ShopifyCheckout` constructor and the `ShopifyCheckoutProvider` `configuration` prop log such a rejection with `console.error`.

### Patch Changes

- Fix taps near the top and bottom edges of `AcceleratedCheckoutButtons` being ignored when its parent has no explicit height, such as a plain `View` or a `View` with only `minHeight`.
- On Android, with the automatic color scheme, native checkout colors now switch when the system theme changes while checkout is open. This requires `uiMode` in the host activity's `android:configChanges`, which the React Native template includes.
- `ShopifyCheckoutProvider` no longer applies its initial configuration twice on mount, so a preload started by a child on mount is not invalidated.
- Use Checkout Kit for Swift and Android `4.0.0`.

## Earlier releases

Earlier release notes are on [GitHub Releases](https://github.com/Shopify/checkout-kit/releases).
