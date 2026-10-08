# Web browser tests

Playwright loads the built `platforms/web/dist/shopify-checkout.js` in Chromium and exercises
the real custom element, popup, and cross-origin `postMessage` exchange. A routed
HTTPS checkout fixture supplies synthetic protocol messages; telemetry is disabled
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
snapshots, window delegation, and terminal errors. They test the built SDK's
browser integration; they do not place a real order or exercise checkout-web.

- `server.mjs` serves the host page and built bundle.
- `fixtures/` contains the host page and synthetic checkout.
- `support/fixtures.ts` provides a host page object and installs the network guard.
- `support/checkout-host-page.ts` owns host controls and typed public event/state reads.
- `support/shopify-checkout-popup.ts` drives the synthetic checkout's protocol actions.
- `support/embedded-checkout-stub.ts` routes checkout requests to a blank popup or
  the synthetic protocol fixture, selected with `test.use({ checkoutStub: "blank" })`.
- `support/checkout-fixture.ts` contains synthetic URLs and expected public checkout data.
- `tests/synthetic/presentation.spec.ts` uses blank popups to isolate presentation behavior.
- `tests/synthetic/protocol.spec.ts` exercises cross-origin protocol exchanges and public events.
