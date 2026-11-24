# Checkout Kit for Android changelog

## 4.1.1

### Patch Changes

- Checkout WebView console messages now respect `logLevel` in debuggable apps, with URL queries redacted from the message and source. In non-debuggable apps, Checkout Kit suppresses WebView console messages.

## 4.1.0

### Minor Changes

- Keep reporting preload state after checkout reuses a preload, matching iOS. The handle returned by `preload` used to stop receiving updates once `present` reused its preload. It now reports `Expired` when a checkout kept after dismissal reaches its time-to-live, and `Invalidated` when the checkout is removed, for example after completion or a failure. While checkout is presented, the handle doesn't go idle: a checkout removed during presentation reports `Invalidated` when it's dismissed. A failure after presentation reports `Invalidated` rather than `Failed`.

### Patch Changes

- Stop checkout from opening links while it isn't presented. A preloaded checkout that hasn't been shown yet, or that the buyer dismissed, now ignores links, including navigations to app, email and phone links, instead of opening them in a browser or another app.
- Report `Ready` for a preload that `present` reuses before it finishes loading. Its handle used to stay `Loading`, even after the checkout loaded and was kept for the next presentation. `Ready` now comes from checkout's ready signal instead of the page finishing loading, so a page that isn't checkout, such as a bot challenge, doesn't count. A background preload can report `Ready` slightly later than before.
- Fix reopening checkout after the buyer dismisses it. Both the SDK-managed sheet and app-hosted `ShopifyCheckout` views now reuse the preloaded checkout until it expires, matching iOS, instead of loading checkout again.
- Only reuse a preloaded checkout in the activity that preloaded it. A preload's WebView keeps the context it was created with, and its cache lifetime follows that activity, so reusing it in another activity opened native pickers, such as a country dropdown, behind the visible screen, and could keep the preloading activity alive or open links through it. Presenting from a different activity, or from a context without an activity, now loads checkout normally and reports `Idle(Invalidated)` for the preload. A context that wraps the preloading activity, such as a `ContextThemeWrapper`, still reuses it.
- Keep the checkout sheet clear of side system bars and display cutouts. In landscape with three-button navigation, a sheet that filled the window width placed its close button under the navigation bar, where taps opened the navigation buttons instead. A sheet that already fits beside the insets keeps its centered position.
- Offsite pages opened inside checkout now respect their `<meta name="viewport">` tag, as in Chrome. Before this change, the checkout WebView always laid pages out at its own width, so payment pages built for a fixed design width (for example `width=750`) or scaled by `devicePixelRatio` rendered 2–3× too large and ran off screen. Shopify checkout pages declare `width=device-width` and are unaffected. Pages without a viewport tag now load zoomed out to fit the screen, as in Chrome.

## 4.0.0

### Major Changes

- **Breaking:** `ColorScheme.Light.colors`, `ColorScheme.Dark.colors`, `ColorScheme.Automatic.lightColors` and `ColorScheme.Automatic.darkColors` are now read-only. To change colors, create a new color scheme with `customize { … }` or `copy(…)`:

  ```kotlin
  ShopifyCheckout.configure {
      it.appearance = CheckoutAppearance.App(
          ColorScheme.Dark().customize { headerTitleColor = Color.SRGB(0xFFFFFF) },
      )
  }
  ```

  For Java callers, use the `ColorsBuilder` setter in `customize` and return `Unit.INSTANCE`:

  ```java
  ShopifyCheckout.configure(configuration ->
      configuration.setAppearance(new CheckoutAppearance.App(
          new ColorScheme.Dark().customize(colors -> {
              colors.setHeaderTitleColor(new Color.SRGB(0xFFFFFF));
              return Unit.INSTANCE;
          })
      ))
  );
  ```

  `ShopifyCheckout.configure` now passes its block a copy of the current configuration and applies the copy when the block returns. If the block throws, the configuration does not change. Keeping the configuration object after the block returns no longer changes the applied configuration, and concurrent `configure` calls no longer overwrite each other's changes.
- Rename the checkout color properties so that each name ends in `Color`. The old names are removed. Update Kotlin and Java callers as follows:

  | Old name | New name |
  | --- | --- |
  | `Colors.webViewBackground`, `ColorsBuilder.webViewBackground` | `webViewBackgroundColor` |
  | `Colors.headerBackground`, `ColorsBuilder.headerBackground` | `headerBackgroundColor` |
  | `Colors.headerFont`, `ColorsBuilder.headerFont` | `headerTitleColor` |
  | `Colors.progressIndicator`, `ColorsBuilder.progressIndicator` | `progressIndicatorColor` |
  | `Colors.closeIconTint`, `ColorsBuilder.closeIconTint` | `closeIconTintColor` |
  | `ColorsBuilder.withWebViewBackground(...)` | `withWebViewBackgroundColor(...)` |
  | `ColorsBuilder.withHeaderBackground(...)` | `withHeaderBackgroundColor(...)` |
  | `ColorsBuilder.withHeaderFont(...)` | `withHeaderTitleColor(...)` |
  | `ColorsBuilder.withProgressIndicator(...)` | `withProgressIndicatorColor(...)` |
  | `ColorsBuilder.withCloseIconTint(...)` | `withCloseIconTintColor(...)` |
  | `CheckoutSheetOptions.closeIconTint`, `CheckoutSheetOptions.Builder.closeIconTint` | `closeIconTintColor` |

  Java accessors follow the same names, for example `getHeaderFont()` becomes `getHeaderTitleColor()` and `setCloseIconTint(...)` becomes `setCloseIconTintColor(...)`. `closeIcon`, `dragHandleColor`, `headerBorderColor`, and `scrimColor` are unchanged.

  The `@Serializable` key names of `Colors` also change to the new property names. Color schemes that were serialized with an earlier version do not decode with this version. Serialize them again after you upgrade.
