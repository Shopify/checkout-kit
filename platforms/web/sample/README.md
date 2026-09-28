# Web Component Playground

A development harness for the `<shopify-checkout>` web component. It imports the same entry as published consumers (`@shopify/checkout-kit`, aliased to `../src/index.ts` in dev), registers the custom element, and logs Checkout Kit lifecycle events.

## Run locally

```bash
cd platforms/web
pnpm sample
```

Vite serves the single-checkout sample at `http://localhost:5173/` and the Universal Checkout sample at `http://localhost:5173/universal.html`. The topbar links the two pages.

## Universal Checkout sample

The Universal page uses the same three-panel layout and cart controls as the single-checkout page. Enter a storefront domain and choose **Add shop** to load its public `/products.json` catalog immediately. Each selected shop has its own cart, product loading status, Retry and Remove controls, and an individual cart permalink preview. You can add multiple shops, including products with the same variant ID in different shops; quantities remain separate.

Use a bare domain such as `store-one.myshopify.com` or its HTTPS homepage. The form rejects credentials, ports, other schemes, paths, and duplicate normalized domains. The selected domains, carts, and links stay in memory. Only presentation settings, panel collapse choices, and panel widths use Universal-specific local storage keys.

The public products endpoint does not supply a currency code through this sample's catalog helper, so prices are shown without a currency symbol and carts are counted by items rather than combined into a cross-shop monetary total. A failed or empty shop remains selected and must be retried or removed before a Universal Checkout URL can be created. The session creation and Open controls are added in the following sample increments; this page currently stops at cart previews.

## What the demo shows

The default flow highlights a multi-item cart use case:

1. Choose **Build cart permalink** in Settings.
2. Enter a storefront domain, for example `your-store.myshopify.com`.
3. The domain, selected flow, target, appearance, and log-level setting are saved in local storage for the next page load.
4. After a 500 ms debounce, the demo automatically fetches `https://your-store.myshopify.com/products.json`.
5. Add multiple available variants from the storefront-style product cards.
6. The cart banner at the top of the center workspace shows selected lines, the derived cart permalink, and **Open checkout**.

The derived permalink looks like:

```text
https://your-store.myshopify.com/cart/123:1,456:2
```

You can also choose **Use existing checkout source** in Settings. In that mode, the storefront and cart builder are hidden, and the center workspace shows a manual URL flow with its own **Open checkout** button.

## Panels

- **Settings** — persisted storefront domain, flow, target (`popup` | `auto`), appearance (default `storefront` | `app:light` | `app:dark` | `app:automatic` | `storefront`), and log-level (`debug` | `warn` | `error` | `none`) settings. The storefront domain appears first because the cart builder cannot load products without it.
- **Center workspace** — build mode shows a storefront-style product grid plus sticky cart banner; manual mode shows a focused checkout URL/cart permalink input.
- **Runtime** — shows component state above the `start`, `update`, `complete`, `error`, and `close` event log. Each entry includes the event detail and a JSON snapshot of component state at fire time.

The element is mounted on `<body>`. For `popup` / `auto`, the visible UI is mostly the overlay scrim while checkout is open in a separate window or tab.

The `start`, `update`, and `complete` events expose the latest Checkout Kit
snapshot at `event.detail.checkout`, without protocol metadata. Changes to line
items, fulfillment, totals, or messages feed one `update` event; repeated identical
snapshots do not produce another update. The `error` event exposes a
`{code, message}` error. Checkout stays open for recoverable errors and closes
automatically only for errors with `unrecoverable` severity.

## Troubleshooting product loading

The demo relies on the public `/products.json` endpoint. If product loading fails:

- Confirm the domain is a storefront domain, not a checkout URL.
- Confirm the domain is complete, for example `your-store.myshopify.com`.
- Confirm the store has products published to the Online Store channel.
- Confirm the storefront is reachable from your browser.
- Use **Use existing checkout source** if you already have a checkout URL or cart permalink and do not need product loading.

The single-checkout page does not call Storefront API `cartCreate`; it uses cart permalinks so the multi-item flow can be exercised without a Storefront access token. Universal session creation will use shop carts in its next increment.

## Build

```bash
pnpm sample:build      # outputs index.html and universal.html to sample/dist/
```

CI runs this on every PR (see `.github/workflows/web.yml`). The sample is not published to npm (`files` allowlist in `platforms/web/package.json`).
