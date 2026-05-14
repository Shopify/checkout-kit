# Web Component Playground

A development harness for the `<shopify-checkout>` web component. Renders the
component with adjustable options and logs all dispatched `checkout:*` events
in real time.

## Run locally

```bash
cd platforms/web
pnpm sample
```

Vite serves at `http://localhost:5173`. The page has three panels:

- **Options** — form for setting the component's attributes (`src`,
  `target`, `color-scheme`, `preload`) plus a small panel of manual method
  buttons (`open()`, `close()`, `focus()`) for ad-hoc debugging.
- **Demo Storefront** — a mocked merchant product card with a **Buy now**
  button that calls `checkout.open()`. The button is disabled until you
  enter a checkout URL in the Options panel. Below the card, a collapsible
  readout shows the component's read-only state (`cart`, `locale`,
  `orderConfirmation`, `error`, `sessionId`).
- **Events** — a chronological log of every `checkout:*` event the component
  dispatches, with a snapshot of component state at the moment the event
  fired. Respondable events are tagged with a badge.

The `<shopify-checkout>` element is appended to `<body>` rather than placed
inside the storefront panel — for `popup` and `auto` targets, the element
has no visible footprint of its own; only its internal dialog scrim appears
when `open()` is called. `target="inline"` is intentionally not supported
in the v1 of the component.

## Status

The `<shopify-checkout>` component implementation has not yet landed in
`../src`. Until it does, the element renders as an unknown HTML element and
dispatches no events — the playground is wired up against the component's
eventual API surface but is **non-functional at runtime**.

The forward-looking API surface is declared in [`./types.d.ts`](./types.d.ts).
Delete that file once `@shopify/checkout-kit` exports the real `ShopifyCheckout`
types from `../src`.

## Build

```bash
pnpm sample:build      # outputs to sample/dist/
```

CI runs this on every PR (see `.github/workflows/web.yml`) so the sample stays
buildable as the package evolves.

The sample is **not** published to npm — it's excluded by the `files`
allowlist in `platforms/web/package.json`.
