# Shopify Checkout Kit - Swift

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](../../LICENSE)
[![Swift Package Manager compatible](https://img.shields.io/badge/Swift%20Package%20Manager-compatible-2ebb4e.svg?style=flat)](https://swift.org/package-manager/)

<img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

> [!WARNING]
> **Alpha - early preview.** This software is an early preview and is **not**
> production-ready. The current Checkout Kit for Swift alpha is `4.0.0-alpha.9`.
> Stability is not guaranteed, and breaking changes may occur in any release.

**Checkout Kit for Swift** lets iOS apps present Shopify checkout in a native sheet while preserving store checkout customizations such as Checkout UI extensions, Shopify Functions, branding, and supported payment methods. The Swift package also includes `ShopifyAcceleratedCheckouts`, a SwiftUI library for rendering Shop Pay and Apple Pay buttons on iOS 16+.

- [Requirements](#requirements)
- [Install](#install)
  - [Swift Package Manager](#swift-package-manager)
  - [CocoaPods](#cocoapods)
  - [Compatibility](#compatibility)
- [Get a checkout URL](#get-a-checkout-url)
- [Present checkout](#present-checkout)
  - [UIKit](#uikit)
  - [SwiftUI](#swiftui)
- [Preload checkout](#preload-checkout)
- [Configure checkout](#configure-checkout)
  - [Incoming message origin validation](#incoming-message-origin-validation)
  - [Current configuration](#current-configuration)
- [Checkout lifecycle](#checkout-lifecycle)
  - [Constructing event fixtures](#constructing-event-fixtures)
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

The current Checkout Kit for Swift alpha is `4.0.0-alpha.9`. For alpha testing, use that exact version until a stable `4.x` release is available.

### Swift Package Manager

Add the repository from Xcode with **File > Add Package Dependencies...**:

```text
https://github.com/Shopify/checkout-kit
```

Or add it to `Package.swift`:

```swift
dependencies: [
  .package(url: "https://github.com/Shopify/checkout-kit", exact: "4.0.0-alpha.9")
]
```

Then add the products you need to your app target:

```swift
.target(
  name: "YourApp",
  dependencies: [
    "ShopifyCheckoutKit",
    "ShopifyAcceleratedCheckouts" // Only needed for accelerated checkout buttons.
  ]
)
```

### CocoaPods

The CocoaPods spec exists so that [Checkout Kit for React Native](../react-native) can consume the native SDK. Native apps should use Swift Package Manager.

```ruby
pod "ShopifyCheckoutKit", "4.0.0-alpha.9"

# Optional: Shop Pay and Apple Pay accelerated checkout buttons.
pod "ShopifyCheckoutKit/AcceleratedCheckouts", "4.0.0-alpha.9"
```

### Compatibility

Checkout Kit follows semantic versioning. Its compatibility promise covers `ShopifyCheckoutKit` and `ShopifyAcceleratedCheckouts`, including the protocol types they expose, such as `Checkout` and everything it contains in checkout events. The full list of covered protocol types is in [COVERED_TYPES.md](../../protocols/universal-commerce-protocol/embedded-checkout-protocol/COVERED_TYPES.md).

- **New optional protocol fields and enum-like values can arrive in minor releases. New required construction inputs are breaking changes.** Values such as `checkout.status` and `message.severity` are open: include a `default` case when you switch over them.
- **Protocol types that Checkout Kit doesn't expose** are outside this promise. If you use the `EmbeddedCheckoutProtocol` product directly, those types can change in a minor release when Checkout Kit adopts a new protocol version.
- **CocoaPods** compiles the protocol sources into the `ShopifyCheckoutKit` module, so every protocol type is visible there. The same scope applies: only the types Checkout Kit exposes are covered.

## Get a checkout URL

Checkout Kit presents a standard Shopify checkout URL. The common flow is:

1. Create or update a cart with the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront), for example with [`cartCreate`](https://shopify.dev/docs/api/storefront/2026-07/mutations/cartCreate) and related cart mutations.
2. Read the cart's [`checkoutUrl`](https://shopify.dev/docs/api/storefront/2026-07/objects/Cart#field-cart-checkouturl).
3. Pass that URL, or a [cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink), to Checkout Kit.

You can use any GraphQL client. The sample app uses Apollo iOS and is a complete reference for a modern Storefront API integration.

For production use, see the [Storefront API GraphiQL Explorer](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started) for schema exploration and the [`cartCreate`](https://shopify.dev/docs/api/storefront/2026-07/mutations/cartCreate) mutation reference for the full input shape, including buyer identity, attributes, discount codes, and delivery preferences.

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
    // The checkout presentation closed.
  }

  func checkoutDidFail(_ event: CheckoutFailureEvent) {
    // Use event.error to show an error state, retry with a new cart, or log the SDK error.
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
        .appearance(.storefront(colors: CheckoutColors(progressIndicatorColor: .systemBlue)))
        .onDismiss {
          isPresented = false
        }
        .onFail { event in
          handleCheckoutError(event.error)
        }
        .ignoresSafeArea()
    }
  }
}
```

`CheckoutSheet` remains available as a deprecated typealias for `ShopifyCheckout`. Use `ShopifyCheckout` in new code.

Checkout Kit adds the required UCP query parameters automatically when it loads checkout.

## Preload checkout

Call `preload` when your app has a strong signal that the buyer is likely to check out soon, such as when they open the cart screen or move toward a checkout action:

```swift
ShopifyCheckoutKit.preload(checkout: checkoutURL)
```

Each call refreshes the cached checkout, even when `checkoutURL` is unchanged. Call `preload` again after cart changes so the preloaded checkout reflects the latest cart state. A preload request made while checkout is presented leaves the active checkout session untouched.

`preload` returns an optional `CheckoutPreload` handle. You can ignore it when preloading is only a performance hint, or retain it to observe the preload lifecycle:

```swift
let preload = ShopifyCheckoutKit.preload(checkout: checkoutURL)
preload?.onStateChange = { state in
  switch state {
  case .idle(let reason):
    recordPreloadIdle(reason)
  case .loading:
    showPreloadProgress()
  case .ready:
    enableCheckoutAffordance()
  case .failed(let reason, let message):
    recordPreloadFailure(reason, message)
  }
}

if preload == nil {
  // Preloading is disabled.
  // Calling present still loads checkout normally.
}
```

`onStateChange` receives the current state immediately, followed by state changes. The preload cache has one weak observer, so a later `preload` call replaces the observer associated with an earlier handle; retain the latest handle for as long as you need to observe state. When `present` reuses a preload, its handle also stops receiving updates and retains its last observed state, which may be `.loading`.

A successful background preload normally transitions from `.loading` to `.ready`. `.idle()` is the initial state. An idle state with an `.invalidated` or `.expired` reason means a cached preload became unavailable through that expected lifecycle transition. `.failed` means the SDK could not maintain usable preloaded web content; present still creates checkout normally.

`.invalidated` covers explicit invalidation, configuration changes (including disabling preloading), a checkout URL or entry point mismatch, checkout completion, and clearing unusable content after presentation. `.expired` means the cached preload reached its time-to-live. Calling `invalidate()` when no checkout is cached preserves the last state, including any expiry or failure reason, and does not notify observers.

`IdleReason` is an extensible string-backed value, with `.invalidated` and `.expired` constants. New reasons can be added without adding state cases. Compare the constants or include a `default` branch when switching over reasons; treat unfamiliar reasons as an unavailable preload. `rawValue` preserves the reason's stable identifier, including unknown values.

| State | Meaning |
| --- | --- |
| `.loading` | The background checkout WebView is loading. |
| `.ready` | The preload finished and can be used for the matching checkout URL. |
| `.idle(reason:)` | No checkout is cached. The optional reason distinguishes invalidation and expiry from the initial state. |
| `.failed(reason:message:)` | An HTTP, navigation, protocol, or web-content failure occurred while preloading. |

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

Updating configuration through `ShopifyCheckoutKit.configure {}` triggers `ShopifyCheckoutKit.invalidate()`. Discarding cached preloads avoids presenting a stale checkout. If a preload may already have run when configuration changes, call `preload` again.

Preloading is enabled by default. Disable it when appropriate, for example for data-saver modes or app-specific runtime conditions:

```swift
ShopifyCheckoutKit.configure {
  $0.preloading.enabled = false
}
```

## Configure checkout

Configure global presentation defaults before presenting checkout. `ShopifyCheckoutKit.configuration` is read-only; `configure {}` is the only way to change it and must be called on the main actor:

```swift
import ShopifyCheckoutKit

ShopifyCheckoutKit.configure {
  $0.appearance = .storefront(colors: CheckoutColors(progressIndicatorColor: .systemBlue))
  $0.logLevel = .debug
  $0.telemetry.enabled = false
}
```

`ShopifyCheckout` uses the global configuration as its defaults. When present, modifiers such as `.appearance(...)` and `.title(...)` take precedence over the corresponding `ShopifyCheckoutKit.configuration` values for that checkout. Modifiers do not mutate `ShopifyCheckoutKit.configuration`, so they do not invalidate a cached preload.

| Option | Default | Purpose |
| --- | --- | --- |
| `appearance` | `.storefront()` | Match the storefront's web checkout branding with a light color scheme, or use the Checkout Kit style with `.app(.automatic())`, `.app(.light())`, or `.app(.dark())`. Each appearance owns its native colors. |
| `title` | Localized `shopify_checkout_kit_title` or `Checkout` | Navigation title for the checkout sheet. |
| `logLevel` | `.warn` | SDK logging verbosity. Threshold-ordered `.debug` → `.warn` → `.error` → `.none`; use `.debug` during integration. |
| `preloading.enabled` | `true` | Enables best-effort checkout preloading before presentation. |
| `allowedMessageOrigins` | `[]` | Origins trusted to send incoming checkout messages. Empty trusts every origin (open by default). See [Incoming message origin validation](#incoming-message-origin-validation). |
| `telemetry.enabled` | `true` | Sends anonymous diagnostic metrics to Shopify. Set to `false` to opt out. |

Checkout Kit reports limited, anonymous diagnostic metrics, including checkout
errors, protocol decoding failures, navigation retries, and checkout navigation
timing. These diagnostics never include checkout URLs, message payloads, buyer
data, or checkout, order, customer, or shop identifiers. Disabling telemetry stops new
collection and discards measurements that have not already been handed to the
operating system for delivery.

To localize the title, add `shopify_checkout_kit_title` to your app's `Localizable.xcstrings`.

### Appearance and native colors

`CheckoutAppearance` owns the native palette. Use `.storefront(colors:)` to customize the surrounding native UI without changing the merchant's web checkout branding, or `.app(...)` with a `CheckoutColorScheme` to use Checkout Kit branding.

`CheckoutColors` uses native `UIColor` and `UIImage` values. Dynamic colors, accessibility contrast, and transparency remain supported. The default navigation bar remains transparent and the default close button remains the iOS system control.

| `CheckoutColors` property | Default | Purpose |
| --- | --- | --- |
| `webViewBackgroundColor` | `.systemBackground` | Background behind the WebView and its overscroll area. |
| `headerBackgroundColor` | `.clear` | Navigation-bar background. |
| `headerTitleColor` | `.label` | Navigation-bar title color. |
| `progressIndicatorColor` | Shopify blue | Progress indicator while checkout loads. |
| `closeIcon` | `nil` | Optional native image for the close button. |
| `closeIconTintColor` | `nil` | Optional close-button tint. With no icon or tint override, iOS supplies the system close button. |
| `headerBorderColor` | `nil` | Optional navigation-bar shadow color. |

Light and dark schemes each own one palette. Automatic appearance owns independent `lightColors` and `darkColors`, and switches natively when the system appearance changes:

```swift
ShopifyCheckoutKit.configure {
  $0.appearance = .app(.automatic(
    lightColors: CheckoutColors(progressIndicatorColor: .systemBlue, closeIconTintColor: .systemBlue),
    darkColors: CheckoutColors(progressIndicatorColor: .systemTeal, closeIconTintColor: .systemTeal)
  ))
}
```

Use `customize` to derive a modified copy without changing the original palette or scheme. A single customization applies to both automatic palettes; use `customize(light:dark:)` for separate light and dark overrides. On an explicit scheme, only the matching closure is applied: `.light` applies `light` and `.dark` applies `dark`. For example:

```swift
let appearance = CheckoutAppearance.app(
  .automatic().customize(
    light: { $0.progressIndicatorColor = .systemBlue },
    dark: { $0.progressIndicatorColor = .systemTeal }
  )
)

ShopifyCheckoutKit.configure {
  $0.appearance = appearance
}
```

Set appearance before presenting checkout. Replacing it with `.storefront()`, `.app(.light())`, `.app(.dark())`, or `.app(.automatic())` restores that appearance's default colors. Updating unrelated settings such as logging, preloading, or the checkout title preserves the configured palette. A presented checkout uses the native colors of the configuration it was created with, including a reused preloaded WebView.

The previous configuration-level `backgroundColor`, `tintColor`, and `closeButtonTintColor` properties, and the corresponding SwiftUI color modifiers, have been removed. Use `CheckoutColors.webViewBackgroundColor`, `CheckoutColors.progressIndicatorColor`, and `CheckoutColors.closeIconTintColor` through `appearance` instead. `CheckoutAppearance` replaces `Configuration.Appearance`, and `CheckoutColorScheme` replaces `Configuration.ColorScheme`. The new types are prefixed with `Checkout` so they do not clash with `SwiftUI.ColorScheme`.

The `CheckoutColors` color properties and their `init` labels were renamed in this release so that each color name ends in `Color`. The old names were removed without deprecated aliases:

| Old name | New name |
| --- | --- |
| `webViewBackground` | `webViewBackgroundColor` |
| `headerBackground` | `headerBackgroundColor` |
| `headerFont` | `headerTitleColor` |
| `progressIndicator` | `progressIndicatorColor` |
| `closeIconTint` | `closeIconTintColor` |

`closeIcon` and `headerBorderColor` keep their names.

### Incoming message origin validation

The native web view is a private, app-controlled runtime, so Checkout Kit is
**open by default**: with an empty `allowedMessageOrigins`, incoming
checkout-protocol messages from any origin are accepted. Provide one or more
origins to restrict which origins are trusted; the loaded checkout origin and
Shopify-owned `shop.app` and `shop.com` domains (including their subdomains) are always
trusted as well.

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
or call `.onFail` or `checkoutDidFail(_:)` during presentation. The message
body is untrusted and is not logged.

### Current configuration

```swift
let configuration = ShopifyCheckoutKit.configuration
```

`ShopifyCheckoutKit.configuration` returns a copy. Changing that copy does not change the configuration; use `ShopifyCheckoutKit.configure {}` instead.

## Checkout lifecycle

Use `CheckoutDelegate` with UIKit and view modifiers with SwiftUI. Start, update,
and completion callbacks receive typed events with a `checkout` property containing
the current `ShopifyCheckoutKit.Checkout` snapshot. Callbacks run on the main actor.

| Event | UIKit delegate method | SwiftUI modifier |
| --- | --- | --- |
| Checkout is visible and ready for interaction. | `checkoutDidStart(_:)` | `.onStart` |
| Checkout totals, line items, fulfillment, or messages change. | `checkoutDidUpdate(_:)` | `.onUpdate` |
| Checkout completes. | `checkoutDidComplete(_:)` | `.onComplete` |
| The checkout presentation closes. | `checkoutDidDismiss()` | `.onDismiss` |
| Checkout cannot continue. | `checkoutDidFail(_:)` | `.onFail` |

These callbacks are not mutually exclusive. When a terminal failure closes a presented checkout,
`checkoutDidFail(_:)` fires first and `checkoutDidDismiss()` follows after the presentation
closes. Calling `dismiss(animated:)` on the returned view controller is caller-controlled teardown
and does not invoke either callback. `checkoutDidComplete(_:)` reports that the order completed; it
does not report presentation closure, and `checkoutDidDismiss()` follows when the buyer later closes
checkout.

UIKit delegates must implement `checkoutDidDismiss()` and `checkoutDidFail(_:)`.
The other lifecycle methods have default implementations. When migrating from `checkoutDidFail(error:)`, implement
`checkoutDidFail(_ event: CheckoutFailureEvent)` and read the error from `event.error`.

Add the optional lifecycle methods to the UIKit delegate shown in [Present checkout](#uikit):

```swift
extension CartViewController {
  func checkoutDidStart(_ event: CheckoutStartEvent) {
    // Checkout is ready. Read the initial state from event.checkout.
  }

  func checkoutDidUpdate(_ event: CheckoutUpdateEvent) {
    // Update your UI from event.checkout.totals, lineItems, fulfillment, or messages.
  }

  func checkoutDidComplete(_ event: CheckoutCompleteEvent) {
    // Record completion from event.checkout; reset the cart after dismissal.
  }
}
```

For SwiftUI, attach handlers directly to `ShopifyCheckout`:

```swift
ShopifyCheckout(checkout: checkoutURL)
  .onStart { event in
    // Checkout is ready. Read the initial state from event.checkout.
  }
  .onUpdate { event in
    // Update your UI from event.checkout.totals, lineItems, fulfillment, or messages.
  }
  .onComplete { event in
    // Record completion from event.checkout; reset the cart after dismissal.
  }
  .onDismiss {
    // Clear or refresh the cart if checkout completed.
  }
  .onFail { event in
    handleCheckoutError(event.error)
  }
```

When your app presents `ShopifyCheckout` in its own SwiftUI `.sheet`, `.onDismiss` runs after the
buyer taps the close button or swipes the sheet down, and after a terminal failure closes checkout.
It does not run in these cases:

- The buyer taps outside the sheet to dismiss it, for example on iPad. SwiftUI owns the sheet's
  presentation, so checkout cannot tell this apart from your app closing the sheet.
- Your app sets the sheet's `isPresented` binding to `false`. This matches calling
  `dismiss(animated:)` on a UIKit checkout.

To handle every dismissal, run your cleanup from the sheet's `onDismiss` parameter, for example
`.sheet(isPresented: $isPresented, onDismiss: refreshCart)`. That parameter also runs after the
close button and swipe-down, so keep the cleanup safe to run twice. To keep the buyer from
dismissing the sheet by tapping outside it, add `.interactiveDismissDisabled()` to
`ShopifyCheckout`; this also turns off swipe-down.

Update callbacks combine changes to totals, line items, fulfillment, and messages;
identical checkout snapshots do not trigger another update. Read the fields your
app needs from `event.checkout`.

Completion does not dismiss checkout. Record completion, then clear or refresh the
cart when checkout is dismissed so the confirmation page remains visible.

### Constructing event fixtures

Event initializers are public, so tests can create `CheckoutStartEvent(checkout:)`,
`CheckoutUpdateEvent(checkout:)`, and `CheckoutCompleteEvent(checkout:)`. The protocol
models inside a checkout, such as `LineItem` and `CheckoutTotal`, take their required fields
as arguments and optional fields in a configuration closure:

```swift
let lineItem = LineItem(
    id: "line-1",
    item: Item(id: "gid://shopify/ProductVariant/1", price: 2500, title: "T-shirt"),
    quantity: 1,
    totals: [LineItemTotal(amount: 2500, type: "subtotal")]
)
let checkout = Checkout(
    id: "fixture-checkout",
    status: .incomplete,
    currency: "USD",
    lineItems: [lineItem],
    totals: [CheckoutTotal(amount: 2500, type: "total")]
)
let update = CheckoutUpdateEvent(checkout: checkout)
let renamed = lineItem.with { $0.parentID = "line-0" }
```

New optional protocol fields become new properties, so these fixtures keep compiling. You
can also decode a snapshot from JSON with `JSONDecoder().decode(Checkout.self, from: data)`.

### Error handling

A checkout lifecycle failure is delivered as a `CheckoutFailureEvent` to `checkoutDidFail(_:)`
or `.onFail`. Its `error` has a stable `code`, diagnostic `message`, optional `httpStatusCode`, and an
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

`ec.error` ends the embedded checkout session. Checkout Kit reports one lifecycle
failure through `checkoutDidFail(_:)` or `.onFail` for a presented checkout. The first
unrecoverable error message determines the lifecycle code; if none is present, the code is
`.unknown`. Read the mapped error from `event.error`. In-checkout messages are
available at `event.checkout.messages` in `checkoutDidUpdate(_:)` or `.onUpdate`;
`ec.messages.change` never calls `.onFail` or `checkoutDidFail(_:)`.

Failures during preload do not call `.onFail` or `checkoutDidFail(_:)`. Monitor them as
`PreloadState.failed` through the `CheckoutPreload` returned by `preload`, using `onStateChange`
or its published `state`. A later `present` can load normally.

## Authentication and buyer identity

Checkout Kit does not create carts or authenticate buyers. Add buyer context to the cart before presenting checkout:

- Use Storefront API cart buyer identity fields for customer and contact context such as email, phone, country, language, customer access tokens, and wallet preferences.
- Use cart delivery inputs and the current cart delivery mutations for delivery addresses, selected delivery options, and pickup preferences.
- Use the Customer Account API to obtain a customer access token and attach it through cart buyer identity.
- For Shopify Plus stores that already use Multipass, generate Multipass tokens server-side and set `return_to` to the checkout URL.

Keep Multipass secrets out of client-side code.

> [!NOTE]
> [Multipass](https://shopify.dev/docs/api/customer-authentication/multipass) is still supported for stores that already use it. New integrations should [connect a third-party identity provider](https://shopify.dev/docs/api/customer-authentication#third-party-identity-providers-idps).

## Offsite payments and links

Some payment providers redirect buyers to external banking apps or web pages. Configure Universal Links so buyers can return to your app after those flows complete:

- Use a custom storefront domain. `*.myshopify.com` domains do not serve `apple-app-site-association` files.
- Enable Associated Domains in your app entitlements.
- Configure the iOS Buy SDK / Storefront API app settings in the Shopify admin.
- Route incoming checkout URLs back to Checkout Kit and route order status or thank-you URLs to your own confirmation flow.

See [Universal Links](documentation/universal_links.md) for setup and testing details.

Checkout Kit opens delegated external HTTP(S) links in `SFSafariViewController` by
default. Deep links, `mailto:`, and `tel:` links open through `UIApplication.shared.open(_:)`.

Use `checkoutAction(for:)` on your UIKit delegate or `.onLinkClick` in SwiftUI to
customize this behavior. Return `.cancel` to prevent the link from opening, `.default`
to let Checkout Kit use its default handling, or `.handled` after your app opens or
routes the link itself. For example, to open delegated links through the system:

```swift
ShopifyCheckout(checkout: checkoutURL)
  .onLinkClick { link in
    UIApplication.shared.open(link.url)
    return .handled
  }
```

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

ShopifyAcceleratedCheckoutButtons(cartID: cartID)
  .wallets([.shopPay, .applePay])
  .applePayButtonType(.buy)
  .applePayButtonStyle(.automatic)
  .cornerRadius(8)
  .onRenderStateChange { state in
    // loading, rendered, or error(reason:)
  }
  .onStart { event in
    // Checkout started: event.checkout.
  }
  .onUpdate { event in
    // Buyer-visible checkout data changed: event.checkout.
  }
  .onComplete { event in
    // Mark checkout as completed; reset the cart after dismissal.
  }
  .onLinkClick { link in
    .open
  }
  .onFail { error in
    // Handle checkout failure.
  }
  .onDismiss {
    // The accelerated checkout presentation closed.
  }
```

`AcceleratedCheckoutButtons` remains available as a deprecated typealias. Use `ShopifyAcceleratedCheckoutButtons` in new code.

Checkout always starts from a Storefront cart that your app owns. For a product page, provide the cart when the buyer taps a wallet button; Checkout Kit calls the closure once per accepted tap and never while rendering:

```swift
ShopifyAcceleratedCheckoutButtons(variantID: selection.variantID) { request in
  // Create, reuse, or update a buy-now cart. Return its ID.
  // `request.wallet` is the wallet the buyer tapped.
  .cart(try await cartStore.prepareBuyNowCart(
    variantID: selection.variantID,
    quantity: selection.quantity
  ))
}
```

If the cart should use an authenticated buyer's identity, create or update it with that identity, including the customer access token, before returning its ID. This ensures customer-specific cart state is resolved before wallet presentation. `Configuration.customer` remains available for wallet buyer-identity updates, but it does not initialize a cart returned by `getCart`.

Return `.failed` when the app has already handled a cart-creation failure; no wallet opens and `onFail` is not called. If the closure throws, including a thrown `CancellationError`, `.onFail` receives the error and no wallet opens.

Use `.onStart`, `.onUpdate`, `.onComplete`, and `.onLinkClick` for Shop Pay and Apple Pay’s web checkout fallback. These callbacks do not require a protocol client. After completion, clear or refresh the cart when checkout is dismissed so the confirmation page remains visible.

## Troubleshooting

- Use `ShopifyCheckoutKit.configure { $0.logLevel = .debug }` or `ShopifyAcceleratedCheckouts.logLevel = .debug` while integrating.
- If checkout reports an expired, completed, or invalid cart, create a new cart and use its `checkoutUrl`.
- If Apple Pay dismisses immediately, verify the merchant ID, entitlements, payment processing certificate, and device wallet setup.
- If Universal Links do not open the app, verify the associated domain entitlement and the `/.well-known/apple-app-site-association` file on your custom storefront domain.

## Samples

See [Samples](Samples/README.md):

- `CheckoutKitSwiftDemo` demonstrates a Storefront API cart flow, buyer identity modes, Customer Account API, checkout presentation, checkout lifecycle events, and configurable Shop Pay and Apple Pay accelerated checkout buttons.

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
