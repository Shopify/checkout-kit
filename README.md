# Checkout Kit

<div align="center">

<img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

**Shopify's one-page checkout for native mobile apps and web storefronts.**

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](LICENSE)

[Get started](#get-started) · [Samples](#samples) · [Platform support](#platform-support) · [Contributing](#contributing)

</div>

Checkout Kit preserves your checkout customizations, including Checkout UI extensions, Shopify Functions, branding, Shop Pay, and supported payment methods.

<a id="integration-guides"></a>

## Get started

Choose your platform for installation instructions and API details:

- **[Swift](platforms/swift/README.md)** — Present checkout in an iOS app.
- **[Android](platforms/android/README.md)** — Present checkout in an Android app.
- **[React Native](platforms/react-native/README.md)** — Use the iOS and Android SDKs from React Native. Requires the New Architecture.
- **[Web](platforms/web/README.md)** — Open checkout with the `<shopify-checkout>` web component.

Checkout Kit for Web also includes:

- **[Universal Checkout](platforms/web/documentation/universal-checkout.md)** — Let buyers purchase products from multiple Shopify merchants in one checkout with `<shopify-universal-checkout>`.
- **[Shop Pay](platforms/web/documentation/shop-pay.md)** — Add Shopify's express checkout and digital wallet to your shopping experience with `<shop-pay>`, so buyers can pay using their saved payment methods and addresses.

For SwiftUI Shop Pay and Apple Pay buttons on iOS 16+, see [Accelerated checkouts](platforms/swift/README.md#accelerated-checkouts).

### Product guides

The [Shopify.dev overview](https://shopify.dev/docs/storefronts/mobile/checkout-kit) covers end-to-end integration and product concepts. For specific workflows:

- [Authenticate checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts)
- [Monitor the checkout lifecycle](https://shopify.dev/docs/storefronts/mobile/checkout-kit/monitor-checkout-lifecycle)
- [Offsite payments](https://shopify.dev/docs/storefronts/mobile/checkout-kit/offsite-payments)
- [Privacy compliance](https://shopify.dev/docs/storefronts/mobile/checkout-kit/privacy-compliance)
- [Accelerated checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/accelerated-checkouts)
- [Universal Checkout](https://shopify.dev/docs/agents/carts-and-checkout/universal-checkout)
- [Shop Pay](https://shopify.dev/docs/agents/carts-and-checkout/shop-pay)

## Samples

- **[Swift samples](platforms/swift/Samples/README.md)** — Storefront API cart flow, checkout presentation, Customer Account API, and accelerated checkout buttons.
- **[Android samples](platforms/android/samples/README.md)** — Storefront API cart flow, checkout presentation, typed checkout lifecycle events, file chooser, and geolocation callbacks.
- **[Web samples](platforms/web/sample/README.md)** — Local playgrounds for checkout, Universal Checkout, and Shop Pay with typed checkout lifecycle events.

## Platform support

| Capability | Swift | Android | React Native | Web |
| --- | :---: | :---: | :---: | :---: |
| Checkout URL | Yes | Yes | Yes | Yes |
| Cart permalinks | Yes | Yes | Yes | Yes |
| Checkout appearance | Yes | Yes | Yes | Standard checkout |
| Dismiss/fail callbacks | Yes | Yes | Yes | Close/error events |
| Typed checkout lifecycle events | Yes | Yes | Yes | Yes |
| File chooser and web permissions | System | Host callbacks | iOS: system; Android: unavailable¹ | Browser |
| Pickup geolocation | System prompt | Host callback | iOS: system; Android: helper/custom¹ | Browser |
| Offsite payment return | Universal Links | App Links/deep links | Platform-dependent | Tab/popup |
| Accelerated buttons | iOS 16+ | No | iOS 16+ | Shop Pay² |

- **Checkout URL** means `cart.checkoutUrl`. On Web, checkout URLs and cart permalinks are inputs to `<shopify-checkout>`.
- **Checkout appearance** supports storefront branding or app styling with light, dark, and automatic color schemes. On Web, `<shopify-checkout>` accepts `storefront`, `app:light`, `app:dark`, and `app:automatic`; Universal Checkout and Shop Pay do not expose an appearance setting.
- **Typed checkout lifecycle events** report checkout start, updates, and completion. React Native exposes `onStart`, `onUpdate`, and `onComplete` with typed checkout snapshots; raw protocol handlers are not part of its public API. Web exposes `start`, `update`, and `complete` events.
- **¹ React Native Android:** File chooser and web permission callbacks are not exposed by the bridge. Geolocation uses the default helper or a custom handler. Native Android requires a host callback for geolocation.
- **² Web Shop Pay:** Use `<shop-pay button>` to show Shop Pay's button, or open Shop Pay from your own payment control. Swift and React Native accelerated buttons support Shop Pay and Apple Pay on iOS 16+.

## Packages

Package names link to their integration guides. These are the versions tracked by this repository.

| Package | Version | Installation |
| --- | --- | --- |
| [`ShopifyCheckoutKit`](platforms/swift/README.md) | `4.2.0` | Swift Package Manager, CocoaPods |
| [`ShopifyAcceleratedCheckouts`](platforms/swift/README.md#accelerated-checkouts) | `4.2.0` | Swift Package Manager, CocoaPods subspec |
| [`com.shopify:checkout-kit`](platforms/android/README.md) | `4.1.0` | Maven Central |
| [`@shopify/checkout-kit-react-native`](platforms/react-native/README.md) | `4.0.1` | npm `latest` |
| [`@shopify/checkout-kit`](platforms/web/README.md) | `4.0.1` | npm `latest` |

<details>
<summary>Supporting packages: Embedded Checkout Protocol</summary>

These internal/supporting clients handle Embedded Checkout Protocol messages.

- **[Swift](protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/swift/README.md):** `EmbeddedCheckoutProtocol` is a source package installed through Swift Package Manager.
- **[Kotlin](protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/kotlin/embedded-checkout-protocol/README.md):** `com.shopify:embedded-checkout-protocol` version `2026.08.25.1` is distributed through Maven Central.

</details>

### Versioning

Checkout Kit is the current home for the SDKs previously published as Checkout Sheet Kit.

- Platform releases are versioned independently and follow semantic versioning. Each platform records its changes in its own `CHANGELOG.md`, managed with Changesets (see [contributing](.github/CONTRIBUTING.md#versions-and-release-notes)).

<details>
<summary>Migrating from Checkout Sheet Kit</summary>

The legacy standalone repositories remain available for apps that have not migrated.

| Platform | Legacy package | Latest legacy line |
| --- | --- | --- |
| iOS | `checkout-sheet-kit-swift` | [3.9.x](https://github.com/Shopify/checkout-sheet-kit-swift/releases) |
| Android | `com.shopify:checkout-sheet-kit` | [3.6.x](https://github.com/Shopify/checkout-sheet-kit-android/releases) |
| React Native | `@shopify/checkout-sheet-kit` | [3.9.x](https://www.npmjs.com/package/@shopify/checkout-sheet-kit) |

</details>

<a id="what-is-in-this-repo"></a>

## Contributing

This repository contains the platform implementations, samples, and protocol bindings. Issues and pull requests are welcome; see the [contribution guide](.github/CONTRIBUTING.md).

[Code of Conduct](.github/CODE_OF_CONDUCT.md) · [MIT License](LICENSE)
