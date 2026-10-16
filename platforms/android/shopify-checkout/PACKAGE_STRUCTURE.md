# Checkout package structure

This module publishes one merchant-facing Android SDK through the fused
`shopify-checkout-kit` artifact. The checkout feature itself owns its generated
Android namespace and Kotlin/Java merchant API both use
`com.shopify.checkoutkit.checkout`.

## Public contract

The following source files define the merchant contract and live in
`com.shopify.checkoutkit.checkout`:

| Area | Source files |
| --- | --- |
| SDK entry points and presentation | `ShopifyCheckoutKit.kt`, `ShopifyCheckout.kt`, `CheckoutPresentation.kt` |
| Checkout model and lifecycle | `Checkout.kt`, `CheckoutEvent.kt`, `CheckoutException.kt`, `CheckoutLink.kt`, `CheckoutListener.kt` |
| Configuration and appearance | `Configuration.kt`, `ConfigurationUpdater.kt`, `CheckoutAppearance.kt`, `ColorScheme.kt` |
| Sheet configuration | `CheckoutSheetOptions.kt` |
| Preloading | `PreloadState.kt` |

`ShopifyCheckout` is public because it is the embeddable checkout view. Its
constructor and implementation collaborators are not public API.

## Non-contract implementation

`LogWrapper` is SDK implementation plumbing, not merchant API. It lives in
`internal.logging` and is `internal`, so it is excluded from the published API
baseline.

`BuildConfig` is generated in the feature namespace and is not a source API
organization concern.

## Internal implementation ownership

These files are explicitly `internal` or contain only private/internal
implementation helpers. They are candidates for a future package-only
organization change, provided the public API baseline is unchanged.

| Proposed area | Current source files |
| --- | --- |
| `internal.presentation` | `CheckoutBottomSheet.kt`, `CheckoutBottomSheetAccessibility.kt`, `CheckoutBottomSheetDragHandle.kt`, `CheckoutBottomSheetLayout.kt`, `CheckoutBottomSheetScrollHandoff.kt`, `CheckoutSheetHeaderBackgroundDrawable.kt`, `CheckoutSheetSnapPointResolver.kt` |
| `internal.web` | `CheckoutWebView.kt`, `CheckoutWebViewListener.kt`, `WebMessageTransport.kt`, `WebViewScrollDirection.kt`, `CheckoutUrlDecorator.kt`, `OriginAllowlist.kt`, `ExternalUriLauncher.kt`, `UriExtensions.kt` |
| `internal.protocol` | `CheckoutProtocol.kt`, `EmbeddedCheckoutProtocolBridge.kt`, `ComposedCheckoutProtocolClient.kt`, `CheckoutEventAdapter.kt`, `CheckoutMessageIngressPolicy.kt`, `CheckoutMessageRejection.kt`, `CheckoutSerializer.kt` |
| `internal.preload` | `PreloadCache.kt` |
| `internal.telemetry` | `Telemetry.kt` and the existing `telemetry/` package (`CheckoutKitTelemetry.kt`, `OtlpExporter.kt`) |
| `internal.concurrent` | `ThreadExtensions.kt` |
| `internal.logging` | `LogWrapper.kt` |

## Rules for organization changes

1. Keep merchant-facing types in `com.shopify.checkoutkit.checkout`; do not
   move them as part of an implementation-only organization change.
2. Keep every moved implementation declaration `internal` or `private`.
   Investigate any declaration that must become public before moving it.
3. Preserve the API baseline exactly for implementation-only changes; an
   intentional merchant API migration must update the baseline explicitly.
4. Move one ownership area at a time and retain focused tests with it.
5. Keep the feature's generated `R` and `BuildConfig` imports on
   `com.shopify.checkoutkit.checkout`.

This structure provides feature-owned public APIs and implementation ownership
for future Android SDK features.
