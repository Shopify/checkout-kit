# Shopify Checkout Kit - Android

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](../../LICENSE)
![Tests](https://github.com/Shopify/checkout-kit/actions/workflows/test.yml/badge.svg?branch=main)

<img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/1f1d7351-1715-4165-874e-c1f2195bcb20" />

> [!WARNING]
> **Alpha - early preview.** This software is an early preview and is **not**
> production-ready. The current Checkout Kit for Android alpha is `4.0.0-alpha.3`.
> Stability is not guaranteed, and breaking changes may occur in any release.

**Checkout Kit for Android** lets Android apps present Shopify checkout in a native bottom sheet while preserving store checkout customizations such as Checkout UI extensions, Shopify Functions, branding, and supported payment methods.

> [!NOTE]
> This package was previously published as `com.shopify:checkout-sheet-kit`. New integrations should use `com.shopify:checkout-kit`.

- [Requirements](#requirements)
- [Install](#install)
  - [Gradle](#gradle)
  - [Maven](#maven)
- [Get a checkout URL](#get-a-checkout-url)
- [Present checkout](#present-checkout)
- [Embed checkout](#embed-checkout)
- [Preload checkout](#preload-checkout)
- [Configure checkout](#configure-checkout)
  - [Color schemes](#color-schemes)
  - [Title localization](#title-localization)
  - [Current configuration](#current-configuration)
- [Checkout lifecycle](#checkout-lifecycle)
  - [Error handling](#error-handling)
- [Browser and system callbacks](#browser-and-system-callbacks)
- [Authentication and buyer identity](#authentication-and-buyer-identity)
- [Offsite payments and links](#offsite-payments-and-links)
- [Troubleshooting](#troubleshooting)
- [Samples](#samples)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- JDK 17+
- Android `minSdk` 23+
- Android `compileSdk` 35+ for consuming apps. This repository currently builds the library with `compileSdk` 36.
- WebMessageListener support in the WebView installed on the buyer's device. This is available in Android System WebView
  or Chrome version 83 or newer (released May 2020). If unsupported, `present` invokes the failure callback with
  `web_view_not_supported` and returns `null`; an embedded `ShopifyCheckout` invokes `onFail` and remains inert.

## Install

For alpha testing, install the exact version shown below. The current Checkout Kit for Android alpha is `4.0.0-alpha.3`.

### Gradle

```groovy
dependencies {
    implementation "com.shopify:checkout-kit:4.0.0-alpha.3"
}
```

### Maven

```xml
<dependency>
  <groupId>com.shopify</groupId>
  <artifactId>checkout-kit</artifactId>
  <version>4.0.0-alpha.3</version>
</dependency>
```

## Get a checkout URL

Checkout Kit presents a standard Shopify checkout URL. The common flow is:

1. Create or update a cart with the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront), for example with [`cartCreate`](https://shopify.dev/docs/api/storefront/2026-04/mutations/cartCreate) and related cart mutations.
2. Read the cart's [`checkoutUrl`](https://shopify.dev/docs/api/storefront/2026-04/objects/Cart#field-cart-checkouturl).
3. Pass that URL, or a [cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink), to Checkout Kit.

You can use any GraphQL client. The sample app uses Apollo Kotlin and is a complete reference for a modern Storefront API cart flow.

For production use, see the [Storefront API GraphiQL Explorer](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started) for schema exploration and the [`cartCreate`](https://shopify.dev/docs/api/storefront/2026-04/mutations/cartCreate) mutation reference for the full input shape, including buyer identity, attributes, discount codes, delivery addresses, and delivery options.

## Present checkout

Use the Kotlin builder when presenting from a `ComponentActivity`:

```kotlin
import com.shopify.checkoutkit.ShopifyCheckoutKit

fun presentCheckout(checkoutUrl: String, activity: ComponentActivity) {
    ShopifyCheckoutKit.present(checkoutUrl, activity) {
        onFail { error ->
            handleCheckoutError(error)
        }

        onDismiss {
            resetCheckoutUi()
        }
    }
}
```

Checkout Kit adds the required checkout protocol parameters when checkout loads.

For Java integrations or shared listener implementations, extend `DefaultCheckoutListener`:

```kotlin
val listener = object : DefaultCheckoutListener() {
    override fun onCheckoutFailed(error: CheckoutException) {
        handleCheckoutError(error)
    }

    override fun onCheckoutDismissed() {
        resetCheckoutUi()
    }
}

ShopifyCheckoutKit.present(checkoutUrl, activity, listener)
```

The `present` call returns a `CheckoutHandle?`. Keep it if you need to dismiss checkout programmatically:

```kotlin
val checkout = ShopifyCheckoutKit.present(checkoutUrl, activity) {
    onDismiss { resetCheckoutUi() }
}

checkout?.dismiss()
```

## Embed checkout

Use `ShopifyCheckout` when your app owns the presentation container. The view owns the checkout header, close control,
loading indicator, WebView, browser/system callbacks, and checkout protocol connection. Your app owns the surrounding
sheet or navigation state, including its shape, scrim, drag handle, snap points, and dismissal gestures.

Jetpack Compose apps can host `ShopifyCheckout` with `AndroidView`; Checkout Kit does not add a Compose dependency:

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(checkoutUrl: String) {
    var isCheckoutPresented by remember { mutableStateOf(false) }
    val dismissCheckout = {
        isCheckoutPresented = false
        resetCheckoutUi()
    }

    Button(onClick = { isCheckoutPresented = true }) {
        Text("Checkout")
    }

    if (!isCheckoutPresented) return

    ModalBottomSheet(
        onDismissRequest = dismissCheckout,
    ) {
        AndroidView(
            factory = { context ->
                ShopifyCheckout.create(context, checkoutUrl) {
                    connect(protocolClient)

                    onDismiss { dismissCheckout() }

                    onFail { error ->
                        isCheckoutPresented = false
                        handleCheckoutError(error)
                    }
                }
            },
            modifier = Modifier.fillMaxSize(),
            onRelease = ShopifyCheckout::destroy,
        )
    }
}
```

View-system and Java hosts can construct `ShopifyCheckout(context, checkoutUrl, listener, protocolClient)` directly and
must follow the same `destroy()` contract when removing it from their hierarchy.

The close control and system back invoke `onDismiss`; back navigates WebView history first when possible. Sheet gestures
and tap-away belong to the host, so route `ModalBottomSheet.onDismissRequest` through the same app dismissal logic.
`onFail` reports the failure to your app. Your app removes or dismisses its surrounding presentation and calls
`destroy()` once the view is permanently removed; Checkout Kit does not attempt to dismiss an unknown parent.
Create a new `ShopifyCheckout` for any retry.

`ShopifyCheckout` callbacks and protocol client are fixed when the view is created. Create a new view for a new checkout
URL. If a Compose adapter accepts callbacks that can change during recomposition, forward them through stable delegates
such as `rememberUpdatedState` rather than recreating an active checkout.

Always call the idempotent `destroy()` method when a view is permanently removed. `AndroidView.onRelease` is the
preferred Compose integration point. Checkout Kit pauses temporary detachments and also destroys the view when its
nearest lifecycle owner is destroyed, but cannot infer that every detachment is permanent.

The embedded header uses the configured checkout appearance, title alignment, toolbar elevation, and close icon styles.
Sheet-specific configuration such as corner radius, scrim, drag handle, snap points, and gesture policy remains the
host's responsibility. The imperative `present` API continues to apply all `CheckoutSheetOptions` itself.

## Preload checkout

Call `preload` when your app has a strong signal that the buyer is likely to check out soon, such as when they open the cart screen or move toward a checkout action:

```kotlin
ShopifyCheckoutKit.preload(checkoutUrl, activity)
```

Checkout Kit can reuse a matching preloaded checkout when `present` is called later:

```kotlin
ShopifyCheckoutKit.present(checkoutUrl, activity) {
    onFail { error -> handleCheckoutError(error) }
    onDismiss { resetCheckoutUi() }
}
```

Preloading is a best-effort performance hint, not a guarantee. If the preload is unavailable, incomplete, or for a different checkout URL, checkout loads normally during presentation. A preloaded checkout reflects the cart state when `preload` was called, so call `preload` again after cart changes even when the checkout URL remains the same.

A valid checkout preloaded and presented with `ShopifyCheckoutKit.present` is retained when its bottom sheet is dismissed, so presenting the same checkout URL again can reuse the loaded checkout. Invalidate the preload when the cart changes or the loaded checkout should no longer be reused.

Avoid preloading on every add-to-cart or cart mutation. Preload only when buyer intent is strong enough to justify the additional client and network work.

Clear unused preloaded checkout work with `invalidate`:

```kotlin
ShopifyCheckoutKit.invalidate()
```

Preloading is enabled by default. Disable it when appropriate, for example for data-saver modes or app-specific runtime conditions:

```kotlin
import com.shopify.checkoutkit.Preloading

ShopifyCheckoutKit.configure {
    it.preloading = Preloading(enabled = false)
}
```

## Configure checkout

Configure global presentation defaults before presenting checkout:

```kotlin
ShopifyCheckoutKit.configure {
    it.appearance = CheckoutAppearance.Storefront()
    it.sheet = CheckoutSheetOptions(
        dismissal = CheckoutSheetDismissal(
            dragToDismissEnabled = true,
            tapAwayToDismissEnabled = true,
        ),
    )
    it.logLevel = LogLevel.ERROR
}
```

| Option | Default | Purpose |
| --- | --- | --- |
| `appearance` | `CheckoutAppearance.Storefront()` | Use the storefront's web checkout branding, or use the Checkout Kit style with `App(Automatic)`, `App(Light)`, or `App(Dark)`. |
| `sheet` | `CheckoutSheetOptions()` | Customize native sheet presentation such as snap points, dismissal behavior, corner radius, title alignment, toolbar elevation, close icon styling, and the optional drag handle. |
| `logLevel` | `LogLevel.WARN` | SDK logging verbosity. Use `LogLevel.DEBUG` during integration. |
| `preloading` | `Preloading(enabled = true)` | Enables best-effort checkout preloading before presentation. |

### Color schemes

```kotlin
ShopifyCheckoutKit.configure {
    it.appearance = CheckoutAppearance.App(ColorScheme.Light())
    it.appearance = CheckoutAppearance.App(ColorScheme.Dark())
    it.appearance = CheckoutAppearance.App(ColorScheme.Automatic())
    it.appearance = CheckoutAppearance.Storefront()
}
```

Storefront checkout currently uses a light color scheme. Customize the surrounding native sheet
colors to match the merchant's storefront branding:

```kotlin
ShopifyCheckoutKit.configure {
    it.appearance = CheckoutAppearance.Storefront().customize {
        headerBackground = Color.ResourceId(R.color.storefront_header)
        headerFont = Color.ResourceId(R.color.storefront_header_text)
        webViewBackground = Color.ResourceId(R.color.storefront_background)
        progressIndicator = Color.ResourceId(R.color.storefront_progress)
        dragHandleColor = Color.ResourceId(R.color.storefront_drag_handle)
    }
}
```

Customize automatic app colors with separate light and dark palettes:

```kotlin
ShopifyCheckoutKit.configure {
    it.appearance = CheckoutAppearance.App(ColorScheme.Automatic().customize(
        light = {
            headerBackground = Color.ResourceId(R.color.checkout_header_light)
            headerFont = Color.ResourceId(R.color.checkout_header_text_light)
            webViewBackground = Color.ResourceId(R.color.checkout_background_light)
            progressIndicator = Color.ResourceId(R.color.checkout_progress_light)
            dragHandleColor = Color.ResourceId(R.color.checkout_drag_handle_light)
        },
        dark = {
            headerBackground = Color.ResourceId(R.color.checkout_header_dark)
            headerFont = Color.ResourceId(R.color.checkout_header_text_dark)
            webViewBackground = Color.ResourceId(R.color.checkout_background_dark)
            progressIndicator = Color.ResourceId(R.color.checkout_progress_dark)
            dragHandleColor = Color.ResourceId(R.color.checkout_drag_handle_dark)
        },
    ))
}
```

### Sheet options

Customize native sheet presentation independently from checkout colors:

```kotlin
ShopifyCheckoutKit.configure {
    it.sheet = CheckoutSheetOptions(
        snapPoints = listOf(CheckoutSheetSnapPoint.Expanded(topMarginDp = 72f)),
        cornerRadiusDp = 32f,
        maxWidthDp = 640f,
        titleAlignment = CheckoutSheetTitleAlignment.CENTER,
        toolbarElevationDp = 0f,
        closeIconTint = Color.ResourceId(R.color.checkout_close),
        dismissal = CheckoutSheetDismissal(
            dragToDismissEnabled = true,
            tapAwayToDismissEnabled = true,
        ),
        dragHandle = CheckoutSheetDragHandle(
            visible = true,
        ),
    )
}
```

`CheckoutSheetOptions()` defaults to `CheckoutSheetSnapPoint.MaterialExpanded`, which resolves to a 72dp top margin
from the window top, or 56dp when the window width is greater than 640dp. The sheet defaults to a 640dp maximum width
and is centered on wider windows. Set `maxWidthDp` to another value to customize that cap. A non-positive, non-finite,
or unrepresentable `maxWidthDp` falls back to the 640dp default. Avoid
very narrow widths: they can make checkout unusable. The SDK handles system bar insets internally so the sheet does not
overlap the status bar.

Use `closeIcon = DrawableResource(R.drawable.ic_checkout_close)` to provide a custom close drawable. If both
`closeIcon` and `closeIconTint` are set, the custom drawable takes precedence.

Set `dragHandle.visible = true` to show a fixed, visual-only drag handle at the top of the sheet. The handle is hidden
when `dismissal.dragToDismissEnabled = false` so disabled drag gestures are not presented as available. Configure
`dragHandleColor` in `ColorScheme` to override the default header-font-derived handle color.

### Title localization

Override `checkout_web_view_title` in your app resources:

```xml
<resources>
  <string name="checkout_web_view_title">Buy now</string>
</resources>
```

### Current configuration

```kotlin
val configuration = ShopifyCheckoutKit.getConfiguration()
```

## Checkout lifecycle

Use `onFail` and `onDismiss` for checkout outcomes handled by your app. Use `CheckoutProtocol.Client` for typed checkout state, including completion. These descriptors wrap checkout protocol messages defined in the [protocol schema](../../protocol/services/shopping/embedded.openrpc.json).

```kotlin
import com.shopify.checkoutkit.CheckoutProtocol

val protocolClient = CheckoutProtocol.Client()
    .on(CheckoutProtocol.start) { checkout ->
        // Checkout is loaded and interactive.
    }
    .on(CheckoutProtocol.complete) { checkout ->
        // The order was completed. Clear or refresh the local cart.
    }
    .on(CheckoutProtocol.totalsChange) { checkout ->
        // React to updated totals.
    }
    .on(CheckoutProtocol.lineItemsChange) { checkout ->
        // React to line item changes.
    }
    .on(CheckoutProtocol.messagesChange) { checkout ->
        // React to checkout messages.
    }

ShopifyCheckoutKit.present(checkoutUrl, activity) {
    connect(protocolClient)
    onFail { error -> handleCheckoutError(error) }
    onDismiss { resetCheckoutUi() }
}
```

`ec.window.open_request` is handled by your registered `CheckoutProtocol.windowOpen` handler if you provide one. Otherwise, Checkout Kit falls back to its default Android intent behavior.

The public `CheckoutProtocol` descriptors are typed wrappers over UCP-backed checkout protocol messages.

### Error handling

A checkout lifecycle failure is delivered as a `CheckoutException` to `onFail` or
`onCheckoutFailed`. It has a stable `code`, diagnostic `message`, optional
`httpStatusCode`, and the optional native `cause`. Use the stable code for recovery
and analytics. Use diagnostic text and causes only for debugging and logging.

| `CheckoutErrorCode` | Meaning | Suggested app action |
| --- | --- | --- |
| `STOREFRONT_PASSWORD_REQUIRED` | The storefront is password protected. | Treat this checkout URL as unavailable until storefront password protection has been disabled. |
| `CUSTOMER_ACCOUNT_REQUIRED` | Checkout requires a customer account unavailable to this session. | Prompt the customer to [authenticate](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts), then retry. |
| `CART_EXPIRED` | The cart or checkout session is no longer available. | Create a new cart and retry. |
| `CART_COMPLETED` | The cart has already completed checkout. | Clear or create a new cart. |
| `INVALID_CART` | The cart cannot continue checkout. | Create a new cart and retry. |
| `HTTP_ERROR` | Checkout returned an HTTP error response. `httpStatusCode` is available. | Inspect `httpStatusCode`; retry only when it makes sense for your app. |
| `NETWORK_ERROR` | Checkout navigation failed before an HTTP response was available. | Offer a retry when connectivity is available. |
| `WEB_VIEW_NOT_SUPPORTED` | The device WebView provider lacks a required capability. | WebView support is widely available, but offer a browser fallback when it is unavailable. |
| `WEB_CONTENT_PROCESS_TERMINATED` | The WebView renderer was terminated or crashed. | Dismiss the current presentation, destroy an embedded `ShopifyCheckout` after removal, and let the buyer retry with a new checkout. |
| `SDK_ERROR` | An internal Checkout Kit error has occurred (e.g. a protocol message could not be decoded). | Log diagnostic context and offer a browser fallback. |
| `UNKNOWN` | An unexpected error occurred. | Log diagnostic context and offer a browser fallback. |

Record `code` (and `httpStatusCode` when available) in analytics as appropriate for your privacy
policy. Use `message` and `cause` only for debugging and logging; do not use them for recovery behavior.

```kotlin
when (error.code) {
    CheckoutErrorCode.CART_EXPIRED,
    CheckoutErrorCode.INVALID_CART -> createAndPresentFreshCart()
    CheckoutErrorCode.NETWORK_ERROR -> showRetry()
    CheckoutErrorCode.HTTP_ERROR -> handleHttpFailure(error.httpStatusCode)
    else -> showCheckoutUnavailable()
}
```

You own recovery after a lifecycle failure: retrying, recreating a cart, authenticating a buyer,
opening a browser fallback, and re-presenting checkout.

#### Checkout session errors

`ec.error` ends the embedded checkout session. Checkout Kit first forwards it to
`CheckoutProtocol.error`, then reports one lifecycle failure for a presented checkout. The first
unrecoverable error message determines the lifecycle code; if none is present, the code is
`UNKNOWN`. `ec.messages.change` reports checkout state only and never calls `onFail`.

Add a protocol handler when you need the complete protocol payload; it runs before `onFail`:

```kotlin
val protocolClient = CheckoutProtocol.Client()
    .on(CheckoutProtocol.error) { terminalError ->
        // Inspect the complete ECP terminal payload for advanced diagnostics.
    }
```

Failures during preload do not call `onFail` or `onCheckoutFailed`. Monitor them as
`PreloadState.Failed` with the `PreloadStateListener` passed to `preload`, or with the returned
`CheckoutPreload` handle's `listener`. A later `present` can load normally.

## Browser and system callbacks

Android apps must decide how to handle file choosers, web permissions, and geolocation prompts requested by checkout.

```kotlin
ShopifyCheckoutKit.present(checkoutUrl, activity) {
    onShowFileChooser { webView, filePathCallback, fileChooserParams ->
        // Launch your ActivityResultContract and return true if handled.
        false
    }

    onPermissionRequest { permissionRequest ->
        // Grant, deny, or proxy web permissions such as camera access.
    }

    onGeolocationPermissionsShowPrompt { origin, callback ->
        // Request Android location permission, then invoke callback.invoke(...).
    }

    onGeolocationPermissionsHidePrompt {
        // Hide any visible geolocation prompt.
    }
}
```

Declare location permissions if checkout uses pickup points or "Use my location":

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Authentication and buyer identity

Checkout Kit does not create carts or authenticate buyers. Add buyer context to the cart before presenting checkout:

- Use the Customer Account API to obtain a customer access token and attach it through cart buyer identity.
- Use Storefront API cart buyer identity fields to prefill email, phone, country, and language.
- Use Storefront API cart delivery mutations to add delivery addresses and select delivery options.
- Use `walletPreferences: [shop_pay]` when you want checkout to prefer Shop Pay.
- Use Multipass for Shopify Plus stores that use Classic Customer Accounts. Generate Multipass tokens server-side and set `return_to` to the checkout URL.

Keep Multipass secrets out of client-side code.

## Offsite payments and links

Some payment providers redirect buyers to external banking apps or web pages. Configure Android App Links or deep links so buyers can return to your app after those flows complete.

Checkout Kit opens external HTTPS links, `mailto:`, `tel:`, and custom-scheme links through Android intents. Make sure your app has:

- Intent filters for the storefront links it owns.
- Fallback behavior for links that no installed app can open.
- A routing path for checkout URLs, cart URLs, and post-checkout confirmation URLs.

## Troubleshooting

- Use `LogLevel.DEBUG` while integrating.
- For production release builds, use Android app shrinking and optimization
  when appropriate. Checkout Kit does not require integration-specific R8 rules
  for normal usage, and app-level shrinking can remove unused dependency code
  and resources. For example:

  ```kotlin
  android {
      buildTypes {
          release {
              isMinifyEnabled = true
              isShrinkResources = true
          }
      }
  }
  ```
- If checkout reports an expired, completed, or invalid cart, create a new cart and use its `checkoutUrl`.
- If checkout cannot access camera, file upload, or location features, check your manifest permissions and runtime permission flow.
- If checkout fails with `web_view_not_supported`, the installed WebView provider does not expose WebMessageListener.
  Prompt the buyer to update Android System WebView or Chrome before trying embedded checkout again, or open the
  checkout URL in Mobile Chrome, Chrome Custom Tabs, or another full mobile browser.
- If offsite payment redirects do not return to your app, verify App Links/deep link intent filters and domain association.
- Password-protected storefronts return `storefront_password_required` and are not supported by Checkout Kit.

## Samples

See [samples](samples/README.md). `CheckoutKitAndroidDemo` demonstrates an Apollo Kotlin Storefront API cart flow, checkout presentation, typed protocol lifecycle events, file chooser handling, geolocation callbacks, and Customer Account API sign-in.

## Contributing

See [CONTRIBUTING](../../.github/CONTRIBUTING.md).

Useful checks before opening an Android change:

```sh
cd platforms/android
./gradlew :lib:build
./gradlew clean test --console=plain
./gradlew detekt lintRelease
```

For sample app changes, run:

```sh
cd platforms/android/samples/CheckoutKitAndroidDemo
./gradlew build
```

For public API changes, run:

```sh
cd platforms/android
./gradlew :lib:apiCheck
cd ../../protocol/languages/kotlin
./gradlew :embedded-checkout-protocol:apiCheck
```

## License

Checkout Kit is available under the [MIT license](../../LICENSE).
