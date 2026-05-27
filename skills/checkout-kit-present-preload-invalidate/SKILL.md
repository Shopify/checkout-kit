---
name: checkout-kit-present-preload-invalidate
description: Use when implementing or reviewing Checkout Kit presentation, preload timing, or invalidate behavior, especially around cart changes, buyer/session changes, and stale checkout state.
license: MIT
---

# Present, Preload, and Invalidate Checkout

Use this skill when wiring checkout into a cart flow, improving checkout startup performance, or debugging stale checkout state.

## Read first

- `README.md` and the target platform README.
- `references/guide.md` for decision rules and review checks.
- Target platform sample: `references/swift.md`, `references/android.md`, or `references/react-native.md`.

## Read when needed

- Sample apps for realistic cart and checkout wiring.
- Platform source for exact alpha API names and configuration shape.

## Gotchas

- Do not gate `present` on preload success. When the buyer taps checkout, call `present` with the latest checkout URL even if preload never ran or is still in flight.
- Preload only on buyer intent or settled checkout-affecting state.
- Invalidate on stale checkout, cart/session boundaries, or privacy-sensitive state changes.
