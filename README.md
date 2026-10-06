# Checkout Kit

<div align="center">

<img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

**Shopify's one-page checkout for native mobile apps and web storefronts.**

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](LICENSE)

[Get started](#get-started) · [Samples](#samples) · [Platform support](#platform-support) · [Contributing](#contributing)

</div>

Checkout Kit preserves your checkout customizations, including Checkout UI extensions, Shopify Functions, branding, Shop Pay, and supported payment methods.

> [!WARNING]
> **Alpha — early preview.** This software is **not production-ready**. Stability
> is not guaranteed, and breaking changes may occur in any release.
> See [Packages](#packages) for versions and installation channels.

<a id="integration-guides"></a>

## Get started

Choose your platform for installation instructions and API details:

- **[Swift](platforms/swift/README.md)** — Present checkout in an iOS app.
- **[Android](platforms/android/README.md)** — Present checkout in an Android app.
- **[React Native](platforms/react-native/README.md)** — Use the iOS and Android SDKs from React Native. Requires the New Architecture.
- **[Web](platforms/web/README.md)** — Open checkout with the `<shopify-checkout>` web component.

For SwiftUI Shop Pay and Apple Pay buttons on iOS 16+, see [Accelerated checkouts](platforms/swift/README.md#accelerated-checkouts).

### Product guides

The [Shopify.dev overview](https://shopify.dev/docs/storefronts/mobile/checkout-kit) covers end-to-end integration and product concepts. For specific workflows:

- [Authenticate checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts)
- [Monitor the checkout lifecycle](https://shopify.dev/docs/storefronts/mobile/checkout-kit/monitor-checkout-lifecycle)
- [Offsite payments](https://shopify.dev/docs/storefronts/mobile/checkout-kit/offsite-payments)
- [Privacy compliance](https://shopify.dev/docs/storefronts/mobile/checkout-kit/privacy-compliance)
- [Accelerated checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/accelerated-checkouts)

## Samples

- **[Swift samples](platforms/swift/Samples/README.md)** — Storefront API cart flow, checkout presentation, Customer Account API, and accelerated checkout buttons.
- **[Android samples](platforms/android/samples/README.md)** — Storefront API cart flow, checkout presentation, protocol lifecycle events, file chooser, and geolocation callbacks.
- **[Web sample](platforms/web/sample/README.md)** — Local playground for the `<shopify-checkout>` component and `ec.*` events.

## Platform support

| Capability | Swift | Android | React Native | Web |
| --- | :---: | :---: | :---: | :---: |
| Checkout URL | Yes | Yes | Yes | Yes |
| Cart permalinks | Yes | Yes | Yes | Yes |
| Color schemes | Yes | Yes | Yes | N/A |
| Dismiss/fail callbacks | Yes | Yes | Yes | Close/error events |
| Typed protocol events | Yes | Yes | Partial | Yes |
| File chooser and permissions | System | Host callbacks | Host callbacks¹ | Browser |
| Pickup geolocation | System prompt | Host callback | Helper/custom¹ | Browser |
| Offsite payment return | Universal Links | App Links/deep links | Platform-dependent | Tab/popup |
| Accelerated buttons | iOS 16+ | No | iOS 16+ | No |

- **Checkout URL** means `cart.checkoutUrl`. **Color schemes** include light, dark, and web.
- **React Native protocol events** depend on the underlying native SDK.
- **¹ React Native Android:** File chooser and web permissions use host callbacks. Geolocation uses the default helper or a custom handler. Native Android requires a host callback for geolocation.

## Packages

Package names link to their integration guides. These are the versions tracked by this repository; prereleases use the installation channels listed below.

| Package | Version | Installation |
| --- | --- | --- |
| [`ShopifyCheckoutKit`](platforms/swift/README.md) | `4.0.0-alpha.6` | Swift Package Manager, CocoaPods |
| [`ShopifyAcceleratedCheckouts`](platforms/swift/README.md#accelerated-checkouts) | `4.0.0-alpha.6` | Swift Package Manager, CocoaPods subspec |
| [`com.shopify:checkout-kit`](platforms/android/README.md) | `4.0.0-alpha.8` | Maven Central |
| [`@shopify/checkout-kit-react-native`](platforms/react-native/README.md) | `4.0.0-alpha.5` | npm `next` |
| [`@shopify/checkout-kit`](platforms/web/README.md) | `4.0.0-alpha.4` | npm `next` |

<details>
<summary>Supporting packages: Embedded Checkout Protocol</summary>

These internal/supporting clients handle Embedded Checkout Protocol messages.

- **[Swift](protocol/languages/swift/README.md):** `EmbeddedCheckoutProtocol` is a source package installed through Swift Package Manager.
- **[Kotlin](protocol/languages/kotlin/embedded-checkout-protocol/README.md):** `com.shopify:embedded-checkout-protocol` version `2026.08.25.1-alpha.1` is distributed through Maven Central.

</details>

### Versioning

Checkout Kit is the current home for the SDKs previously published as Checkout Sheet Kit.

- Platform releases are versioned independently using the `4.0.0-alpha.X` format during the alpha period.
- Stable releases will continue on the same `4.x` package line after the alpha period.

<details>
<summary>Migrating from Checkout Sheet Kit</summary>

The legacy standalone repositories remain available for apps that have not migrated.

| Platform | Legacy package | Final legacy line |
| --- | --- | --- |
| iOS | `checkout-sheet-kit-swift` | `3.8.x` |
| Android | `com.shopify:checkout-sheet-kit` | `3.5.x` |
| React Native | `@shopify/checkout-sheet-kit` | `4.0.x` |

</details>

<a id="what-is-in-this-repo"></a>

## Contributing

This repository contains the platform implementations, samples, and protocol bindings. Issues and pull requests are welcome; see the [contribution guide](.github/CONTRIBUTING.md).

[Code of Conduct](.github/CODE_OF_CONDUCT.md) · [MIT License](LICENSE)
