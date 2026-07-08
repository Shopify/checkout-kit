# Checkout Kit End-to-End Tests

This directory contains cross-platform end-to-end tests for Checkout Kit:

- **React Native** — Maestro smoke flows against the sample app.
- **Web** — Playwright tests against a built copy of the `@shopify/checkout-kit`
  package. See [`web/`](web/).

## React Native (Maestro)

The React Native suite verifies a full guest checkout from a seeded cart in the
sample app, through Shopify checkout, and back to the app after completion.

### Run locally

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

### Files

- `config.yaml` configures Maestro for shared platform behavior.
- `flows/` contains reusable Maestro subflows for app setup and checkout steps.
- `tests/react-native/full-guest-checkout.yaml` composes the React Native guest
  checkout smoke test from those subflows.

### Scope

This smoke flow is intended to catch regressions in the React Native sample app
integration surface: cart bootstrap, checkout presentation, checkout
completion, and return to the sample app. It is not a replacement for
checkout-web's browser-based coverage or for future native Swift and Android
sample-app E2E coverage.

## Web (Playwright)

The web suite loads the built `dist/index.js` in a real Chromium browser and
drives the `<shopify-checkout>` custom element end to end. It is hermetic — the
embedded checkout is stubbed with Playwright network routing, so no storefront
`.env` or network access is required.

### Run locally

From the repo root:

```bash
dev web e2e                 # build the package, then run headless
dev web e2e --headed        # run in a headed browser
dev web e2e --ui            # open the Playwright UI runner
dev web e2e --grep "happy"  # run only specs matching a pattern
dev web e2e report          # open the last HTML report
```

`dev web e2e` rebuilds the package first, then forwards any extra arguments to
`playwright test`, so any Playwright flag works. `report` is the one exception:
it opens the last HTML report instead. `dev up` installs the `e2e/web`
dependencies and the Playwright Chromium browser.

### Layout

The web tests are a standalone package under [`web/`](web/) so they can pin
Playwright independently of the platform packages:

- `web/server.mjs` — zero-dependency static server that serves the test
  fixtures and mounts the built `platforms/web/dist/` at `/dist/`.
- `web/fixtures/` — the host page that mounts the component and a synthetic
  checkout page used to exercise the protocol handshake.
- `web/support/` — shared TypeScript types and checkout payload constants.
- `web/tests/synthetic/` — hermetic Playwright specs that use local host and
  embedded-checkout fixtures (`presentation` + protocol handshake).

### Scope

These tests cover the web component's public surface against its built output:
custom-element registration, `src` handling and the overlay link, popup
open/close, and the embedded checkout protocol handshake (`ec.ready` →
`ec.start`/`ec.complete` and the unrecoverable `ec.error` path). They
complement, and do not replace, the unit tests in `platforms/web`.
