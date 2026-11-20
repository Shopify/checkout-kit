# Web browser tests

Playwright loads the built npm and CDN distributions in Chromium and exercises
the real custom element, popup, native module retries, and cross-origin `postMessage` exchange. Routed
HTTPS checkout fixtures supply synthetic protocol messages; telemetry is disabled
and unexpected external requests are blocked and fail the test. No storefront,
tokens, or `.env` values are needed to run the suite.

## Run

From the repository root:

```sh
dev up                   # Install dependencies and the matching Chromium browsers
dev web e2e               # Build, typecheck the tests, then run Chromium
dev web e2e --headed
dev web e2e --ui
dev web e2e report
```

The package is a member of the web pnpm workspace and uses
`platforms/web/pnpm-lock.yaml`. For a web-only setup, install dependencies with
`pnpm --dir platforms/web install --frozen-lockfile`, then run `dev web e2e install`.
That command also provides targeted browser setup or recovery, including system
dependencies on Linux. After Playwright updates, rerun `dev up` or
`dev web e2e install` to install the matching browsers. Existing browser installs
are reused when they match the installed Playwright version.
Once the package is built, `pnpm --dir platforms/web/test/e2e test` runs without rebuilding.
`dev web check` also includes the browser suite; `dev web format` formats its code.

The fixture server binds to `127.0.0.1:4321`. Set `WEB_E2E_PORT` to use another port.
Each run starts its own server and each test gets an isolated browser context.
Failures retain traces and screenshots in `test-results/`; the HTML report is in
`playwright-report/`. Web CI uploads both as the `web-playwright` artifact.

## Scope and layout

The presentation specs cover component registration, checkout URL negotiation,
invalid URLs, popup presentation, and host/overlay closing. The protocol specs
cover the `ec.ready` handshake, public `start`/`update`/`complete` events and
snapshots, window delegation (including `mailto:`/`tel:` links and rejected schemes),
and terminal errors. The Universal Checkout protocol
spec checks that Kit answers every batched `ec.ready` request and covers per-shop
`start`/`update`/`complete` entries, an ejected shop's `error` alongside a sibling's
completion, and host-owned closing. The Universal Checkout presentation spec covers
checkout URL negotiation and invalid URLs, retrying a blocked popup from the overlay,
opening checkout with the default `auto` target, closing when the buyer closes the popup
or presses Escape, and reopening checkout after the buyer closes it during Shop sign-in.
All of these specs test the built SDK's browser integration; they do not place a real
order or exercise checkout-web.
The CDN retry spec returns one temporary HTTP 503 per requested module URL,
including any shared dependency, and loads every component again on the same
page. This catches dependency failures that remain cached even when a component
entry is retried with a fresh query string.

- `server.mjs` serves the host pages and built npm/CDN JavaScript.
- `fixtures/` contains the host pages and synthetic checkouts.
- `support/fixtures.ts` provides the host page objects and installs the network guard.
- `support/checkout-host-page.ts` owns host controls and typed public event/state reads.
- `support/shopify-checkout-popup.ts` drives the synthetic checkout's protocol actions.
- `support/universal-checkout-host-page.ts` and `support/shopify-universal-checkout-popup.ts`
  do the same for `<shopify-universal-checkout>`.
- `support/embedded-checkout-stub.ts` routes checkout requests to a blank popup, the
  synthetic protocol fixture, or the batched Universal Checkout fixture, selected with
  `test.use({ checkoutStub: "blank" })` or `"universal"`.
- `support/checkout-fixture.ts` contains synthetic URLs and expected public checkout data.
- `support/universal-checkout-fixture.ts` contains the Universal Checkout URL, shops, and
  expected public checkout data.
- `tests/synthetic/presentation.spec.ts` uses blank popups to isolate presentation behavior.
- `tests/synthetic/protocol.spec.ts` exercises cross-origin protocol exchanges and public events.
- `tests/synthetic/universal-checkout-protocol.spec.ts` exercises the batched Universal Checkout
  protocol and its public events.
- `tests/synthetic/universal-checkout-presentation.spec.ts` covers how Universal Checkout
  opens, retries, and closes checkout.
- `tests/synthetic/cdn-retry.spec.ts` exercises transient module failures through the built CDN loader.
