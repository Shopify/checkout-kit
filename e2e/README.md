# Checkout Kit End-to-End Tests

This directory contains Maestro end-to-end smoke flows for Checkout Kit sample
apps.

The current runnable suite starts with React Native. It verifies a full guest
checkout from a seeded cart in the sample app, through Shopify checkout, and
back to the app after completion.

## Run locally

Run the matching command from the repo root.

Run `dev up` first to provision the local toolchain. Install Maestro separately
and make sure `maestro --version` succeeds before running these flows.

React Native iOS:

```bash
dev rn e2e ios
```

React Native Android:

```bash
dev rn e2e android
```

The React Native commands start Metro if needed, build and launch the target
sample app, then run Maestro. They require the standard storefront `.env` setup,
but the E2E flow seeds its own cart through the bootstrap deep link; no manual
sample cart setup is required.

## Files

- `config.yaml` configures Maestro for shared platform behavior.
- `flows/` contains reusable Maestro subflows for app setup and checkout steps.
- `tests/react-native/full-guest-checkout.yaml` composes the React Native guest
  checkout smoke test from those subflows.

## Scope

This smoke flow is intended to catch regressions in the React Native sample app
integration surface: cart bootstrap, checkout presentation, checkout
completion, and return to the sample app. It is not a replacement for
checkout-web's browser-based coverage or for future native Swift and Android
sample-app E2E coverage.
