# Checkout Kit End-to-End Tests

This directory contains shared cross-platform Maestro flows for the Checkout Kit
sample apps.

The current shared smoke flow verifies the happy path from a sample app cart
into Shopify checkout and back to the app after completion. Each platform owns
the small wrapper command that supplies its app id, cart bootstrap link, and
platform-specific checkout field handling.

## Run locally

Build and install the target sample app first, then run the matching Maestro
command.

From `platforms/react-native`:

```bash
pnpm e2e:ios
pnpm e2e:android
```

From `platforms/swift`:

```bash
./Scripts/e2e_maestro_ios
```

From `platforms/android`:

```bash
./scripts/e2e_maestro_android
```

## Files

- `config.yaml` configures Maestro for shared platform behavior.
- `shared/checkout-smoke.yaml` contains the cross-platform checkout smoke flow.

## Scope

This smoke flow is intended to catch regressions in the sample app integration
surface: cart bootstrap, checkout presentation, checkout completion, and return
to the sample app. It is not a replacement for checkout-web's own browser-based
test coverage.