- Move checkout lifecycle APIs from `ShopifyCheckoutKit` to `ShopifyCheckout` without compatibility forwarding methods. Replace `ShopifyCheckoutKit.present`, `preload`, and `configure` with their `ShopifyCheckout` equivalents. The embedded view now takes the checkout URL first, matching `present` and `preload`: use `ShopifyCheckout.create(checkoutUrl, context) { ... }` and `ShopifyCheckout(checkoutUrl, context, listener)`. Replace `ShopifyCheckoutKit.invalidate()` with `ShopifyCheckout.clearPreload()`, and read configuration using `ShopifyCheckout.getConfiguration()`.

  These operations retain shared checkout state; constructing embedded checkout content does not create an isolated SDK client. Dependency coordinates, the package namespace, and SDK version metadata are unchanged. Update explicit lifecycle imports from `com.shopify.checkoutkit.checkout.ShopifyCheckoutKit` to `com.shopify.checkoutkit.checkout.ShopifyCheckout`. SDK log messages previously tagged `ShopifyCheckoutKit` are now tagged `ShopifyCheckout`.
- Move the public checkout APIs into `com.shopify.checkoutkit.checkout`. Update Kotlin and Java imports from `com.shopify.checkoutkit`, including checkout configuration, presentation, and event types. Use `ShopifyCheckout` for lifecycle APIs and `Checkout` for checkout snapshots. The Maven coordinate remains `com.shopify:checkout-kit`.

  Replace configuration data-class constructors and `copy()` calls with builders or Kotlin configuration blocks for preloading, telemetry, sheet options, snap points, dismissal, and drag handles. For example, replace `Preloading(enabled = false)` with `Preloading { enabled = false }`. Java callers can obtain `Preloading.builder()`, call `setEnabled(false)`, and then call `build()`.

  Update the Embedded Checkout Protocol dependency to stable `2026.08.25.1`. Protocol models now use builders or Kotlin configuration blocks instead of data-class constructors and `copy()`, and protocol string enums become open value types. Recompile consumers. The wire protocol remains `2026-08-25`.

  Rename checkout resources to use the `checkout_` prefix. Apps that override SDK resources or select them in UI tests must update those references; the close button ID is now `checkout_close_button`.

  Notify `onDismiss` after a Checkout Kit-managed presentation closes, including closure following a terminal failure. `onFail` runs before `onDismiss` in that case. Order completion remains separate from dismissal, and caller-controlled `CheckoutHandle.dismiss()` does not invoke `onDismiss`.

  Allow hosts to handle or cancel raw contact and deep-link navigation through the checkout link callback. Render Cloudflare managed challenges for presented checkouts and discard challenged background preloads so they can be retried when presented. Trust Shopify-owned `shop.com` origins, including subdomains, alongside `shop.app` when an origin allowlist is configured.

  Apply only the matching light or dark customization block when customizing an explicit color scheme.
- Add optional reasons to `PreloadState.Idle` to distinguish the initial state from invalidation and expiry. Replace `PreloadState.Idle` values with `PreloadState.Idle()` and the former `PreloadState.Expired` state with `PreloadState.Idle(PreloadState.IdleReason.Expired)`. Match idle states with `is PreloadState.Idle`. Java callers replace `PreloadState.Idle.INSTANCE` with `new PreloadState.Idle()` and inspect `getReason()`.

  `IdleReason` is an extensible string-backed value with `Invalidated` and `Expired` constants. Compare known reasons or use an `else` branch so future reasons do not require source changes. Invalidating an empty cache preserves its last state and reason without notifying observers. Operational failures remain `Failed(reason, message)`.
- Rename `CheckoutLinkAction.Open` to `CheckoutLinkAction.Default`. Return `Default` when your app does not handle a checkout link and Checkout Kit should use its default link-opening behavior.

### Minor Changes

- Report the time until checkout sends `ec.ready` in a new anonymous `checkout_kit_ready_duration_ms` diagnostic metric. A presented checkout that is dismissed, fails, or is torn down before `ec.ready` is reported as `not_ready`. Telemetry can still be disabled through `Telemetry`.

### Patch Changes

- Record `checkout_kit_confirmation_reached` telemetry when a checkout presentation ends on the order confirmation page, labelled with whether a valid `ec.complete` was received, so missing completion messages can be measured.
- Update native checkout colors when the system theme changes while checkout is open. With `ColorScheme.Automatic` and `uiMode` in the host activity's `android:configChanges`, the header, title, close icon, header border, progress bar, web view background, drag handle and navigation bar buttons switch to the new theme's colors, and checkout stays open.

## Earlier releases

Earlier release notes are on [GitHub Releases](https://github.com/Shopify/checkout-kit/releases).
