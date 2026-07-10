# Checkout Kit End-to-End Tests

This directory contains Maestro end-to-end flows and configuration for Checkout
Kit sample apps. Two complementary setups live here:

- A **local** React Native checkout smoke suite, run with `dev rn e2e`, that
  exercises guest and hardcoded buyer identity checkouts from seeded carts
  through Shopify checkout and back to the app.
- A **CI matrix** that expands applications, OS version tags, and suites into
  BrowserStack Maestro run rows, starting with a shared launch smoke.

## Run locally

Run `dev up` first to provision the local toolchain. Install Maestro separately
and make sure `maestro --version` succeeds before running these flows.

### React Native checkout smoke (`dev rn e2e`)

Run the matching command from the repo root.

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
but the E2E flows seed their own carts through the bootstrap deep link. The
React Native bootstrap link accepts `buyerIdentityMode`, so guest and hardcoded
buyer identity scenarios share the same cart setup path. No manual sample cart
setup is required.

### Shared launch smoke

The launch smoke launches a sample app and waits for the shared ready marker
exposed by that app, using the same environment contract used by CI.

React Native iOS:

```bash
E2E_APP_ID=com.shopify.checkoutkit.reactnativedemo \
E2E_READY_MARKER=checkout-kit-sample-ready \
maestro --platform ios test e2e/tests/shared/launch-smoke.yaml
```

React Native Android:

```bash
E2E_APP_ID=com.shopify.checkoutkit.reactnativedemo \
E2E_READY_MARKER=checkout-kit-sample-ready \
maestro --platform android test e2e/tests/shared/launch-smoke.yaml
```

React Native E2E runs should use the released native SDK artifacts declared by
the React Native sample configuration, not local in-repo native SDK overrides.

## Matrix

CI runs are described by `config/matrix.yml`. The matrix expands applications, OS
version tags, and suites into a BrowserStack run plan. Because Bitrise has no
built-in matrix support, `e2e/lib/e2e_matrix_to_browserstack_run_plan.rb`
transforms the matrix into a BrowserStack run plan and the pipeline
parallelizes over the resulting rows.

Current applications:

- React Native iOS sample app
- React Native Android sample app

Current OS version tags:

- `latest`

Current suites:

- `tests/shared/launch-smoke.yaml`

Validate the matrix:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan validate
```

Expand the BrowserStack run plan:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand
```

Expand a single BrowserStack run plan row by index:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand --index 0
```

Count BrowserStack run plan rows:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan count
```

## Files

- `config.yaml` configures Maestro for shared platform behavior.
- `flows/` contains reusable Maestro subflows for app setup and checkout steps.
- `tests/react-native/checkout-guest.yaml` composes the React Native guest
  checkout smoke test from those subflows.
- `tests/react-native/checkout-hardcoded-buyer-identity.yaml` verifies checkout
  from a bootstrapped cart with hardcoded buyer identity.
- `config/matrix.yml`, `lib/e2e_matrix_to_browserstack_run_plan.rb`, and
  `scripts/` drive the BrowserStack run plan.
- `tests/shared/launch-smoke.yaml` is the shared launch smoke suite.

## Shared app contract

Shared flows rely on stable cross-app identifiers. The launch smoke requires each
target app to expose this ready marker:

- `checkout-kit-sample-ready`

Future shared flows should add identifiers here before they are used across
React Native, Swift, and Android sample apps.

## Scope

These flows catch regressions in the React Native sample app integration
surface: cart bootstrap, buyer identity configuration, checkout presentation,
checkout completion, and return to the sample app. They are not a replacement
for checkout-web browser-based coverage or for future native Swift and Android
sample-app E2E coverage.
