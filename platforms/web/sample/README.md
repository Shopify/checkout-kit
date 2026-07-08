# Web Component Playground

A development harness for the `<shopify-checkout>` web component. It imports the same entry as published consumers (`@shopify/checkout-kit`, aliased to `../src/index.ts` in dev), registers the custom element, and logs `ec.*` events.

## Run locally

```bash
cd platforms/web
pnpm sample
```

Vite serves at `http://localhost:5173`.

## What the demo shows

The default flow highlights a multi-item cart use case:

1. Choose **Build cart permalink** in Settings.
2. Enter a storefront domain, for example `your-store.myshopify.com`.
3. The domain, selected flow, target, and debug setting are saved in local storage for the next page load.
4. After a 300 ms debounce, the demo automatically fetches `https://your-store.myshopify.com/products.json`.
5. Add multiple available variants from the storefront-style product cards.
6. The cart banner at the top of the center workspace shows selected lines, the derived cart permalink, and **Open checkout**.

The derived permalink looks like:

```text
https://your-store.myshopify.com/cart/123:1,456:2
```

You can also choose **Use existing checkout source** in Settings. In that mode, the storefront and cart builder are hidden, and the center workspace shows a manual URL flow with its own **Open checkout** button.

## Panels

- **Settings** — persisted storefront domain, flow, target (`popup` | `auto`), and debug settings. The storefront domain appears first because the cart builder cannot load products without it.
- **Center workspace** — build mode shows a storefront-style product grid plus sticky cart banner; manual mode shows a focused checkout URL/cart permalink input.
- **Runtime** — shows component state above the `ec.*` event log, with a JSON snapshot of component state at fire time.

The element is mounted on `<body>`. For `popup` / `auto`, the visible UI is mostly the overlay scrim while checkout is open in a separate window or tab.

## Troubleshooting product loading

The demo relies on the public `/products.json` endpoint. If product loading fails:

- Confirm the domain is a storefront domain, not a checkout URL.
- Confirm the domain is complete, for example `your-store.myshopify.com`.
- Confirm the store has products published to the Online Store channel.
- Confirm the storefront is reachable from your browser.
- Use **Use existing checkout source** if you already have a checkout URL or cart permalink and do not need product loading.

This sample does not currently call Storefront API `cartCreate`; it uses cart permalinks so the multi-item flow can be exercised without a Storefront access token.

## Build

```bash
pnpm sample:build      # outputs to sample/dist/
```

CI runs this on every PR (see `.github/workflows/web.yml`). The sample is not published to npm (`files` allowlist in `platforms/web/package.json`).
