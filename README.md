# Checkout Kit

<div align="center">

<p align="center">
  <img width="3200" height="800" alt="Checkout Kit" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />
</p>

[![MIT License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](LICENSE)

[Getting Started](https://shopify.dev/docs/storefronts/mobile/checkout-kit)&nbsp;&nbsp;|&nbsp;&nbsp;[Docs](https://shopify.dev/docs/storefronts/mobile)&nbsp;&nbsp;|&nbsp;&nbsp;[Contributing](.github/CONTRIBUTING.md)&nbsp;&nbsp;|&nbsp;&nbsp;[Code of Conduct](.github/CODE_OF_CONDUCT.md)&nbsp;&nbsp;|&nbsp;&nbsp;[License](LICENSE)

Shopify's **Checkout Kit** lets native mobile apps embed Shopify's one-page checkout while preserving store customizations like Checkout UI extensions, Shopify Functions, and branding. It also keeps the experience idiomatic to the host platform with light and dark mode support, lifecycle hooks, and native APIs to embed and customize checkout.

</div>

## Documentation

This respository houses the implementation of Checkout Kit, use it to check implementation or open issues if you find a bug.
The [Shopify mobile storefront docs](https://shopify.dev/docs/storefronts/mobile) are where we maintain installation and step by step guides for common integration patterns.

Feature guides:

- [Preload checkout](https://shopify.dev/docs/storefronts/mobile/checkout-kit/preloading) - fetch checkout in the background so it's ready when buyers are.
- [Monitor the checkout lifecycle](https://shopify.dev/docs/storefronts/mobile/checkout-kit/monitor-checkout-lifecycle) - handle completion, failure, and cancellation events.
- [Authenticate checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts) - sign buyers in to prefill saved addresses and payment methods.
- [Privacy compliance](https://shopify.dev/docs/storefronts/mobile/checkout-kit/privacy-compliance) - pass GDPR, CCPA, and ATT consent through to Shopify.
- [Accelerated checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/accelerated-checkouts?extension=react-native) - Shop Pay and Apple Pay buttons for one-tap purchase on product and cart pages.

## Packages in this repo

Checkout Kit is a monorepo containing all the platforms Checkout Kit supports together.

| Package                                                                | Latest version                                                                                                                                                                                                                                                             | Install channel                  | Description                                                     | Readme                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| [`ShopifyCheckoutKit` `ShopifyAcceleratedCheckouts`](platforms/swift/) | [![GitHub tag](https://img.shields.io/github/v/tag/Shopify/checkout-kit?label=SPM)](https://github.com/Shopify/checkout-kit/tags) [![CocoaPods](https://img.shields.io/cocoapods/v/ShopifyCheckoutKit.svg?label=CocoaPods)](https://cocoapods.org/pods/ShopifyCheckoutKit) | Swift Package Manager, CocoaPods | iOS checkout presentation and accelerated checkout libraries.   | [Readme](platforms/swift/README.md)        |
| [`com.shopify:checkout-kit`](platforms/android/)                       | [![Maven Central](https://img.shields.io/maven-central/v/com.shopify/checkout-kit.svg?label=Maven%20Central)](https://central.sonatype.com/artifact/com.shopify/checkout-kit)                                                                                              | Maven Central                    | Android checkout presentation and accelerated checkout support. | [Readme](platforms/android/README.md)      |
| [`@shopify/checkout-kit`](platforms/react-native/)                     | [![npm latest](https://img.shields.io/npm/v/@shopify/checkout-kit/latest.svg?label=npm)](https://www.npmjs.com/package/@shopify/checkout-kit)                                                                                                                              | npm                              | React Native wrapper for Checkout Kit.                          | [Readme](platforms/react-native/README.md) |

## Versioning

Checkout Kit is the new name for the Checkout Sheet Kit SDKs. It resets the version line to Checkout Kit v1, and all future development will be under Checkout Kit.

### Legacy v3

The legacy Checkout Sheet Kit lines are deprecated and remain available for apps maintaining older integrations.

| Platform     | Status                                                                  | Package                             | Final release | Readme                                                                      |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------- | ------------- | --------------------------------------------------------------------------- |
| iOS          | ![Deprecated](https://img.shields.io/badge/status-deprecated-lightgrey) | Checkout Sheet Kit for Swift        | `3.8.x`       | [Readme](https://github.com/Shopify/checkout-sheet-kit-swift#readme)        |
| Android      | ![Deprecated](https://img.shields.io/badge/status-deprecated-lightgrey) | Checkout Sheet Kit for Android      | `3.5.x`       | [Readme](https://github.com/Shopify/checkout-sheet-kit-android#readme)      |
| React Native | ![Deprecated](https://img.shields.io/badge/status-deprecated-lightgrey) | Checkout Sheet Kit for React Native | `4.0.x`       | [Readme](https://github.com/Shopify/checkout-sheet-kit-react-native#readme) |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING](.github/CONTRIBUTING.md) and our [Code of Conduct](.github/CODE_OF_CONDUCT.md).
