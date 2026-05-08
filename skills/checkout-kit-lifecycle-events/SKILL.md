---
name: checkout-kit-lifecycle-events
description: Use when implementing, migrating, or reviewing Checkout Kit lifecycle event handling, including completion, cancellation, failure, external links, and UCP-backed Checkout Protocol notifications.
---

# Checkout Kit Lifecycle Events

Use this skill when the user needs to handle checkout lifecycle events, migrate callback/event-processor code, or wire protocol notifications into app state.

## Start with local truth

Read these local files before suggesting code:

- `README.md` for current package and docs links.
- The target platform README: `platforms/swift/README.md`, `platforms/android/README.md`, or `platforms/react-native/README.md`.
- `protocol/services/shopping/embedded.openrpc.json` for protocol notifications and request methods.
- `protocol/schemas/` for UCP payload shape.
- `references/guide.md` for shared lifecycle event guidance.
- The platform sample for the target app: `references/swift.md`, `references/android.md`, or `references/react-native.md`.

Prefer local source over memory. Use Shopify docs only to confirm current public guidance: https://shopify.dev/docs/storefronts/mobile
