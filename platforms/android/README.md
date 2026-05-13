# Shopify Checkout Kit - Android

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](/LICENSE)
![Tests](https://github.com/Shopify/checkout-kit/actions/workflows/test.yml/badge.svg?branch=main)
[![GitHub Release](https://img.shields.io/github/release/shopify/checkout-kit.svg?style=flat)]()

<img width="3200" height="800" alt="gradients" src="https://github.com/user-attachments/assets/1f1d7351-1715-4165-874e-c1f2195bcb20" />

**Shopify's Checkout Kit for Android** is a library that enables Android apps to provide the world's highest converting, customizable, one-page checkout within an app. The presented experience is a fully-featured checkout that preserves all of the store customizations: Checkout UI extensions, Functions, and more. It also provides idiomatic defaults such as support for light and dark mode, and convenient developer APIs to embed, customize and follow the lifecycle of the checkout experience. Check out our developer blog to [learn how Checkout Kit is built](https://www.shopify.com/partners/blog/mobile-checkout-sdks-for-ios-and-android).

**Note**: This library was previously published as `com.shopify:checkout-sheet-kit`. It has been renamed to `com.shopify:checkout-kit`. Update your Gradle/Maven dependency if upgrading from an older version.

- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Gradle](#gradle)
  - [Maven](#maven)
- [Integration Guide](#integration-guide)
  - [Retrieve a checkout URL](#retrieve-a-checkout-url)
  - [Create an event processor](#create-an-event-processor)
  - [Listen for UCP messages](#listen-for-ucp-messages)
  - [Present checkout](#present-checkout)
  - [Refresh the checkout URL after cart changes](#refresh-the-checkout-url-after-cart-changes)
- [Configuration](#configuration)
  - [Color Scheme](#color-scheme)
  - [Log Level](#log-level)
  - [Checkout Dialog Title](#checkout-dialog-title)
- [Monitoring the lifecycle of a checkout session](#monitoring-the-lifecycle-of-a-checkout-session)
  - [Error handling](#error-handling)
    - [`CheckoutException`](#checkoutexception)
- [Integrating identity \& customer accounts](#integrating-identity--customer-accounts)
  - [Cart: buyer bag, identity, and preferences](#cart-buyer-bag-identity-and-preferences)
  - [Multipass](#multipass)
  - [Shop Pay](#shop-pay)
  - [Customer Account API](#customer-account-api)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- JDK 17+
- Android minSdk 23+
- Android compileSdk 35+
- Chrome >= 80

## Getting Started

The SDK is an [open source Android library](https://central.sonatype.com/artifact/com.shopify/checkout-kit). As a quick start, see
[sample projects](samples/README.md) or use one of the following ways to integrate the SDK into
your project:

### Gradle

```groovy
implementation "com.shopify:checkout-kit:1.0.0"
```

### Maven

```xml

<dependency>
   <groupId>com.shopify</groupId>
   <artifactId>checkout-kit</artifactId>
   <version>1.0.0</version>
</dependency>
```

## Integration Guide

Once the SDK has been added as a dependency, the Android integration is a short sequence:
create or fetch a cart, persist the `checkoutUrl`, register lifecycle callbacks, optionally
listen for typed UCP notifications, and present checkout from a `ComponentActivity`.

### Retrieve a checkout URL

The examples below assume the corresponding Checkout Kit and Storefront API types are imported in
the Android module that presents checkout.

To present checkout to the buyer, your application must first obtain a checkout URL.
The most common way is to use the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront)
to assemble a cart with `cartCreate` and related mutations, and then read the
[`checkoutUrl`](https://shopify.dev/docs/api/storefront/latest/objects/Cart#field-cart-checkouturl).
Alternatively, you can provide a [cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink).
You can use any GraphQL client to obtain a checkout URL. Shopify's
[Mobile Buy SDK for Android](https://github.com/Shopify/mobile-buy-sdk-android) is one option:

```kotlin
val client = GraphClient.build(
    context = applicationContext,
    shopDomain = "yourshop.myshopify.com",
    accessToken = "<storefront access token>"
)

val cartQuery = Storefront.query { query ->
    query.cart(ID(id)) {
        it.checkoutUrl()
    }
}

client.queryGraph(cartQuery).enqueue {
    if (it is GraphCallResult.Success) {
        val checkoutUrl = it.response.data?.cart?.checkoutUrl
    }
}
```

> [!NOTE]
> Pass the standard `checkoutUrl` returned by Storefront API or a cart permalink.
> Checkout Kit adds the required UCP query parameters automatically when it loads checkout,
> so you do not need to rewrite the URL yourself.

### Create an event processor

Extend `DefaultCheckoutEventProcessor` to observe the checkout lifecycle and integrate it with your app state:

```kotlin
val checkoutEventProcessor = object : DefaultCheckoutEventProcessor(activity) {
    override fun onCheckoutCompleted(checkoutCompletedEvent: CheckoutCompletedEvent) {
        // Reset cart state, update analytics, or navigate to confirmation UI.
    }

    override fun onCheckoutCanceled() {
        // Dismiss any app-level loading state or pending UI.
    }

    override fun onCheckoutFailed(error: CheckoutException) {
        // Report the error and decide whether to recreate the cart or retry.
    }
}
```

### Listen for UCP messages

Checkout Kit handles the low-level UCP handshake automatically. If you want typed callbacks for
checkout state changes exposed through the Universal Commerce Protocol (UCP), create a
`CheckoutProtocol.Client` and register only the notifications you need:

```kotlin
val checkoutProtocolClient = CheckoutProtocol.Client()
    .on(CheckoutProtocol.start) { checkout ->
        // Checkout is ready and interactive.
    }
    .on(CheckoutProtocol.complete) { checkout ->
        // Typed checkout payload emitted when checkout completes.
    }
    .on(CheckoutProtocol.error) { error ->
        // Typed UCP error payload emitted by checkout.
    }
    .on(CheckoutProtocol.totalsChange) { checkout ->
        // Totals, duties, or taxes changed in checkout.
    }
    .onOpenExternalUrl { uri ->
        startActivity(Intent(Intent.ACTION_VIEW, uri))
        true
    }
```

`communicationClient` is optional. Omit it if you only need the standard checkout lifecycle
callbacks from `DefaultCheckoutEventProcessor`. Use `onOpenExternalUrl` when you want to control
browser or app handoff for offsite flows; otherwise Checkout Kit falls back to standard link
handling through your event processor.

> [!TIP]
> While integrating UCP handlers, filter Logcat with `adb logcat -s CheckoutECP:D`
> to inspect protocol traffic.

### Present checkout

Present checkout from a `ComponentActivity` once you have a valid `checkoutUrl`:

```kotlin
fun presentCheckout(
    checkoutUrl: String,
    activity: ComponentActivity,
) {
    ShopifyCheckoutKit.present(
        checkoutUrl = checkoutUrl,
        context = activity,
        checkoutEventProcessor = checkoutEventProcessor,
        communicationClient = checkoutProtocolClient,
    )
}
```

### Refresh the checkout URL after cart changes

If the buyer updates the cart after you stored a `checkoutUrl`, fetch the latest cart state and use
the new `checkoutUrl` returned by Storefront API before presenting checkout:

```kotlin
fun onCartUpdated(
    cartId: ID,
) {
    val cartQuery = Storefront.query { query ->
        query.cart(cartId) {
            it.checkoutUrl()
        }
    }

    client.queryGraph(cartQuery).enqueue {
        if (it is GraphCallResult.Success) {
            val latestCheckoutUrl = it.response.data?.cart?.checkoutUrl
            // Store the updated checkout URL and present it when the buyer taps Checkout.
        }
    }
}
```

## Configuration

The SDK provides a way to customize the presented checkout experience via
the `ShopifyCheckoutKit.configure` function.

### Color Scheme

By default, the SDK will match the user's device color appearance. This behavior can be customized
via the `colorScheme` property:

```kotlin
ShopifyCheckoutKit.configure {
    // [Default] Automatically toggle idiomatic light and dark themes based on device preference.
    it.colorScheme = ColorScheme.Automatic()

    // Force idiomatic light color scheme
    it.colorScheme = ColorScheme.Light()

    // Force idiomatic dark color scheme
    it.colorScheme = ColorScheme.Dark()

    // Force web theme, as rendered by a mobile browser
    it.colorScheme = ColorScheme.Web()

    // Force web theme, passing colors for the modal header and background
    it.colorScheme = ColorScheme.Web(
        Colors(
            webViewBackground = Color.ResourceId(R.color.web_view_background),
            headerFont = Color.ResourceId(R.color.header_font),
            headerBackground = Color.ResourceId(R.color.header_background),
            progressIndicator = Color.ResourceId(R.color.progress_indicator),
        )
    )
}
```

> [!Tip]
> Colors can also be specified in sRGB format (e.g. `Color.SRGB(-0xff0001)`) and can also be overridden for Light/Dark/Automatic themes, (see example below)

```kotlin
val automatic = ColorScheme.Automatic(
    lightColors = Colors(
        headerBackground = Color.ResourceId(R.color.headerLight),
        headerFont = Color.ResourceId(R.color.headerFontLight),
        webViewBackground = Color.ResourceId(R.color.webViewBgLight),
        progressIndicator = Color.ResourceId(R.color.indicatorLight),
    ),
    darkColors = Colors(
        headerBackground = Color.ResourceId(R.color.headerDark),
        headerFont = Color.ResourceId(R.color.headerFontDark,
        webViewBackground = Color.ResourceId(R.color.webViewBgDark),
        progressIndicator = Color.ResourceId(R.color.indicatorDark),
    )
)
```

**Close Icon Customization**

The close icon in the checkout dialog header can be customized using the `customize` method for an ergonomic API:

```kotlin
ShopifyCheckoutKit.configure {
    it.colorScheme = ColorScheme.Light().customize {
        // Option 1: Just tint the default close icon
        closeIconTint = Color.ResourceId(R.color.my_custom_tint_color)

        // Option 2: Use a completely custom drawable
        closeIcon = DrawableResource(R.drawable.my_custom_close_icon)
    }
}
```

For automatic theme switching, you can provide different customizations for light and dark modes:

```kotlin
ShopifyCheckoutKit.configure {
    it.colorScheme = ColorScheme.Automatic().customize(
        light = {
            closeIconTint = Color.ResourceId(R.color.light_tint)
        },
        dark = {
            closeIconTint = Color.ResourceId(R.color.dark_tint)
        }
    )
}
```

> [!Note]
> If both `closeIcon` and `closeIconTint` are provided, the custom drawable (`closeIcon`) takes precedence and the tint is ignored.

The colors that can be modified are:

- headerBackground - Used to customize the background of the app bar on the dialog,
- headerFont - Used to customize the font color of the header text within in the app bar,
- webViewBackground - Used to customize the background color of the WebView,
- progressIndicator - Used to customize the color of the progress indicator shown when checkout is loading.
- closeIcon - Used to provide a completely custom close icon drawable
- closeIconTint - Used to tint the default close icon with a custom color

The current configuration can be obtained by calling `ShopifyCheckoutKit.getConfiguration()`.

### Log Level

Enable additional debug logs via the `logLevel` configuration option.

```kotlin
ShopifyCheckoutKit.configure {
    it.logLevel = LogLevel.DEBUG
}
```

### Checkout Dialog Title

To customize the title of the Dialog that the checkout WebView is displayed within, or to provide different values for the various locales your app supports, override the `checkout_web_view_title` String resource in your application, e.g:

```xml
<string name="checkout_web_view_title">Buy Now!</string>
```

## Monitoring the lifecycle of a checkout session

Extend the `DefaultCheckoutEventProcessor` abstract class to register callbacks for key lifecycle events during the checkout session:

```kotlin
val processor = object : DefaultCheckoutEventProcessor(activity) {
    override fun onCheckoutCompleted(checkoutCompletedEvent: CheckoutCompletedEvent) {
        // Called when the checkout was completed successfully by the buyer.
        // Use this to update UI, reset cart state, etc.
    }

    override fun onCheckoutCanceled() {
        // Called when the checkout was canceled by the buyer.
        // Note: This will also be received after closing a completed checkout
    }

    override fun onCheckoutFailed(error: CheckoutException) {
        // Called when the checkout encountered an error and has been aborted.
    }

    override fun onCheckoutLinkClicked(uri: Uri) {
        // Called when the buyer clicks a link within the checkout experience:
        // - email address (`mailto:`)
        // - telephone number (`tel:`)
        // - web (http:)
        // - deep link (e.g. myapp://checkout)
        // and is being directed outside the application.

        // Note: to support deep links on Android 11+ using the `DefaultCheckoutEventProcessor`,
        // the client app should add a queries element in its manifest declaring which apps it should interact with.
        // See the MobileBuyIntegration sample's manifest for an example.
        // Queries reference - https://developer.android.com/guide/topics/manifest/queries-element

        // If no app can be queried to deal with the link, the processor will log a warning:
        // `Unrecognized scheme for link clicked in checkout` along with the uri.
    }

    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams,
    ): Boolean {
        // Called to tell the client to show a file chooser. This is called to handle HTML forms with 'file' input type,
        // in response to the user pressing the "Select File" button.
        // To cancel the request, call filePathCallback.onReceiveValue(null) and return true.
    }

    override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
        // Called to tell the client to show a geolocation permissions prompt as a geolocation permissions
        // request has been made.
        // Invoked for example if a customer uses `Use my location` for pickup points
    }

    override fun onGeolocationPermissionsHidePrompt() {
        // Called to tell the client to hide the geolocation permissions prompt, e.g. as the request has been cancelled
    }

    override fun onPermissionRequest(permissionRequest: PermissionRequest) {
        // Called when a permission has been requested, e.g. to access the camera
        // implement to grant/deny/request permissions.
    }
}
```

> [!Note]
> The `DefaultCheckoutEventProcessor` provides default implementations for current and future callback functions (such as `onLinkClicked()`), which can be overridden by clients wanting to change default behavior.

### Error handling

Checkout errors are delivered through `onCheckoutFailed(error: CheckoutException)`. Treat these as
terminal for the currently presented checkout: dismiss any related UI, surface an appropriate
message, and decide whether the buyer should return to cart, retry with a fresh `checkoutUrl`, or
restart checkout entirely.

#### `CheckoutException`

| Exception Class                | Error Code                     | Description                                                                  | Recommendation                                                                              |
| ------------------------------ | ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ConfigurationException`       | 'storefront_password_required' | Access to checkout is password protected.                                    | We are working on ways to enable the Checkout Kit for usage with password protected stores. |
| `ConfigurationException`       | 'unknown'                      | Other configuration issue, see error details for more info.                  | Resolve the configuration issue in the error message.                                       |
| `CheckoutExpiredException`     | 'cart_expired'                 | The cart or checkout is no longer available.                                 | Create a new cart and open a new checkout URL.                                              |
| `CheckoutExpiredException`     | 'cart_completed'               | The cart associated with the checkout has completed checkout.                | Create new cart and open a new checkout URL.                                                |
| `CheckoutExpiredException`     | 'invalid_cart'                 | The cart associated with the checkout is invalid (e.g. empty).               | Create a new cart and open a new checkout URL.                                              |
| `CheckoutKitException`         | 'error_receiving_message'      | Checkout Kit failed to receive a message from checkout.                      | Dismiss checkout and let the buyer retry from your app.                                    |
| `CheckoutKitException`         | 'error_sending_message'        | Checkout Kit failed to send a message to checkout.                           | Dismiss checkout and let the buyer retry from your app.                                    |
| `CheckoutKitException`         | 'render_process_gone'          | The render process for the checkout WebView is gone.                         | Dismiss checkout and let the buyer retry from your app.                                    |
| `CheckoutKitException`         | 'unknown'                      | An error in Checkout Kit has occurred, see error details for more info.      | Dismiss checkout and let the buyer retry from your app.                                    |
| `HttpException`                | 'http_error'                   | An unexpected server error has been encountered.                             | Show an error and retry from your cart or fetch a fresh checkout URL.                      |
| `ClientException`              | 'client_error'                 | An unhandled client error was encountered.                                   | Show an error and retry from your cart or fetch a fresh checkout URL.                      |
| `CheckoutUnavailableException` | 'unknown'                      | Checkout is unavailable for another reason, see error details for more info. | Show an error and retry from your cart or fetch a fresh checkout URL.                      |

## Integrating identity & customer accounts

Buyer-aware checkout experience reduces friction and increases conversion. Depending on the context
of the buyer (guest or signed-in), knowledge of buyer preferences, or account/identity system, the
application can use on of the following methods to initialize personalized and contextualized buyer
experience.

### Cart: buyer bag, identity, and preferences

In addition to specifying the line items, the Cart can include buyer identity (name, email, address,
etc.), and delivery and payment preferences:
see [guide](https://shopify.dev/docs/custom-storefronts/building-with-the-storefront-api/cart/manage).
Included information will be used to present pre-filled and pre-selected choices to the buyer within
checkout.

### Multipass

[Shopify Plus](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-plus-plan)
merchants
using [Classic Customer Accounts](https://help.shopify.com/en/manual/customers/customer-accounts/classic-customer-accounts)
can use [Multipass](https://shopify.dev/docs/api/multipass) to integrate an external identity system
and initialize a buyer-aware checkout session.

```json
{
  "email": "<Customer's email address>",
  "created_at": "<Current timestamp in ISO8601 encoding>",
  "remote_ip": "<Client IP address>",
  "return_to": "<Checkout URL obtained from Storefront API>",
  ...
}
```

1. Follow the [Multipass documentation](https://shopify.dev/docs/api/multipass) to create a
   multipass
   URL and set the `'return_to'` to be the obtained `checkoutUrl`
2. Provide the Multipass URL to `ShopifyCheckoutKit.present()`.

> [!Important]
> the above JSON omits useful customer attributes that should be provided where possible and
> encryption and signing should be done server-side to ensure Multipass keys are kept secret.

> [!NOTE]
> Multipass URLs are single-use. If a checkout attempt with a Multipass URL fails, generate a new
> token before presenting checkout again.

### Shop Pay

To initialize accelerated Shop Pay checkout, the cart can set a
[walletPreference](https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate#field-cartbuyeridentityinput-walletpreferences)
to 'shop_pay'. The sign-in state of the buyer is app-local and the buyer will be prompted to sign in
to their Shop account on their first checkout, and their sign-in state will be remembered for future
checkout sessions.

### Customer Account API

The Customer Account API allows you to authenticate buyers and provide a personalized checkout experience.
For detailed implementation instructions, see our [Customer Account API Authentication Guide](https://shopify.dev/docs/storefronts/headless/mobile-apps/checkout-kit/authenticate-checkouts).

---

## Contributing

We welcome code contributions, feature requests, and reporting of issues. Please
see [guidelines and instructions](.github/CONTRIBUTING.md).

## License

Shopify's Checkout Kit is provided under an [MIT License](LICENSE).
