---
name: checkout-kit-present-preload-invalidate
description: Use when implementing or reviewing Checkout Kit present, preload, and invalidate behavior across platforms, especially when deciding when to preload after cart changes and when to clear cached checkout state.
---

# Present, Preload, and Invalidate Checkout

Use this skill when the user is wiring Checkout Kit into a cart or checkout flow, improving checkout performance, or debugging stale checkout state.

## Start with local truth

Read these local files before suggesting code:

- `README.md` for current package and docs links.
- The target platform README: `platforms/swift/README.md`, `platforms/android/README.md`, or `platforms/react-native/README.md`.
- Sample apps for realistic cart and checkout wiring.
- The platform source for exact function names and configuration shape.
- `references/guide.md` for lifecycle rules, platform-neutral flow, and review checklist.
- The platform sample for the target app: `references/swift.md`, `references/android.md`, or `references/react-native.md`.

Prefer local source over memory. Use Shopify docs only to confirm current public guidance: https://shopify.dev/docs/storefronts/mobile
