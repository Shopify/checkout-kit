---
name: checkout-kit-lifecycle-events
description: Use when listening to Checkout Kit lifecycle events or reviewing lifecycle handling: native presentation callbacks, cancellation, failure, external links, and UCP-backed Checkout Protocol events from the checkout web instance.
license: MIT
---

# Checkout Kit Lifecycle Events

Use this skill to listen to checkout lifecycle events and choose the right event source.

## Read first

- `README.md` and the target platform README.
- `references/guide.md` for the native-callback vs Checkout Protocol distinction, public event coverage, and review checks.
- Target platform sample: `references/swift.md`, `references/android.md`, or `references/react-native.md`.

## Read when needed

- Target platform generated types when implementing payload handling: `protocol/languages/swift/Sources/ShopifyCheckoutProtocol/Generated/Models.swift`, `platforms/android/lib/src/main/java/com/shopify/checkoutkit/Models.kt`, or `protocol/languages/typescript/src/generated/Models.ts`.
- Target platform source when confirming exact public handler names.

## Gotchas

- Native presentation callbacks are native/ambient SDK events. They are not Checkout Protocol communication.
- `CheckoutProtocol.Client` is the bidirectional communication layer between the checkout web instance and the native host.
- Register only protocol handlers the app actually needs.
- Registering a `windowOpen` handler overrides Checkout Kit's smart default URL-opening behavior; the app developer is then responsible for opening the URL or rejecting the request.
- Web pixel relay behavior is removed: rely on checkout/web pixel relay to analytics partners, and remove mobile-app forwarding of web pixel events.
- PII is gated behind authentication; do not assume lifecycle/protocol payloads include buyer PII unless authenticated checkout access explicitly provides it.
