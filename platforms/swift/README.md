# Shopify Checkout Kit - Swift

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](../../LICENSE)
[![Swift Package Manager compatible](https://img.shields.io/badge/Swift%20Package%20Manager-compatible-2ebb4e.svg?style=flat)](https://swift.org/package-manager/)

<img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

> [!WARNING]
> **Alpha - early preview.** This software is an early preview and is **not**
> production-ready. The current Checkout Kit for Swift alpha is `4.0.0-alpha.5`.
> Stability is not guaranteed, and breaking changes may occur in any release.

**Checkout Kit for Swift** lets iOS apps present Shopify checkout in a native sheet while preserving store checkout customizations such as Checkout UI extensions, Shopify Functions, branding, and supported payment methods. The Swift package also includes `ShopifyAcceleratedCheckouts`, a SwiftUI library for rendering Shop Pay and Apple Pay buttons on iOS 16+.

- [Requirements](#requirements)
- [Install](#install)
  - [Swift Package Manager](#swift-package-manager)
  - [CocoaPods](#cocoapods)
- [Get a checkout URL](#get-a-checkout-url)
- [Present checkout](#present-checkout)
  - [UIKit](#uikit)
  - [SwiftUI](#swiftui)
- [Preload checkout](#preload-checkout)
- [Configure checkout](#configure-checkout)
  - [Incoming message origin validation](#incoming-message-origin-validation)
  - [Current configuration](#current-configuration)
- [Checkout lifecycle](#checkout-lifecycle)
  - [Error handling](#error-handling)
- [Authentication and buyer identity](#authentication-and-buyer-identity)
- [Offsite payments and links](#offsite-payments-and-links)
- [Geolocation and pickup points](#geolocation-and-pickup-points)
- [Accelerated Checkouts](#accelerated-checkouts)
  - [Prerequisites](#prerequisites)
  - [Configure accelerated checkouts](#configure-accelerated-checkouts)
  - [Render buttons](#render-buttons)
- [Troubleshooting](#troubleshooting)
- [Samples](#samples)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- Swift Package Manager with Swift tools 6.0+
- iOS 15.0+ for `ShopifyCheckoutKit`
- iOS 16.0+ for `ShopifyAcceleratedCheckouts`
- A checkout URL from `cart.checkoutUrl` or a cart permalink

## Install

The current Checkout Kit for Swift alpha is `4.0.0-alpha.5`. For alpha testing, use that exact version until a stable `4.x` release is available.

### Swift Package Manager

Add the repository from Xcode with **File > Add Package Dependencies...**:

```text
https://github.com/Shopify/checkout-kit
```

Or add it to `Package.swift`:

```swift
dependencies: [
  .package(url: "https://github.com/Shopify/checkout-kit", exact: "4.0.0-alpha.5")
]
```

Then add the products you need to your app target:

```swift
.target(
  name: "YourApp",
  dependencies: [
    "ShopifyCheckoutKit",
    "EmbeddedCheckoutProtocol",
    "ShopifyAcceleratedCheckouts" // Only needed for accelerated checkout buttons.
  ]
)
```

### CocoaPods

```ruby
pod "ShopifyCheckoutKit", "4.0.0-alpha.5"

# Optional: Shop Pay and Apple Pay accelerated checkout buttons.
pod "ShopifyCheckoutKit/AcceleratedCheckouts", "4.0.0-alpha.5"
```

## Get a checkout URL

Checkout Kit presents a standard Shopify checkout URL. The common flow is:

1. Create or update a cart with the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront), for example with [`cartCreate`](https://shopify.dev/docs/api/storefront/2026-04/mutations/cartCreate) and related cart mutations.
2. Read the cart's [`checkoutUrl`](https://shopify.dev/docs/api/storefront/2026-04/objects/Cart#field-cart-checkouturl).
3. Pass that URL, or a [cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink), to Checkout Kit.

You can use any GraphQL client. The sample app uses Apollo iOS and is a complete reference for a modern Storefront API integration.

For production use, see the [Storefront API GraphiQL Explorer](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started) for schema exploration and the [`cartCreate`](https://shopify.dev/docs/api/storefront/2026-04/mutations/cartCreate) mutation reference for the full input shape, including buyer identity, attributes, discount codes, and delivery preferences.

## Present checkout

### UIKit

```swift
import ShopifyCheckoutKit
import UIKit

final class CartViewController: UIViewController, CheckoutDelegate {
  func presentCheckout(checkoutURL: URL) {
    ShopifyCheckoutKit.present(
      checkout: checkoutURL,
      from: self,
      delegate: self
    )
  }

  func checkoutDidDismiss() {
    // The buyer dismissed checkout.
  }

  func checkoutDidFail(error: CheckoutError) {
    // Show an error state, retry with a new cart, or log the SDK error.
  }
}
```

### SwiftUI

```swift
import ShopifyCheckoutKit
import SwiftUI

struct CartView: View {
  @State private var isPresented = false
  let checkoutURL: URL

  var body: some View {
    Button("Checkout") {
      isPresented = true
    }
    .sheet(isPresented: $isPresented) {
      ShopifyCheckout(checkout: checkoutURL)
        .title("Checkout")
        .appearance(.storefront)
        .tintColor(.systemBlue)
        .backgroundColor(.systemBackground)
        .closeButtonTintColor(nil)
        .onDismiss {
          isPresented = false
        }
        .onFail { error in
          handleCheckoutError(error)
        }
        .ignoresSafeArea()
    }
  }
}
```

Checkout Kit adds the required UCP query parameters automatically when it loads checkout.

## Preload checkout

Call `preload` when your app has a strong signal that the buyer is likely to check out soon, such as when they open the cart screen or move toward a checkout action:

```swift
ShopifyCheckoutKit.preload(checkout: checkoutURL)
```

`preload` returns an optional `CheckoutPreload` handle. You can ignore it when preloading is only a performance hint, or retain it to observe the preload lifecycle:

```swift
let preload = ShopifyCheckoutKit.preload(checkout: checkoutURL)
preload?.onStateChange = { state in
  switch state {
  case .loading:
    showPreloadProgress()
  case .ready:
    enableCheckoutAffordance()
  case .failed(let reason):
    recordPreloadFailure(reason)
  case .expired, .idle:
    break
  }
}

if preload == nil {
  // Preloading is disabled.
  // Calling present still loads checkout normally.
}
```

`onStateChange` receives the current state immediately, followed by state changes. The preload cache has one weak observer, so a later `preload` call replaces the observer associated with an earlier handle; retain the latest handle for as long as you need to observe state. When `present` reuses a preload, its handle also stops receiving updates and retains its last observed state, which may be `.loading`.

A successful background preload normally transitions from `.loading` to `.ready`. `.idle` means the preload was intentionally abandoned or became inapplicable, such as after explicit invalidation, disabling preloading, activity destruction, or a checkout URL mismatch. `.failed` means the SDK could not maintain usable preloaded web content; present still creates checkout normally.

| State | Meaning |
| --- | --- |
| `.loading` | The background checkout WebView is loading. |
| `.ready` | The preload finished and can be used for the matching checkout URL. |
| `.idle` | The preload was invalidated or otherwise cleared. |
| `.expired` | The cached preload exceeded its lifetime before it could be used. |
| `.failed(reason:)` | An HTTP, navigation, or web-content failure occurred while preloading. |

`preload` returns `nil` when preloading is disabled.

Checkout Kit can reuse a matching preloaded checkout when `present` is called later:

```swift
ShopifyCheckoutKit.present(
  checkout: checkoutURL,
  from: self,
  delegate: self
)
```

Preloading is a best-effort performance hint, not a guarantee. If the preload is unavailable, incomplete, or for a different checkout URL, checkout loads normally during presentation. A preloaded checkout reflects the cart represented by the URL passed to `preload`, so call `preload` again after cart changes produce a new checkout URL.

Avoid preloading on every add-to-cart or cart mutation. Preload only when buyer intent is strong enough to justify the additional client and network work.

Clear unused preloaded checkout work with `invalidate`:

```swift
ShopifyCheckoutKit.invalidate()
```

Preloading is enabled by default. Disable it when appropriate, for example for data-saver modes or app-specific runtime conditions:

```swift
ShopifyCheckoutKit.configure {
  $0.preloading.enabled = false
}
```

## Configure checkout

Configure global presentation defaults before presenting checkout:

```swift
import ShopifyCheckoutKit

ShopifyCheckoutKit.configure {
  $0.appearance = .storefront
  $0.tintColor = .systemBlue
  $0.backgroundColor = .systemBackground
  $0.closeButtonTintColor = nil
  $0.logLevel = .debug
}
```

SwiftUI modifiers such as `.appearance(...)`, `.tintColor(...)`, and `.title(...)` override these defaults only for that `ShopifyCheckout` value. They do not mutate `ShopifyCheckoutKit.configuration` or invalidate a cached preload.

| Option | Default | Purpose |
| --- | --- | --- |
| `appearance` | `.storefront` | Match the storefront's web checkout branding with a light color scheme, or use the Checkout Kit style with `.app(.automatic)`, `.app(.light)`, or `.app(.dark)`. |
| `tintColor` | Shopify blue | Progress indicator color while checkout initializes. |
| `backgroundColor` | `.systemBackground` | Background behind the web view while checkout initializes. |
| `title` | Localized `shopify_checkout_kit_title` or `Checkout` | Navigation title for the checkout sheet. |
| `closeButtonTintColor` | `nil` | Optional tint for the close button. |
| `logLevel` | `.warn` | SDK logging verbosity. Threshold-ordered `.debug` → `.warn` → `.error` → `.none`; use `.debug` during integration. |
| `preloading.enabled` | `true` | Enables best-effort checkout preloading before presentation. |
| `allowedMessageOrigins` | `[]` | Origins trusted to send incoming checkout messages. Empty trusts every origin (open by default). See [Incoming message origin validation](#incoming-message-origin-validation). |

To localize the title, add `shopify_checkout_kit_title` to your app's `Localizable.xcstrings`.

### Incoming message origin validation

The native web view is a private, app-controlled runtime, so Checkout Kit is
**open by default**: with an empty `allowedMessageOrigins`, incoming
checkout-protocol messages from any origin are accepted. Provide one or more
origins to restrict which origins are trusted; the loaded checkout origin and
`shop.app` (including its subdomains) are always trusted as well.

```swift
ShopifyCheckoutKit.configure {
  $0.allowedMessageOrigins = [
    "https://checkout.example.com",
    "https://*.example.com",
  ]
}
```

Each entry may be an exact origin (`https://example.com`), a wildcard subdomain
(`https://*.example.com`, matching subdomains but not the apex), or `"*"` to
explicitly trust every origin.

Exact and wildcard entries accept an optional trailing slash. Exact entries
must not include credentials, paths, queries, or fragments. For example,
`https://example.com/` is accepted, while `https://user@example.com` and
`https://example.com/path` are ignored.

Rejected messages are dropped and logged at warning level. A rejected message is
untrusted input, not evidence that checkout failed, so it does not fail a preload
or call `.onFail` or `checkoutDidFail(error:)` during presentation. The message
body is untrusted and is not logged.

### Current configuration

```swift
let configuration = ShopifyCheckoutKit.configuration
```

## Checkout lifecycle

`CheckoutDelegate` reports native presentation outcomes:

- `checkoutDidDismiss()` fires when the buyer dismisses the checkout sheet.
- `checkoutDidFail(error:)` fires when checkout cannot continue.

Typed checkout state, including completion, flows through `EmbeddedCheckoutProtocol`.

```swift
import ShopifyCheckoutKit
import EmbeddedCheckoutProtocol

let client = CheckoutProtocol.Client()
  .on(CheckoutProtocol.start) { checkout in
    // Checkout is loaded and interactive.
  }
  .on(CheckoutProtocol.complete) { checkout in
    // The order was completed. Clear or refresh the local cart.
  }
  .on(CheckoutProtocol.totalsChange) { checkout in
    // React to updated totals.
  }
  .on(CheckoutProtocol.lineItemsChange) { checkout in
    // React to line item changes.
  }
  .on(CheckoutProtocol.fulfillmentChange) { checkout in
    // React to fulfillment changes.
  }
  .on(CheckoutProtocol.messagesChange) { checkout in
    // React to checkout messages.
  }

ShopifyCheckoutKit.present(
  checkout: checkoutURL,
  from: viewController,
  delegate: checkoutDelegate,
  client: client
)
```

For SwiftUI, attach the same client with `.connect(client)`.

```swift
ShopifyCheckout(checkout: checkoutURL)
  .connect(client)
```

The public `CheckoutProtocol` descriptors are typed wrappers over UCP-backed checkout messages.
See the [UCP shopping embedded protocol schema](../../protocol/services/shopping/embedded.openrpc.json) for method and payload definitions.
Kit-owned link delegations such as `window.open` are offered to your connected protocol client first and fall back to Checkout Kit's default handler if unhandled. The default handler opens web links in `SFSafariViewController` and non-web links through `UIApplication.shared.open(_:)`.

### Error handling

A checkout lifecycle failure is delivered as a `CheckoutError` to `checkoutDidFail(error:)`
or `.onFail`. It has a stable `code`, diagnostic `message`, optional `httpStatusCode`, and an
optional native `underlyingError`. Use the stable code for recovery and analytics. Use diagnostic
text and underlying errors only for debugging and logging.

| `CheckoutErrorCode` | Meaning | Suggested app action |
| --- | --- | --- |
| `.storefrontPasswordRequired` | The storefront is password protected. | Treat this checkout URL as unavailable until storefront password protection has been disabled. |
| `.customerAccountRequired` | Checkout requires a customer account unavailable to this session. | Prompt the customer to [authenticate](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts?extension=swift), then retry. |
| `.cartExpired` | The cart or checkout session is no longer available. | Create a new cart and retry. |
| `.cartCompleted` | The cart has already completed checkout. | Clear or create a new cart. |
| `.invalidCart` | The cart cannot continue checkout. | Create a new cart and retry. |
| `.httpError` | Checkout returned an HTTP error response. `httpStatusCode` is available. | Inspect `httpStatusCode`; retry only when it makes sense for your app. |
| `.networkError` | Checkout navigation failed before an HTTP response was available. | Offer a retry when connectivity is available. |
| `.webContentProcessTerminated` | WebKit terminated the content process. | Let the buyer explicitly retry; Checkout Kit does not reload automatically. |
| `.sdkError` | An internal Checkout Kit error has occurred (e.g. a protocol message could not be decoded). | Log diagnostic context and offer a browser fallback. |
| `.unknown` | An unexpected error occurred. | Log diagnostic context and offer a browser fallback. |

Record `code` (and `httpStatusCode` when available) in analytics as appropriate for your privacy
policy. Use `message` and `underlyingError` only for debugging and logging; do not use them for recovery behavior.

```swift
switch error.code {
case .cartExpired, .invalidCart:
  createAndPresentFreshCart()
case .networkError:
  showRetry()
case .httpError:
  handleHTTPFailure(statusCode: error.httpStatusCode)
default:
  showCheckoutUnavailable()
}
```

You own recovery after a lifecycle failure: retrying, recreating a cart, authenticating a buyer,
opening a browser fallback, and re-presenting checkout.

#### Checkout session errors

`ec.error` ends the embedded checkout session. Checkout Kit first forwards it to
`CheckoutProtocol.error`, then reports one lifecycle failure for a presented checkout. The first
unrecoverable error message determines the lifecycle code; if none is present, the code is
`.unknown`. `ec.messages.change` reports checkout state only and never calls `.onFail` or
`checkoutDidFail(error:)`.

Add a protocol handler when you need the complete protocol payload; it runs before the lifecycle failure:

```swift
let client = CheckoutProtocol.Client()
  .on(CheckoutProtocol.error) { terminalError in
    // Inspect the complete ECP terminal payload for advanced diagnostics.
  }
```

Failures during preload do not call `.onFail` or `checkoutDidFail(error:)`. Monitor them as
`PreloadState.failed` through the `CheckoutPreload` returned by `preload`, using `onStateChange`
or its published `state`. A later `present` can load normally.

## Authentication and buyer identity

Checkout Kit does not create carts or authenticate buyers. Add buyer context to the cart before presenting checkout:

- Use Storefront API cart buyer identity fields for customer and contact context such as email, phone, country, language, customer access tokens, and wallet preferences.
- Use cart delivery inputs and the current cart delivery mutations for delivery addresses, selected delivery options, and pickup preferences.
- Use the Customer Account API to obtain a customer access token and attach it through cart buyer identity.
- For Shopify Plus stores that use Classic Customer Accounts, generate Multipass tokens server-side and set `return_to` to the checkout URL.

Keep Multipass secrets out of client-side code.

> [!WARNING]
> [Multipass](https://shopify.dev/docs/api/customer-authentication/multipass) is now deprecated, consider using Customer Accounts API for new integrations.

## Offsite payments and links

Some payment providers redirect buyers to external banking apps or web pages. Configure Universal Links so buyers can return to your app after those flows complete:

- Use a custom storefront domain. `*.myshopify.com` domains do not serve `apple-app-site-association` files.
- Enable Associated Domains in your app entitlements.
- Configure the iOS Buy SDK / Storefront API app settings in the Shopify admin.
- Route incoming checkout URLs back to Checkout Kit and route order status or thank-you URLs to your own confirmation flow.

See [Universal Links](documentation/universal_links.md) for setup and testing details.

Checkout Kit opens delegated external HTTPS links in `SFSafariViewController` by default. Deep links, `mailto:`, and `tel:` links still open through `UIApplication.shared.open(_:)`. If you want delegated web links to leave your app, register a `CheckoutProtocol.windowOpen` handler and call `UIApplication.shared.open(_:)` yourself.

## Geolocation and pickup points

iOS handles checkout geolocation permission prompts through the system prompt. If your checkout uses pickup points or "Use my location", add a location usage description to your app:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your location is used to find pickup points near you.</string>
```

## Accelerated Checkouts

`ShopifyAcceleratedCheckouts` renders Shop Pay and Apple Pay buttons before the buyer opens the full checkout sheet. It supports cart-based and product-variant-based entry points on iOS 16+.

### Prerequisites

- iOS 16.0+
- Storefront API token with the `write_cart_wallet_payments` scope
- Apple Pay merchant identifier and payment processing certificate
- A device or simulator configuration that can display Apple Pay

### Configure accelerated checkouts

Create shared configuration values and inject them into your SwiftUI hierarchy:

```swift
import ShopifyAcceleratedCheckouts
import SwiftUI

@main
struct YourApp: App {
  private let checkoutConfig = ShopifyAcceleratedCheckouts.Configuration(
    storefrontDomain: "your-shop.myshopify.com",
    storefrontAccessToken: "<storefront access token>",
    customer: nil
  )

  private let applePayConfig = ShopifyAcceleratedCheckouts.ApplePayConfiguration(
    merchantIdentifier: "merchant.com.yourcompany",
    contactFields: [.email, .phone],
    supportedShippingCountries: ["US", "CA"]
  )

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environment(\.shopifyAcceleratedCheckoutsConfiguration, checkoutConfig)
        .environment(\.shopifyApplePayConfiguration, applePayConfig)
    }
  }
}
```

Use one customer mode at a time:

```swift
// Authenticated buyer.
ShopifyAcceleratedCheckouts.Customer(customerAccessToken: customerAccessToken)

// Guest or explicit contact override.
ShopifyAcceleratedCheckouts.Customer(
  email: "buyer@example.com",
  phoneNumber: "15555555555"
)
```

`contactFields` is required by the current Swift API. Include `.email` when the shop requires customer accounts and `.phone` when the shop requires phone numbers for shipping.

### Render buttons

```swift
import ShopifyAcceleratedCheckouts

AcceleratedCheckoutButtons(cartID: cartID)
  .wallets([.shopPay, .applePay])
  .applePayButtonType(.buy)
  .applePayButtonStyle(.automatic)
  .cornerRadius(8)
  .onRenderStateChange { state in
    // loading, rendered, or error(reason:)
  }
  .onFail { error in
    // Handle checkout failure.
  }
  .onDismiss {
    // The buyer dismissed the accelerated checkout flow.
  }
  .connect(client)
```

You can also render buttons for a single product variant:

```swift
AcceleratedCheckoutButtons(
  variantID: "gid://shopify/ProductVariant/...",
  quantity: 1
)
```

Use `CheckoutProtocol.Client` through `.connect(client)` to observe checkout completion and state changes. Clear or refresh the cart when `CheckoutProtocol.complete` fires to avoid reusing an expired cart ID.

## Troubleshooting

- Use `ShopifyCheckoutKit.configuration.logLevel = .debug` or `ShopifyAcceleratedCheckouts.logLevel = .debug` while integrating.
- If checkout reports an expired, completed, or invalid cart, create a new cart and use its `checkoutUrl`.
- If Apple Pay dismisses immediately, verify the merchant ID, entitlements, payment processing certificate, and device wallet setup.
- If Universal Links do not open the app, verify the associated domain entitlement and the `/.well-known/apple-app-site-association` file on your custom storefront domain.

## Samples

See [Samples](Samples/README.md):

- `CheckoutKitSwiftDemo` demonstrates a Storefront API cart flow, buyer identity modes, Customer Account API, checkout presentation, and protocol events.
- `ShopifyAcceleratedCheckoutsApp` demonstrates Shop Pay and Apple Pay accelerated checkout buttons.

## Contributing

See [CONTRIBUTING](../../.github/CONTRIBUTING.md).

Useful checks before opening a Swift change:

```sh
cd platforms/swift
./Scripts/xcode_run build ShopifyCheckoutKit
./Scripts/xcode_run build ShopifyAcceleratedCheckouts
./Scripts/xcode_run test ShopifyCheckoutKit-Package
./Scripts/lint
```

For sample app changes, run:

```sh
cd platforms/swift
./Scripts/build_samples
```

## License

Checkout Kit is available under the [MIT license](../../LICENSE).
