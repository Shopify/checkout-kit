# Web Component Playground

A development harness for the `<shopify-checkout>` web component. It imports
the same entry as published consumers (`@shopify/checkout-kit`, aliased to
`../src/index.ts` in dev), registers the custom element, and logs `ec:*` and
`checkout:close` events.

## Run locally

```bash
cd platforms/web
pnpm sample
```

Vite serves at `http://localhost:5173`. The page has three panels:

- **Options** — form for `src`, `target` (`auto` | `popup` | `inline`),
  `preload`, and `debug`, plus buttons for `open()`, `close()`, and `focus()`.
- **Demo Storefront** — a mocked product card with **Buy now** calling
  `checkout.open()`. The button stays disabled until a checkout URL is set.
  The collapsible readout shows `checkout`, `error`, `target`, `preload`, and
  `debug`.
- **Events** — log of dispatched events with a JSON snapshot of state at fire
  time.

The element is mounted on `<body>`. For `popup` / `auto`, the visible UI is
mostly the overlay scrim when checkout is open; for **inline**, checkout renders
in an iframe inside the component shadow tree.

## Build

```bash
pnpm sample:build      # outputs to sample/dist/
```

CI runs this on every PR (see `.github/workflows/web.yml`). The sample is not
published to npm (`files` allowlist in `platforms/web/package.json`).
