# Universal session sample

The [Shop Pay](../shop-pay/README.md) and [Universal Checkout](../universal-checkout/README.md)
pages share this sample. Both present a Universal session: one checkout for each
participating store. They differ only in their element, `<shop-pay>` or
`<shopify-universal-checkout>`, and in how checkout opens.

From the repository root, run `dev up`, then `dev web sample`, and open
http://localhost:5173/shop-pay/ or http://localhost:5173/universal-checkout/. The
pages build with `dev web sample build`. To use the published CDN instead of local
source, run `dev web sample cdn`; there is no local fallback if that release does
not yet contain the page's element.

Checkout telemetry stays in the browser console during source development. To
opt in to production reporting, run `VITE_CK_TELEMETRY=production dev web sample`.
Built packages and sample builds retain production telemetry.

## What the demo shows

A Universal session's URL is created by your server, not built from a cart
permalink. The default flow creates it through this sample's local server:

1. Choose **Build a cart** in Settings and add one or more stores, for example
   `your-store.myshopify.com`. Each store's products load from its public
   `/products.json` endpoint as soon as it is added.
2. Add products. The cart at the top of the storefront groups lines by store. Each
   store also previews its currency for the selected buyer country, and the cart
   warns when the stores' currencies differ.
3. Click **Prepare Shop Pay** or **Prepare session**. The local server creates a Storefront API `2026-07` cart for
   each store that has items, then one Universal session from those carts, and
   returns only the Universal session URL. Stores without items are left out.
   Preparation never opens a window, so checkout later opens directly from a
   buyer gesture.
4. When the session is ready, the element gets it as `src`. Open checkout with the
   page's open button, or with Shop Pay's button on the Shop Pay page. While it is
   open, the element's overlay covers the page with the protocol inspector.
5. Changing a store's items, the stores, the environment, or the buyer country
   discards the prepared session. After a session completes or ends and its
   window closes, preparing again creates a new one from the same cart.

Choose **Use an existing session** to paste a Universal session URL that your own
server created. The pasted URL stays in page memory: it is neither saved nor
displayed anywhere else, and it is cleared when the page reloads. A URL that
doesn't look like a Universal session URL gets a hint, but the element still
tries to open it. Paste a newly created session: a URL that was already opened
elsewhere can open as a copy of the session that reports no events to this page.

## Panels

- **Settings**: flow, stores, session environment and buyer country, and the
  element's `target` and `log-level` (plus `button` on the Shop Pay page). Every
  setting except the pasted URL is saved in local storage, separately for each
  page.
- **Storefront**: the cart and checkout area above one product section per store,
  or a Universal session URL field for an existing session.
- **Component state**, **Events**, and **Protocol messages**: the element's
  attributes; a log of `start`, `update`, `complete`, `error`, `blocked`, and
  `close`, each with its `detail` as received; and the protocol messages the
  checkout window sent. The `src` row hides the URL's key. **Clear** empties both
  logs.

While checkout is open, the overlay shows each store's state, the Kit events, and
the protocol messages of the current presentation, with controls to focus or
close the checkout window. Recording starts when checkout opens, and the
**Protocol messages** section keeps the messages after the window closes.

Event details include checkout data, such as line items and buyer details,
exactly as the element received it. Keep screenshots and logs of real sessions
out of issues and chats.

## Environment configuration

The Vite development and preview servers read `.env` and `.env.local` in this
directory; copy `.env.example` to get started. `.env.local` overrides `.env`, and
exported shell values fill in keys missing from both. Restart the server after
changing either file.

| Setting                                              | Purpose                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `STOREFRONT_DOMAIN`                                  | Store that a page with no saved stores starts with.                            |
| `CHECKOUT_KIT_UC_SHOP_DOMAINS`                       | More stores to start with, comma-separated. Also allowed.                      |
| `CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS`               | Additional exact storefront domains to allow.                                  |
| `CHECKOUT_KIT_UC_SESSION_CREATE_URL`                 | Production session creation endpoint, on `https://shop.app`.                   |
| `CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL`     | Local development session creation endpoint.                                   |
| `VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST` | Host that local development session URLs must use. Not compiled into the page. |

Production accepts any `<shop>.myshopify.com` storefront. Local development
storefronts, and other domains, must be configured. Session creation endpoints
must use HTTPS, without credentials, a port, query parameters, or fragments. An
environment without a session endpoint shows **(not configured)**. These are
synthetic examples:

```dotenv
STOREFRONT_DOMAIN=your-store.myshopify.com
CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL=https://sessions.example.test/sessions
VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST=checkout.example.test
```

Only the starting stores and the names of the configured environments reach the
browser. Session endpoints stay on the local server, and nothing from the
environment is embedded in build output. Never commit credentials.

## Troubleshooting

- If a store's products do not load, confirm the domain is a storefront domain, it
  is reachable, and its products are published to the Online Store.
- If the stores' currencies differ, choose a buyer country every store sells in.
  A session needs all of its carts in one currency.
- If preparation fails, the status beside the open button names the failed step
  (cart or session), the store when one is at fault, and a safe error code. It
  never shows upstream messages, cart IDs, or keys. Subscription-only products are
  not supported.
- If the checkout window does not open, open it directly from a click and allow
  popups. A blocked window logs `blocked`, and the element's overlay offers a
  retry.

The session routes exist only in the local Vite development and preview servers.
Opening the built HTML directly, or serving it from another static host, leaves
**Use an existing session** as the only working flow.
