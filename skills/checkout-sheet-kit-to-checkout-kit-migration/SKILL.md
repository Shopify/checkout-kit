---
name: checkout-sheet-kit-to-checkout-kit-migration
description: Use when migrating an app from legacy Checkout Sheet Kit packages to current Checkout Kit package names and versions, including package renames, removed native web pixel relay, PII removal, and lifecycle/protocol changes.
---

# Checkout Sheet Kit to Checkout Kit Migration

Use this skill when the user is upgrading from Checkout Sheet Kit to Checkout Kit, renaming packages/imports, or moving lifecycle handling from callback/event-processor code toward the protocol client.

## Start with local truth

Read these local files before suggesting code:

- `README.md` for current package names, legacy version notes, and repo layout.
- The platform README for the app being migrated: `platforms/swift/README.md`, `platforms/android/README.md`, or `platforms/react-native/README.md`.
- `protocol/services/shopping/embedded.openrpc.json` and `protocol/schemas/` if lifecycle event migration is in scope.
- Existing protocol client implementations when available.
- `references/guide.md` for the migration workflow, related skills, and guardrails.
- The platform rename sample for the target app: `references/swift.md`, `references/android.md`, or `references/react-native.md`.
- `../checkout-kit-lifecycle-events/SKILL.md` when migrating lifecycle event handlers or protocol notifications.

Prefer local source over memory. Use Shopify docs only to confirm current public guidance: https://shopify.dev/docs/storefronts/mobile
