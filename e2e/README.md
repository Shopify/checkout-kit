# Checkout Kit End-to-End Tests

This directory contains shared cross-platform Maestro flows for the Checkout Kit
sample apps.

The current shared smoke flow verifies the happy path from a sample app cart
into Shopify checkout and back to the app after completion. Each platform owns
the small wrapper command that supplies its app id, cart bootstrap link, and
platform-specific checkout field handling.

## Run locally

Run the matching command from the repo root.

React Native:

The React Native commands start Metro if needed, build and launch the target
sample app, then run Maestro.

```bash
dev e2e rn-ios
dev e2e rn-android
```

Swift:

Build and install the Swift sample app first, then run:

```bash
dev e2e swift-ios
```

Android:

The Android command builds and installs the native sample app, then runs
Maestro.

```bash
dev e2e android
```

## Files

- `config.yaml` configures Maestro for shared platform behavior.
- `shared/checkout-smoke.yaml` contains the cross-platform checkout smoke flow.

## Scope

This smoke flow is intended to catch regressions in the sample app integration
surface: cart bootstrap, checkout presentation, checkout completion, and return
to the sample app. It is not a replacement for checkout-web's own browser-based
test coverage.
