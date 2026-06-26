# Shopify Checkout Kit - Android

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](../../LICENSE)
![Tests](https://github.com/Shopify/checkout-kit/actions/workflows/test.yml/badge.svg?branch=main)

<img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/1f1d7351-1715-4165-874e-c1f2195bcb20" />

> [!WARNING]
> **Alpha - early preview.** This software is an early preview and is **not**
> production-ready. The current Checkout Kit for Android alpha is `4.0.0-alpha.2`.
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

Checkout Kit uses Google's Material Components for Android internally to
present checkout in a bottom sheet. Material types are not part of Checkout
Kit's public API, but apps that also depend on Material will resolve a single
Material version through Gradle dependency resolution.

## Install

For alpha testing, install the exact version shown below. The current Checkout Kit for Android alpha is `4.0.0-alpha.2`.

### Gradle

```groovy
dependencies {
    implementation "com.shopify:checkout-kit:4.0.0-alpha.2"
}
```

### Maven

```xml
<dependency>
  <groupId>com.shopify</groupId>
  <artifactId>checkout-kit</artifactId>
  <version>4.0.0-alpha.2</version>
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

        onCancel {
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

    override fun onCheckoutCanceled() {
        resetCheckoutUi()
    }
}

ShopifyCheckoutKit.present(checkoutUrl, activity, listener)
```

The `present` call returns a `CheckoutHandle?`. Keep it if you need to dismiss checkout programmatically:

```kotlin
val checkout = ShopifyCheckoutKit.present(checkoutUrl, activity) {
    onCancel { resetCheckoutUi() }
}

checkout?.dismiss()
```

## Preload checkout

Call `preload` when your app has a strong signal that the buyer is likely to check out soon, such as when they open the cart screen or move toward a checkout action:

```kotlin
ShopifyCheckoutKit.preload(checkoutUrl, activity)
```

Checkout Kit can reuse a matching preloaded checkout when `present` is called later:

```kotlin
ShopifyCheckoutKit.present(checkoutUrl, activity) {
    onFail { error -> handleCheckoutError(error) }
    onCancel { resetCheckoutUi() }
}
```

Preloading is a best-effort performance hint, not a guarantee. If the preload is unavailable, incomplete, or for a different checkout URL, checkout loads normally during presentation. A preloaded checkout reflects the cart represented by the URL passed to `preload`, so call `preload` again after cart changes produce a new checkout URL.

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
    it.colorScheme = ColorScheme.Automatic()
    it.logLevel = LogLevel.ERROR
}
```

| Option | Default | Purpose |
| --- | --- | --- |
| `colorScheme` | `ColorScheme.Automatic()` | Use device appearance, force `Light` or `Dark`, or use `Web` to match web checkout branding. |
| `logLevel` | `LogLevel.WARN` | SDK logging verbosity. Use `LogLevel.DEBUG` during integration. |
| `preloading` | `Preloading(enabled = true)` | Enables best-effort checkout preloading before presentation. |

### Color schemes

```kotlin
ShopifyCheckoutKit.configure {
    it.colorScheme = ColorScheme.Light()
    it.colorScheme = ColorScheme.Dark()
    it.colorScheme = ColorScheme.Web()
    it.colorScheme = ColorScheme.Automatic()
}
```

Customize native colors with resource IDs or sRGB integers:

```kotlin
ShopifyCheckoutKit.configure {
    it.colorScheme = ColorScheme.Automatic().customize(
        light = {
            headerBackground = Color.ResourceId(R.color.checkout_header_light)
            headerFont = Color.ResourceId(R.color.checkout_header_text_light)
            webViewBackground = Color.ResourceId(R.color.checkout_background_light)
            progressIndicator = Color.ResourceId(R.color.checkout_progress_light)
            closeIconTint = Color.ResourceId(R.color.checkout_close_light)
        },
        dark = {
            headerBackground = Color.ResourceId(R.color.checkout_header_dark)
            headerFont = Color.ResourceId(R.color.checkout_header_text_dark)
            webViewBackground = Color.ResourceId(R.color.checkout_background_dark)
            progressIndicator = Color.ResourceId(R.color.checkout_progress_dark)
            closeIconTint = Color.ResourceId(R.color.checkout_close_dark)
        },
    )
}
```

If both `closeIcon` and `closeIconTint` are set, the custom drawable takes precedence:

```kotlin
ShopifyCheckoutKit.configure {
    it.colorScheme = ColorScheme.Light().customize {
        closeIcon = DrawableResource(R.drawable.ic_checkout_close)
    }
}
```

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

Use `onFail` and `onCancel` for checkout outcomes handled by your app. Use `CheckoutProtocol.Client` for typed checkout state, including completion. These descriptors wrap checkout protocol messages defined in the [protocol schema](../../protocol/services/shopping/embedded.openrpc.json).

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
    onCancel { resetCheckoutUi() }
}
```

`ec.window.open_request` is handled by your registered `CheckoutProtocol.windowOpen` handler if you provide one. Otherwise, Checkout Kit falls back to its default Android intent behavior.

The public `CheckoutProtocol` descriptors are typed wrappers over UCP-backed checkout protocol messages.

### Error handling

Checkout failures are delivered as `CheckoutException` values. Checkout web error events are mapped to `ConfigurationException`, `CheckoutExpiredException`, or `ClientException`; register `CheckoutProtocol.error` separately if you need to observe `ec.error` messages.

| Exception | Common code | Meaning | Recommended handling |
| --- | --- | --- | --- |
| `ConfigurationException` | `storefront_password_required` | Checkout is password protected or otherwise blocked by configuration. | Treat as fatal for this session. |
| `CheckoutExpiredException` | `cart_expired` | The cart or checkout session expired. | Create a new cart and present a fresh `checkoutUrl`. |
| `CheckoutExpiredException` | `cart_completed` | The cart already completed checkout. | Clear the local cart and fetch a new one. |
| `CheckoutExpiredException` | `invalid_cart` | The cart is invalid or empty. | Rebuild the cart before presenting checkout. |
| `HttpException` | `http_error` | Checkout returned an unexpected HTTP response. | Treat as fatal for this attempt; retry with a fresh URL if appropriate. |
| `ClientException` | `client_error` | Checkout could not load for a client-side reason. | Show a recoverable error and log details. |
| `CheckoutKitException` | `error_receiving_message`, `error_sending_message`, `render_process_gone`, `unknown` | Checkout Kit encountered an SDK or WebView issue. | Log details and open an issue if it persists. |

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
  and resources.
- If checkout reports an expired, completed, or invalid cart, create a fresh cart and use its new `checkoutUrl`.
- If checkout cannot access camera, file upload, or location features, check your manifest permissions and runtime permission flow.
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
