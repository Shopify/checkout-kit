# Web Component Playground

This two-page Vite playground exercises the single-checkout
`<shopify-checkout>` and experimental Universal Checkout
`<shopify-universal-checkout>` web components. Each page imports its package
entry point, aliased to local sources by Vite. The Universal API and sample
are an experimental preview and have not been released as a supported API.

## Run locally

From `platforms/web`, install the workspace dependencies and start Vite:

```sh
pnpm install
pnpm sample
```

Open the single-checkout or Universal Checkout URL printed by Vite. The
navigation at the top of either page switches between them. For the Universal
page, configure the local session environment as described below before
starting Vite.

## Single checkout

### What the demo shows

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

### Panels

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

### Troubleshooting product loading

The demo relies on the public `/products.json` endpoint. If product loading fails:

- Confirm the domain is a storefront domain, not a checkout URL.
- Confirm the domain is complete, for example `your-store.myshopify.com`.
- Confirm the store has products published to the Online Store channel.
- Confirm the storefront is reachable from your browser.
- Use **Use existing checkout source** if you already have a checkout URL or cart permalink and do not need product loading.

This sample does not currently call Storefront API `cartCreate`; it uses cart permalinks so the multi-item flow can be exercised without a Storefront access token.

## Universal Checkout

> [!IMPORTANT]
> This is an experimental preview. Its API and end-to-end buyer flow remain
> subject to contract and live validation.

The Universal page creates an independent Storefront cart for each selected shop, creates a Universal Checkout session from the resulting cart IDs, and opens its keyed continuation URL with Checkout Kit. Each shop's cart permalink on this page is only a preview; cart IDs are the session inputs.

1. Configure the sample shops and session service in the repository root `.env` or `.env.local` as described below, then start Vite. Open the Universal page. In **Checkout session**, choose **Production** or **Local development** and a **Buyer country** supported by all test shops.
2. The configured shops appear in **Shops** and load products automatically. Add or remove storefront domains as needed. Products load from each shop's public `/products.json` endpoint. Choose available products and quantities for every selected shop. At most 15 shops can be in one session, with at most 50 distinct variants per shop cart. Every selected shop needs a nonempty cart.
3. Click **Create Universal Checkout URL**. The local Vite adapter calls Storefront API `2026-07` to create one cart per shop, checks that all cart currencies match, then sends their cart IDs to the Universal Checkout session endpoint. The keyed URL is held in page state and assigned to the component's `src` for opening; it is not visibly displayed or persisted. Changing shops, products, country, or environment invalidates it; create it again after an edit.
4. Leave **Use the URL created from selected carts** selected, then click **Open Universal Checkout**. This click calls the component's `open()` method directly, so the browser can open the checkout window. Sign in to the corresponding Shop Pay environment to continue as a buyer.
5. Watch **Resource state** and **Event timeline** in the checkout overlay. The **Events** panel on the page mirrors the received events. Expand a timeline entry for its redacted status, revision, and aggregate summary. **Focus checkout**, **Close checkout**, and **Clear events** operate on the current presentation; closing the window is a separate event from checkout completion.

The event view uses the preview Checkout Kit `start`, `update`, `complete`, `error`, and `close` events. It shows only allowlisted fields and labels resources as `Shop 1`, `Shop 2`, and so on. The timeline does not copy raw checkout payloads, shop IDs, cart IDs, order details, or the keyed URL. Opening a new presentation starts a fresh timeline; **Clear events** clears the timeline while keeping the current resource state.

### Environment configuration

The Vite development and preview servers read the same repository root `.env`
and `.env.local` used by the other sample apps. `.env.local` overrides `.env`;
exported shell values are a fallback for keys missing from both files. Restart
the server after changing either file. No shell export or sample rebuild is
needed for a file change.

Set `CHECKOUT_KIT_UC_SHOP_DOMAINS` to a comma-separated list of up to 15 exact
shop domains. When the key is absent, the sample uses `STOREFRONT_DOMAIN`.
Set the key to an empty value to start without selected shops. Configured shops
are selected on each page load; adding or removing shops through the UI affects
only the current page. Cart contents are never initialized or persisted.

These are synthetic examples for the root `.env.local`:

```dotenv
CHECKOUT_KIT_UC_SHOP_DOMAINS=store-one.myshopify.com,store-two.myshopify.com
CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS=another-store.example.test
```

The local adapter permits configured shops, additional exact domains listed in
`CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS`, and production domains shaped like
`<shop>.myshopify.com`. Local development shops must be explicitly configured.
Use shops that support public products, an eligible cart creation flow, and one
common cart currency. Buyer country affects cart currency, but a shared country
does not guarantee matching currencies.

Configure `CHECKOUT_KIT_UC_SESSION_CREATE_URL` with your trusted production
session endpoint on `https://shop.app`. For **Local development**, configure both
`CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL` and
`VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST`. For example:

```dotenv
CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL=https://sessions.example.test/sessions
VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST=checkout.example.test
```

The URLs must use HTTPS and cannot include credentials, query parameters, or
fragments. Session creation URLs stay on the local server. Only the selected
shop domains and the development continuation hostname are returned to the
local browser at runtime. Despite the legacy `VITE_` variable name, this host is
not compiled into the sample. Storefront tokens and other shared environment
values are neither returned to the page nor embedded in build output.

The generated and pasted continuation URL must use HTTPS, the selected
environment's trusted host, a `/checkouts/uc/<session-id>` path, and a nonempty
`key` query value. Keep keyed cart and checkout URLs out of logs, screenshots,
and issue reports.

The **Advanced: paste an existing Universal Checkout URL** option is for
testing an already created session. The pasted value is not persisted, is
cleared when switching URL source modes, and must match the selected
environment. Like a generated URL, it is assigned to Checkout Kit's `src`
when selected. It does not create carts or a new session.

### Troubleshooting

- If products do not load, check that the shop domain is allowed for the
  selected environment, its storefront is reachable, and it has products
  published to the Online Store. Use **Retry** after fixing the shop.
- If cart creation fails, check that the selected variants are available and
  the shop permits Storefront API cart creation. If currencies differ, select
  a buyer country supported by all shops and create the URL again.
- If session creation fails, check that the selected carts are still valid
  and that the local adapter can reach the configured session service.
- If the checkout window does not open, use **Open Universal Checkout** directly
  from a click and check the browser's popup permission. Sign in to Shop Pay
  in the selected environment before continuing checkout.
- If the window opens but the timeline stays empty, verify that the checkout
  implementation is emitting Universal events and inspect Checkout Kit's
  `warn` diagnostics for dropped malformed events. An empty timeline does not
  establish a purchase outcome.

The cart, catalog, and session routes exist in the local Vite development and
preview servers. Opening the built HTML file directly or serving it from an
unrelated static host will not provide those routes. The complete two-shop
buyer flow and real producer error events still require a recorded browser
run; unit tests and source inspection alone do not establish that validation.

## Build

From `platforms/web`, run:

```sh
pnpm sample:build
```

The build outputs to `platforms/web/sample/dist/`. CI runs it on every PR.
The sample is not published to npm (`files` allowlist in
`platforms/web/package.json`).
