# Checkout Kit

[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](LICENSE)

<img width="3200" height="800" alt="gradients" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

Shopify's **Checkout Kit** lets native mobile apps embed Shopify's one-page checkout while preserving every store customization — Checkout UI extensions, Functions, Web Pixels, branding — and staying idiomatic to the host platform (light/dark mode, lifecycle hooks, native APIs to embed and customize the experience).

## Documentation

The [Checkout Kit dev docs](https://shopify.dev/docs/storefronts/mobile/checkout-kit) are the canonical reference — overview, platform install steps, and per-topic guides all live there.

Feature guides:

- [Preload checkout](https://shopify.dev/docs/storefronts/mobile/checkout-kit/preloading) — fetch checkout in the background so it's ready when buyers are.
- [Monitor the checkout lifecycle](https://shopify.dev/docs/storefronts/mobile/checkout-kit/monitor-checkout-lifecycle) — handle completion, failure, and cancellation events.
- [Authenticate checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/authenticate-checkouts) — sign buyers in to prefill saved addresses and payment methods.
- [Privacy compliance](https://shopify.dev/docs/storefronts/mobile/checkout-kit/privacy-compliance) — pass GDPR, CCPA, and ATT consent through to Shopify.
- [Accelerated checkouts](https://shopify.dev/docs/storefronts/mobile/checkout-kit/accelerated-checkouts-overview) — Shop Pay and Apple Pay buttons for one-tap purchase on product and cart pages.

## Platforms

Each platform ships from its own subdirectory with a dedicated README covering installation, configuration, and the full API. We expect overlap between these READMEs to migrate up here (and into the dev docs) over time — for now, treat the per-platform READMEs as the source of truth.

- **[Swift / iOS](swift/README.md)** — Swift Package and CocoaPods
- **[Android](android/README.md)** — published to Maven Central as `com.shopify:checkout-kit`
- **[React Native](react-native/README.md)** — placeholder; wrapper will be folded in soon
- **[End-to-end tests](e2e/README.md)** — placeholder; cross-platform E2E suite incoming

## Repository layout

```
swift/         # iOS / Swift Package
android/       # Android library and sample apps
react-native/  # React Native wrapper (incoming)
e2e/           # cross-platform end-to-end tests (incoming)
.github/       # workflows, issue templates, CODEOWNERS
```

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING](.github/CONTRIBUTING.md) and our [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
