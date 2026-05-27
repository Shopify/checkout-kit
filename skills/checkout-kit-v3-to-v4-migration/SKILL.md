---
name: checkout-kit-v3-to-v4-migration
description: Use when migrating Checkout Sheet Kit v3 apps to Checkout Kit v4 package coordinates and APIs. Covers dependency/import renames, presentation parity, removed native web pixel relay, PII gated behind authentication, and Checkout Protocol lifecycle changes.
license: MIT
---

# Checkout Kit v3 to v4 Migration

Use this skill for upgrades from legacy Checkout Sheet Kit v3 to Checkout Kit v4.

## Read first

- `README.md` for current packages and legacy version notes.
- Target platform README: `platforms/swift/README.md`, `platforms/android/README.md`, or `platforms/react-native/README.md`.
- `references/guide.md` for the migration checklist and guardrails.
- Target platform rename sample: `references/swift.md`, `references/android.md`, or `references/react-native.md`.

## Read when needed

- `../checkout-kit-lifecycle-events/SKILL.md` when replacing callbacks/event processors with Checkout Protocol handlers.
- `../checkout-kit-present-preload-invalidate/SKILL.md` when preload or stale checkout state is in scope.
- Target platform generated types when implementing protocol payload handling: `protocol/languages/swift/Sources/ShopifyCheckoutProtocol/Generated/Models.swift`, `platforms/android/lib/src/main/java/com/shopify/checkoutkit/Models.kt`, or `protocol/languages/typescript/src/generated/Models.ts`.

## Gotchas

- Checkout Sheet Kit ends on the v3 stable line; Checkout Kit starts on v4 under renamed package coordinates.
- Keep checkout presentation behavior equivalent before changing lifecycle handling.
- Web pixel relay behavior is removed: rely on checkout/web pixel relay to analytics partners, and remove mobile-app forwarding of web pixel events.
- PII is gated behind authentication; do not assume lifecycle/protocol payloads include buyer PII unless authenticated checkout access explicitly provides it.
