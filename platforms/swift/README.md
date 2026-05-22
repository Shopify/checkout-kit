# Shopify Checkout Kit - Swift

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](https://github.com/Shopify/checkout-kit/blob/main/LICENSE) [![Swift Package Manager compatible](https://img.shields.io/badge/Swift%20Package%20Manager-compatible-2ebb4e.svg?style=flat)](https://swift.org/package-manager/) [![GitHub Release](https://img.shields.io/github/release/shopify/checkout-kit.svg?style=flat)]()
<img width="3200" height="800" alt="gradients" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

> [!WARNING]
> **Alpha — early preview.** This software is an early preview and is **not**
> production-ready. Stability is not guaranteed, and breaking changes may
> occur in any release. See [Getting Started](#getting-started).

**Shopify Checkout Kit** is a Swift Package library that enables Swift apps to provide the world’s highest converting, customizable, one-page checkout within the app. The presented experience is a fully-featured checkout that preserves all of the store customizations: Checkout UI extensions, Functions, branding, and more. It also provides platform idiomatic defaults such as support for light and dark mode, and convenient developer APIs to embed, customize, and follow the lifecycle of the checkout experience. Check out our blog to [learn how and why we built the Checkout Kit](https://www.shopify.com/partners/blog/mobile-checkout-sdks-for-ios-and-android).

- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Package.swift](#packageswift)
  - [Xcode](#xcode)
  - [CocoaPods](#cocoapods)
- [Programmatic Usage](#programmatic-usage)
- [SwiftUI Usage](#swiftui-usage)
- [Configuration](#configuration)
  - [`colorScheme`](#colorscheme)
  - [`tintColor`](#tintcolor)
  - [`backgroundColor`](#backgroundcolor)
  - [`title`](#title)
  - [`closeButtonTintColor`](#closebuttontintcolor)
  - [SwiftUI Configuration](#swiftui-configuration)
- [Monitoring the lifecycle of a checkout session](#monitoring-the-lifecycle-of-a-checkout-session)
- [Error handling](#error-handling)
  - [`CheckoutError`](#checkouterror)
- [Integrating identity \& customer accounts](#integrating-identity--customer-accounts)
  - [Cart: buyer bag, identity, and preferences](#cart-buyer-bag-identity-and-preferences)
  - [Multipass](#multipass)
  - [Shop Pay](#shop-pay)
  - [Customer Account API](#customer-account-api)
- [Offsite Payments](#offsite-payments)
- [Accelerated Checkouts](#accelerated-checkouts)
  - [Prerequisites](#prerequisites)
  - [Install the package](#install-the-package)
  - [Configure the integration](#configure-the-integration)
  - [Render accelerated checkout buttons](#render-accelerated-checkout-buttons)
    - [Customize wallet options](#customize-wallet-options)
    - [Modify the Apple Pay button label](#modify-the-apple-pay-button-label)
    - [Customize the Apple Pay button style](#customize-the-apple-pay-button-style)
    - [Customize button corners](#customize-button-corners)
  - [Handle loading, errors, and lifecycle events](#handle-loading-errors-and-lifecycle-events)
  - [Troubleshooting](#troubleshooting)
- [Explore the sample apps](#explore-the-sample-apps)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- Swift 5.7+
- iOS 13.0+ for Checkout Kit, iOS 16+ for Accelerated Checkouts

## Getting Started

The SDK is an open-source [Swift Package library](https://www.swift.org/package-manager/). As a quick start, see [sample projects](Samples/README.md) or use one of the following ways to integrate the SDK into your project:

### Package.swift

```swift
dependencies: [
  .package(url: "https://github.com/Shopify/checkout-kit", from: "3")
]
```

### Xcode

1. Open your Xcode project
2. Navigate to `File` > `Add Package Dependencies...`
3. Enter `https://github.com/Shopify/checkout-kit` into the search box
4. Click `Add Package`

For more details on managing Swift Package dependencies in Xcode, please see [Apple's documentation](https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app).

### CocoaPods

```ruby
pod "ShopifyCheckoutKit", "~> 3"
```

For more information on CocoaPods, please see their [getting started guide](https://guides.cocoapods.org/using/getting-started.html).

## Programmatic Usage

Once the SDK has been added as a dependency, you can import the library:

```swift
import ShopifyCheckoutKit
```

To present a checkout to the buyer, your application must first obtain a checkout URL. The most common way is to use the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront) to assemble a cart (via `cartCreate` and related update mutations) and load the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/2023-10/objects/Cart#field-cart-checkouturl). Alternatively, a [cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink) can be provided. You can use any GraphQL client to obtain a checkout URL and we recommend Shopify's [Mobile Buy SDK for iOS](https://github.com/Shopify/mobile-buy-sdk-ios) to simplify the development workflow:

```swift
import Buy

let client = Graph.Client(
  shopDomain: "yourshop.myshopify.com",
  apiKey: "<storefront access token>"
)

let query = Storefront.buildQuery { $0
  .cart(id: "myCartId") { $0
    .checkoutUrl()
  }
}

let task = client.queryGraphWith(query) { response, error in
  let checkoutURL = response?.cart.checkoutUrl
}
task.resume()
```

The `checkoutURL` object is a standard web checkout URL that can be opened in any browser. To present a native checkout sheet in your application, provide the `checkoutURL` alongside optional runtime configuration settings to the `present(checkout:)` function provided by the SDK:

```swift
import UIKit
import ShopifyCheckoutKit

class MyViewController: UIViewController {
  func presentCheckout() {
    let checkoutURL: URL = // from cart object
    ShopifyCheckoutKit.present(checkout: checkoutURL, from: self, delegate: self)
  }
}
```

## SwiftUI Usage

```swift
import SwiftUI
import ShopifyCheckoutKit

struct ContentView: View {
  @State var isPresented = false
  @State var checkoutURL: URL?

  var body: some View {
    Button("Checkout") {
      isPresented = true
    }
    .sheet(isPresented: $isPresented) {
      if let url = checkoutURL {
        ShopifyCheckout(checkout: url)
           /// Configuration
           .title("Checkout")
           .colorScheme(.automatic)
           .tintColor(.blue)
           .backgroundColor(.white)
           .closeButtonTintColor(.red)

           /// Lifecycle events
           .onCancel {
             isPresented = false
           }
           .onFail { error in
             handleError(error)
           }
           .edgesIgnoringSafeArea(.all)
      }
    }
  }
}
```

## Configuration

The SDK provides a way to customize the presented checkout experience via the `ShopifyCheckoutKit.configuration` object.

### `colorScheme`

By default, the SDK will match the user's device color appearance. This behavior can be customized via the `colorScheme` property:

```swift
// [Default] Automatically toggle idiomatic light and dark themes based on device preference (`UITraitCollection`)
ShopifyCheckoutKit.configuration.colorScheme = .automatic

// Force idiomatic light color scheme
ShopifyCheckoutKit.configuration.colorScheme = .light

// Force idiomatic dark color scheme
ShopifyCheckoutKit.configuration.colorScheme = .dark

// Force web theme, as rendered by a mobile browser
ShopifyCheckoutKit.configuration.colorScheme = .web
```

### `tintColor`

If the checkout session is not ready and being initialized, a progress bar is shown and can be customized via the `tintColor` property:

```swift
// Use a custom UI color
ShopifyCheckoutKit.configuration.tintColor = UIColor(red: 0.09, green: 0.45, blue: 0.69, alpha: 1.00)

// Use a system color
ShopifyCheckoutKit.configuration.tintColor = .systemBlue
```

### `backgroundColor`

While the checkout session is being initialized, the background color of the view can be customized via the `backgroundColor` property:

```swift
// Use a custom UI color
ShopifyCheckoutKit.configuration.backgroundColor = UIColor(red: 0.09, green: 0.45, blue: 0.69, alpha: 1.00)

// Use a system color
ShopifyCheckoutKit.configuration.backgroundColor = .systemBackground
```

### `title`

By default, the Checkout Kit will look for a `shopify_checkout_kit_title` key in a `Localizable.xcstrings` file to set the sheet title, otherwise it will fallback to "Checkout" across all locales.

The title of the sheet can be customized by either setting a value for the `shopify_checkout_kit_title` key in the `Localizable.xcstrings` file for your application or by configuring the `title` property of the `ShopifyCheckoutKit.configuration` object manually.

```swift
// Hardcoded title, applicable to all languages
ShopifyCheckoutKit.configuration.title = "Custom title"
```

Here is an example of a `Localizable.xcstrings` containing translations for 2 locales - `en` and `fr`.

```json
{
  "sourceLanguage": "en",
  "strings": {
    "shopify_checkout_kit_title": {
      "extractionState": "manual",
      "localizations": {
        "en": {
          "stringUnit": {
            "state": "translated",
            "value": "Checkout"
          }
        },
        "fr": {
          "stringUnit": {
            "state": "translated",
            "value": "Caisse"
          }
        }
      }
    }
  }
}
```

### `closeButtonTintColor`

The color of the close button in the navigation bar can be customized via the `closeButtonTintColor` property. When set to a custom color, the close button will use a custom SF Symbol (`xmark.circle.fill`) with the specified tint color. When set to `nil` (default), the standard system close button appearance is used.

```swift
// Use a custom UI color
ShopifyCheckoutKit.configuration.closeButtonTintColor = UIColor(red: 0.09, green: 0.45, blue: 0.69, alpha: 1.00)

// Use a system color
ShopifyCheckoutKit.configuration.closeButtonTintColor = .systemRed
```

### SwiftUI Configuration

Similarly, configuration modifiers are available to set the configuration of your checkout when using SwiftUI:

```swift
ShopifyCheckout(checkout: checkoutURL)
  .title("Checkout")
  .colorScheme(.automatic)
  .tintColor(.blue)
  .backgroundColor(.black)
  .closeButtonTintColor(.red)
```

## Monitoring the lifecycle of a checkout session

You can use the `CheckoutDelegate` protocol to register callbacks for lifecycle events the host app needs to react to:

```swift
extension MyViewController: CheckoutDelegate {
  func checkoutDidCancel() {
    // Called when the checkout was canceled by the buyer.
    // Use this to call `dismiss(animated:)`, etc.
  }

  func checkoutDidFail(error: CheckoutError) {
    // Called when the checkout encountered an error and has been aborted. The callback
    // provides a `CheckoutError` enum, with one of the following cases:

    // Internal error: exception within the Checkout SDK code.
    // Inspect the underlying error to identify the problem.
    case sdkError(underlying: Swift.Error)

    // Checkout cannot be initiated or completed, e.g. due to network or server-side error.
    // The provided message describes the error and may be logged and presented to the buyer.
    case checkoutUnavailable(message: String, code: CheckoutUnavailable)

    // Checkout session associated with the provided checkoutURL is no longer available.
    // The provided message describes the error and may be logged and presented to the buyer.
    case checkoutExpired(message: String, code: CheckoutErrorCode)
  }
}
```

Completion events and other in-checkout messages flow through `CheckoutCommunicationProtocol` (UCP) — register handlers on a `CheckoutProtocol.Client` and pass it to `present(checkout:from:delegate:client:)`. See `Samples/MobileBuyIntegration` for a full example.

## Error handling

Errors are forwarded to `checkoutDidFail(error:)`. The dialog dismisses after the delegate is invoked.

### `CheckoutError`

| Type                                                            | Description                                | Recommendation                                                                              |
| --------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `.checkoutUnavailable(message: "Forbidden")`                    | Access to checkout is forbidden.           | Treat as fatal for this session.                                                            |
| `.checkoutUnavailable(message: "Internal Server Error")`        | An internal server error occurred.         | Likely ephemeral — retry by opening a fresh checkout URL.                                   |
| `.checkoutUnavailable(message: "Storefront password required")` | Access to checkout is password restricted. | We are working on ways to enable the Checkout Kit for usage with password protected stores. |
| `.checkoutExpired(message: "Checkout already completed")`       | The checkout has already been completed    | If this is incorrect, create a new cart and open a new checkout URL.                        |
| `.checkoutExpired(message: "Cart is empty")`                    | The cart session has expired.              | Create a new cart and open a new checkout URL.                                              |
| `.sdkError(underlying:)`                                        | An error was thrown internally.            | Please open an issue in this repo with as much detail as possible.                          |

## Integrating identity & customer accounts

Buyer-aware checkout experience reduces friction and increases conversion. Depending on the context of the buyer (guest or signed-in), knowledge of buyer preferences, or account/identity system, the application can use one of the following methods to initialize a personalized and contextualized buyer experience.

### Cart: buyer bag, identity, and preferences

In addition to specifying the line items, the Cart can include buyer identity (name, email, address, etc.), and delivery and payment preferences: see [guide](https://shopify.dev/docs/custom-storefronts/building-with-the-storefront-api/cart/manage). Included information will be used to present pre-filled and pre-selected choices to the buyer within checkout.

### Multipass

[Shopify Plus](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-plus-plan) merchants using [Classic Customer Accounts](https://help.shopify.com/en/manual/customers/customer-accounts/classic-customer-accounts) can use [Multipass](https://shopify.dev/docs/api/multipass) ([API documentation](https://shopify.dev/docs/api/multipass)) to integrate an external identity system and initialize a buyer-aware checkout session.

```json
{
  "email": "<Customer's email address>",
  "created_at": "<Current timestamp in ISO8601 encoding>",
  "remote_ip": "<Client IP address>",
  "return_to": "<Checkout URL obtained from Storefront API>"
}
```

1. Follow the [Multipass documentation](https://shopify.dev/docs/api/multipass) to create a Multipass URL and set `return_to` to be the obtained `checkoutUrl`
2. Provide the Multipass URL to `present(checkout:)`

> [!IMPORTANT]
> The above JSON omits useful customer attributes that should be provided where possible and encryption and signing should be done server-side to ensure Multipass keys are kept secret.

> [!NOTE]
> Multipass tokens are single-use. If a request containing a multipass URL fails, generate a fresh token before re-opening checkout.

### Shop Pay

To initialize accelerated Shop Pay checkout, the cart can set a [walletPreference](https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate#field-cartbuyeridentityinput-walletpreferences) to 'shop_pay'. The sign-in state of the buyer is app-local. The buyer will be prompted to sign in to their Shop account on their first checkout, and their sign-in state will be remembered for future checkout sessions.

### Customer Account API

The Customer Account API allows you to authenticate buyers and provide a personalized checkout experience.
For detailed implementation instructions, see our [Customer Account API Authentication Guide](https://shopify.dev/docs/storefronts/headless/mobile-apps/checkout-kit/authenticate-checkouts).

## Offsite Payments

Certain payment providers finalize transactions by redirecting customers to external banking apps. To enhance the user experience for your buyers, you can set up your storefront to support Universal Links on iOS, allowing customers to be redirected back to your app once the payment is completed.

See the [Universal Links guide](https://github.com/Shopify/checkout-kit/blob/main/platforms/swift/documentation/universal_links.md) for information on how to get started with adding support for Offsite Payments in your app.

External links opened from within checkout (HTTPS, deep links, `mailto:`, `tel:`) are forwarded to `UIApplication.shared.open(_:)` by the kit, so universal links and Offsite Payments redirects route back to your app automatically once the rest of the universal-links setup is in place.

## Accelerated Checkouts

Accelerated checkout buttons surface Apple Pay and Shop Pay options earlier in the buyer journey so more orders complete without leaving your app. For an end-to-end walkthrough see the [`ShopifyAcceleratedCheckoutsApp` sample](Samples/ShopifyAcceleratedCheckoutsApp).

### Prerequisites

- iOS 16 or later
- The `write_cart_wallet_payments` access scope ([request access](https://www.appsheet.com/start/1ff317b6-2da1-4f39-b041-c01cfada6098))
- Apple Pay payment processing certificates ([setup guide](https://shopify.dev/docs/storefronts/mobile/create-apple-payment-processing-certificates))
- A device configured for Apple Pay ([Apple setup instructions](https://developer.apple.com/documentation/passkit/setting-up-apple-pay))

### Install the package

Update your package manifest to import `ShopifyAcceleratedCheckouts` alongside `ShopifyCheckoutKit`.

```swift
dependencies: [
  .package(url: "https://github.com/Shopify/checkout-kit", from: "3.8.0")
]
```

Then add the product to your target dependencies:

```swift
.target(
    name: "YourApp",
    dependencies: ["ShopifyAcceleratedCheckouts"]
)
```

### Configure the integration

Create a configuration object that connects the accelerated checkout buttons to your storefront. Provide the domain, Storefront API access token, and optionally the current customer.

```swift
import ShopifyAcceleratedCheckouts

// For authenticated customers (logged in with Shopify account)
let configuration = ShopifyAcceleratedCheckouts.Configuration(
    storefrontDomain: "your-shop.myshopify.com",
    storefrontAccessToken: "your-storefront-access-token",
    customer: ShopifyAcceleratedCheckouts.Customer(
        customerAccessToken: "customer-access-token"
    )
)

// For guest customers (or explicit contact override)
let configuration = ShopifyAcceleratedCheckouts.Configuration(
    storefrontDomain: "your-shop.myshopify.com",
    storefrontAccessToken: "your-storefront-access-token",
    customer: ShopifyAcceleratedCheckouts.Customer(
        email: "customer@example.com",
        phoneNumber: "0123456789"
    )
)
```

> [!WARNING]
> Do not provide both `customerAccessToken` and `email`/`phoneNumber` together. For authenticated customers, email and phone are fetched automatically from the Shopify account.

> [!TIP]
> Pass `nil` for `customer` when the buyer is anonymous, and update the configuration later when their details are known.

> [!NOTE]
> When using the cart ID flow, if customer contact information exists in both `config.customer` and the cart's `buyerIdentity`, the `config.customer` values take precedence.

Configure Apple Pay with your merchant identifier, required contact fields, and any shipping restrictions.

```swift
let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
    merchantIdentifier: "merchant.com.yourcompany",
    contactFields: [.email, .phone]
)
```

Use the `contactFields` parameter to request specific details from the buyer's Apple Pay sheet. Provide any
combination of `.email` and `.phone`. If you omit the parameter (or pass an empty array), Apple Pay still prompts for an
email address unless it already has one for the buyer (for example, when you supply `customer.email`).

```swift
// Require only an email address
let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
    merchantIdentifier: "merchant.com.yourcompany",
    contactFields: [.email]
)

// Require only a phone number
let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
    merchantIdentifier: "merchant.com.yourcompany",
    contactFields: [.phone]
)

// Default behaviour: Apple Pay prompts for email unless it already has one
let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
    merchantIdentifier: "merchant.com.yourcompany"
)
```

If you need to limit shipping destinations, pass ISO 3166-1 alpha-2 country codes to `supportedShippingCountries`.
Leave the parameter as `nil` (the default) to accept all countries and only restrict shipping when Apple Pay cannot
technically support a destination.

```swift
// Allow shipping to the United States and Canada only
let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
    merchantIdentifier: "merchant.com.yourcompany",
    contactFields: [.email, .phone],
    supportedShippingCountries: ["US", "CA"]
)
```

Inject both configuration objects into your SwiftUI hierarchy so every `AcceleratedCheckoutButtons` instance can read them:

```swift
@main
struct MyApp: App {
    let configuration = ShopifyAcceleratedCheckouts.Configuration(...)
    let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(...)

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(configuration)
                .environmentObject(applePayConfig)
        }
    }
}
```

If you are building a UIKit surface, wrap the SwiftUI buttons with a `UIHostingController` and provide the same environment objects before adding the view to your hierarchy.

### Render accelerated checkout buttons

Use `AcceleratedCheckoutButtons` to attach accelerated checkout calls-to-action to product or cart surfaces once you have a valid cart ID or product variant ID from the Storefront API. Guard the component with `#available(iOS 16.0, *)` if your app still supports older OS versions.

```swift
if #available(iOS 16.0, *) {
    AcceleratedCheckoutButtons(cartID: cartID)
        .wallets([..shopPay, .applePay])
}
```

#### Customize wallet options

Accelerated checkout buttons display every available wallet by default. Use `.wallets(_:)` to show a subset or adjust the
order shoppers see them in.

```swift
// Display only Shop Pay
AcceleratedCheckoutButtons(cartID: cartID)
    .wallets([.shopPay])

// Display Shop Pay first, then Apple Pay
AcceleratedCheckoutButtons(cartID: cartID)
    .wallets([.shopPay, .applePay])
```

#### Modify the Apple Pay button label

Use `.applePayLabel(_:)` to map to the native `PayWithApplePayButtonLabel` values. The default is `.plain`.

```swift
AcceleratedCheckoutButtons(cartID: cartID)
    .applePayLabel(.buy)
```

#### Customize the Apple Pay button style

Use `.applePayStyle(_:)` to set the color style of the Apple Pay button. The modifier accepts a `PayWithApplePayButtonStyle` value. The default is `.automatic`, which adapts to the current appearance (light/dark mode).

```swift
AcceleratedCheckoutButtons(cartID: cartID)
    .applePayStyle(.whiteOutline)
```

#### Customize button corners

The `.cornerRadius(_:)` modifier lets you match the buttons to other calls-to-action in your app. Buttons default to an
8 pt radius.

```swift
// Pill-shaped buttons
AcceleratedCheckoutButtons(cartID: cartID)
    .cornerRadius(16)

// Square buttons
AcceleratedCheckoutButtons(cartID: cartID)
    .cornerRadius(0)
```

For custom layouts, compose the buttons inside your own SwiftUI view and reuse that view across surfaces.

### Handle loading, errors, and lifecycle events

Listen for render state changes so you can display matching loading or error UI and only show the buttons when they are ready.

```swift
@State private var renderState: RenderState = .loading

var body: some View {
    if case .loading = renderState {
        ProgressView()
    }

    if case .error = renderState {
        ErrorStateView()
    }

    AcceleratedCheckoutButtons(cartID: cartID)
        .onRenderStateChange { state in
            renderState = state
        }
}
```

Attach lifecycle handlers to respond when buyers finish, cancel, or encounter an error. Clearing the cart after a successful accelerated checkout prevents reuse of an expired cart ID.

```swift
AcceleratedCheckoutButtons(cartID: cartID)
    .onComplete { _ in
        cartManager.clearCart()
    }
    .onFail { error in
        logger.error("Accelerated checkout failed: \(error)")
    }
    .onCancel {
        analytics.track(.acceleratedCheckoutCancelled)
    }
    .onClickLink { url in
        UIApplication.shared.open(url)
    }
```

### Troubleshooting

- Increase verbosity during development with `ShopifyAcceleratedCheckouts.logLevel = .all` and `ShopifyCheckoutKit.configuration.logLevel = .all`.
- If the Apple Pay sheet dismisses immediately, verify your merchant ID configuration in the Apple Developer portal and Xcode signing settings.

---

## Explore the sample apps

See the [Samples](Samples) directory for a handful of sample iOS applications and a guide to get started.

## Contributing

We welcome code contributions, feature requests, and reporting of issues. Please see [guidelines and instructions](.github/CONTRIBUTING.md).

## License

Shopify's Checkout Kit is provided under an [MIT License](LICENSE).
