# Checkout Kit

<div align="center">

<p align="center">
  <img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />
</p>

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](LICENSE)

[Shopify.dev docs](https://shopify.dev/docs/storefronts/mobile/checkout-kit)&nbsp;&nbsp;|&nbsp;&nbsp;[Contributing](.github/CONTRIBUTING.md)&nbsp;&nbsp;|&nbsp;&nbsp;[Code of Conduct](.github/CODE_OF_CONDUCT.md)&nbsp;&nbsp;|&nbsp;&nbsp;[License](LICENSE)

**Shopify Checkout Kit** lets native mobile apps and web storefronts present Shopify's one-page checkout while preserving checkout customizations such as Checkout UI extensions, Shopify Functions, branding, Shop Pay, and supported payment methods.

</div>

> [!WARNING]
> **Alpha - early preview.** This software is an early preview and is **not**
> production-ready. Stability is not guaranteed, and breaking changes may
> occur in any release. See [Packages](#packages).

## What is in this repo

This repository contains the Checkout Kit implementations, samples, and protocol bindings. Use it to inspect platform behavior, run samples, report bugs, and contribute fixes. The Shopify.dev mobile storefront docs remain the primary place for end-to-end product guidance and conceptual walkthroughs.

## Packages

| Package | Checkout Kit release | Install channel | Status | Description | README |
| --- | --- | --- | --- | --- | --- |
| `ShopifyCheckoutKit` | `4.0.0-alpha.1` | Swift Package Manager, CocoaPods | Alpha | iOS checkout presentation SDK. | [Swift](platforms/swift/README.md) |
| `ShopifyAcceleratedCheckouts` | `4.0.0-alpha.1` | Swift Package Manager, CocoaPods subspec | Alpha | SwiftUI Shop Pay and Apple Pay accelerated checkout buttons for iOS 16+. | [Swift](platforms/swift/README.md#accelerated-checkouts) |
| `com.shopify:checkout-kit` | `4.0.0-alpha.1` | Maven Central | Alpha | Android checkout dialog SDK. | [Android](platforms/android/README.md) |
| `@shopify/checkout-kit-react-native` | `4.0.0-alpha.1` | npm `next` dist-tag | Alpha | React Native wrapper for the iOS and Android native SDKs. | [React Native](platforms/react-native/README.md) |
| `@shopify/checkout-kit` | `4.0.0-alpha.2` | npm `next` dist-tag | Alpha | Web component for opening Shopify checkout from a web page. | [Web](platforms/web/README.md) |
| `ShopifyCheckoutProtocol` | Source package | Swift Package Manager | Internal/supporting | Swift client for Embedded Checkout Protocol messages. | [Protocol Swift](protocol/languages/swift/README.md) |

Swift, Android, and React Native rows show the planned first Checkout Kit alpha releases. Web is already published as `4.0.0-alpha.2`.

## Platform Support

| Capability | Swift | Android | React Native | Web |
| --- | --- | --- | --- | --- |
| Present checkout from `cart.checkoutUrl` | Yes | Yes | Yes | Yes |
| Cart permalink support | Yes | Yes | Yes | Yes |
| Light, dark, and web color schemes | Yes | Yes | Yes | Not applicable |
| Checkout cancel/fail callbacks | Yes | Yes | Yes | Close/error events |
| Typed checkout protocol events | Yes | Yes | Partial/native-dependent | Yes |
| File chooser and web permissions | iOS system behavior | Host callbacks | Android host callbacks | Browser behavior |
| Geolocation for pickup points | iOS system prompt | Host callback required | Android default helper or custom handler | Browser behavior |
| Offsite payment return routing | Universal Links | App Links/deep links | Platform-dependent | New tab/popup routing |
| Accelerated checkout buttons | iOS 16+ | No | iOS 16+ | No |

## Integration Guides

Start with the platform README for package installation and API details:

- [Swift](platforms/swift/README.md)
- [Android](platforms/android/README.md)
- [React Native](platforms/react-native/README.md)
- [Web](platforms/web/README.md)

Use the Shopify.dev guides for broader product workflows:

- [Checkout Kit overview](https://shopify.dev/docs/storefronts/mobile/checkout-kit)
- [Authenticate checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts)
- [Monitor the checkout lifecycle](https://shopify.dev/docs/storefronts/mobile/checkout-kit/monitor-checkout-lifecycle)
- [Offsite payments](https://shopify.dev/docs/storefronts/mobile/checkout-kit/offsite-payments)
- [Privacy compliance](https://shopify.dev/docs/storefronts/mobile/checkout-kit/privacy-compliance)
- [Accelerated checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/accelerated-checkouts)

## Samples

| Platform | Sample README | What it demonstrates |
| --- | --- | --- |
| Swift | [Samples](platforms/swift/Samples/README.md) | Storefront API cart flow, checkout presentation, Customer Account API, and accelerated checkout buttons. |
| Android | [Samples](platforms/android/samples/README.md) | Storefront API cart flow, checkout presentation, protocol lifecycle events, file chooser, and geolocation callbacks. |
| Web | [Sample](platforms/web/sample/README.md) | Local playground for the `<shopify-checkout>` web component and `checkout:*` events. |

## AI Quick Start

### Install Checkout Skills

```bash
npx skills add Shopify/checkout-kit
```

| Skill | Use when |
| --- | --- |
| [Checkout Kit v3 to v4 migration](skills/checkout-kit-v3-to-v4-migration/SKILL.md) | Migrating Checkout Sheet Kit v3 apps to Checkout Kit v4 package names and APIs. |
| [Present, preload, and invalidate checkout](skills/checkout-kit-present-preload-invalidate/SKILL.md) | Wiring checkout presentation, preload timing, or stale-state invalidation. |
| [Lifecycle events](skills/checkout-kit-lifecycle-events/SKILL.md) | Handling completion, cancellation, failure, external links, or Checkout Protocol events. |

## Versioning

Checkout Kit is the current home for the SDKs that were previously published as Checkout Sheet Kit. The renamed packages use a shared `4.0.0-alpha.X` version format while the new package line settles:

- Swift, Android, and React Native start at `4.0.0-alpha.1`.
- Web is currently `4.0.0-alpha.2` and is published under the npm `next` dist-tag.
- React Native requires React Native New Architecture.
- Stable releases will continue on the same `4.x` package line after the alpha period.

### Legacy Checkout Sheet Kit

The legacy Checkout Sheet Kit lines are deprecated and remain available for apps maintaining older integrations. Checkout Sheet Kit ends on the `v3` stable major-version line. Checkout Kit starts on the renamed `v4` package line; legacy versions do not roll forward into the renamed package coordinates.

> [!TIP]
> Use the [Checkout Kit v3 to v4 migration](skills/checkout-kit-v3-to-v4-migration/SKILL.md) skill when upgrading.

| Platform | Legacy package | Final legacy line |
| --- | --- | --- |
| iOS | `checkout-sheet-kit-swift` | `3.8.x` |
| Android | `com.shopify:checkout-sheet-kit` | `3.5.x` |
| React Native | `@shopify/checkout-sheet-kit` | `3.9.x` |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING](.github/CONTRIBUTING.md) and our [Code of Conduct](.github/CODE_OF_CONDUCT.md).
