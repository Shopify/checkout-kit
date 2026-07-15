# Shopify Checkout Kit - Web

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](https://github.com/Shopify/checkout-kit/blob/main/LICENSE) [![npm next](https://img.shields.io/npm/v/@shopify/checkout-kit/next.svg?label=npm%20%40next)](https://www.npmjs.com/package/@shopify/checkout-kit)

<img width="3200" height="800" alt="gradients" src="https://github.com/user-attachments/assets/72813286-1bec-493b-b08a-6cc4ba23dbda" />

> [!WARNING]
> **Alpha — early preview.** This software is an early preview and is **not**
> production-ready. Stability is not guaranteed, and breaking changes may
> occur in any release. Published under the `next` dist-tag — see
> [Installation](#installation).

**Shopify Checkout Kit** is a web component library that enables any website to
present the world's highest converting, customizable, one-page checkout. The
presented experience is a fully-featured checkout that preserves all of the
store customizations: Checkout UI extensions, Functions, branding, and more. It
also provides web idiomatic defaults such as opening checkout in a popup or
new tab, a transient overlay scrim while the popup is open, and convenient
developer APIs to embed, customize, and follow the lifecycle of the checkout
experience via the
[Embedded Checkout Protocol](https://ucp.dev/2026-04-08/specification/embedded-checkout/).

Check out our blog to
[learn how and why we built the Shopify Checkout Kit](https://www.shopify.com/partners/blog/mobile-checkout-sdks-for-ios-and-android).

- [Platform Requirements](#platform-requirements)
- [Getting Started](#getting-started)
  - [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Programmatic Usage](#programmatic-usage)
- [Usage with other frameworks](#usage-with-other-frameworks)
  - [React](#react)
- [Usage with the Shopify Storefront API](#usage-with-the-shopify-storefront-api)
- [Configuration](#configuration)
  - [`src`](#src)
  - [`target`](#target)
  - [`appearance`](#appearance)
  - [`log-level`](#log-level)
  - [Popup dimensions](#popup-dimensions)
  - [Overlay scrim](#overlay-scrim)
- [Checkout lifecycle](#checkout-lifecycle)
- [Explore the sample app](#explore-the-sample-app)
- [Contributing](#contributing)
- [License](#license)

## Platform Requirements

- **Browsers** — evergreen Chromium, Firefox, and WebKit (Safari 16.4+). The
  component relies on `<dialog>`, native `customElements`, and `AbortController`
  — all stable in every supported browser.
- **TypeScript** (optional) — `5.0+` for consumers using the bundled type
  definitions.
- **Bundler** (optional) — works with Vite, Rollup, esbuild, webpack, or
  no bundler at all via `<script type="module">`.

## Getting Started

Shopify Checkout Kit for the web is an open-source npm package.

Use the following steps to get started with adding it to your web application:

### Installation

The package is currently in **pre-release**. There is no `latest` dist-tag
published yet, so plain `pnpm add @shopify/checkout-kit` will fail with
_no matching version_. Pin to the alpha explicitly, or follow the `next`
dist-tag:

```sh
# Pin to the current alpha (recommended for now — prereleases can change shape)
pnpm add @shopify/checkout-kit@4.0.0-alpha.2

# Or track the latest prerelease via the `next` dist-tag
pnpm add @shopify/checkout-kit@next

# The same works with npm:
npm install @shopify/checkout-kit@4.0.0-alpha.2
# or
npm install @shopify/checkout-kit@next
```

Once the first stable `4.0.0` ships, the standard `pnpm add @shopify/checkout-kit`
(no version specifier) will work and pull from the `latest` dist-tag.

## Basic Usage

Import the package once anywhere in your application. The import has a side
effect — it registers `<shopify-checkout>` with `customElements`:

```ts
import '@shopify/checkout-kit';
```

Then render the element anywhere in your HTML and call `open()` to present
checkout:

```html
<shopify-checkout
  id="checkout"
  src="https://your-store.myshopify.com/checkouts/cn/abc123"
  target="popup"
></shopify-checkout>

<button id="buy-now">Buy now</button>

<script type="module">
  import '@shopify/checkout-kit';

  const checkout = document.getElementById('checkout');
  document.getElementById('buy-now').addEventListener('click', () => {
    checkout.open();
  });
</script>
```

The element has no visible layout of its own beyond a transient `<dialog>`
scrim that appears over the host page while the popup is open. It can sit
anywhere in your DOM.

See [usage with the Storefront API](#usage-with-the-shopify-storefront-api)
below for details on how to obtain a checkout URL.

## Programmatic Usage

If you'd rather not declare the element in HTML, create one from JavaScript:

```ts
import '@shopify/checkout-kit';
import type {ShopifyCheckout} from '@shopify/checkout-kit';

const checkout = document.createElement('shopify-checkout') as ShopifyCheckout;
checkout.src = 'https://your-store.myshopify.com/checkouts/cn/abc123';
checkout.target = 'popup';
document.body.append(checkout);

checkout.addEventListener('ec.complete', (event) => {
  console.log('Order complete', event.detail.checkout.order?.id);
});

checkout.open();
// Later:
checkout.close();
```

The `ShopifyCheckout` class is also exported directly if you want to import
the constructor without registering the element globally:

```ts
import {ShopifyCheckout} from '@shopify/checkout-kit';

if (!customElements.get('shopify-checkout')) {
  customElements.define('shopify-checkout', ShopifyCheckout);
}
```

## Usage with other frameworks

### React

React 19+ has first-class support for custom elements — it renders
`<shopify-checkout>` and forwards props to it as properties with no extra
configuration. Reach for a `ref` for the two things that aren't expressible as
JSX props: calling imperative methods (`open()`, `close()`, `focus()`) and
subscribing to the `ec.*` events.

```tsx
import {useEffect, useRef} from 'react';
import '@shopify/checkout-kit';
import type {ShopifyCheckout} from '@shopify/checkout-kit';

export function BuyNowButton({checkoutUrl}: {checkoutUrl: string}) {
  const checkoutRef = useRef<ShopifyCheckout>(null);

  useEffect(() => {
    const checkout = checkoutRef.current;
    if (!checkout) return;

    // A single AbortController removes every listener on cleanup.
    const controller = new AbortController();
    const {signal} = controller;

    checkout.addEventListener(
      'ec.complete',
      (event) => console.log('Order complete', event.detail.checkout.order?.id),
      {signal},
    );
    checkout.addEventListener('ec.close', () => console.log('Dismissed'), {
      signal,
    });

    return () => controller.abort();
  }, []);

  return (
    <>
      <shopify-checkout ref={checkoutRef} src={checkoutUrl} target="popup" />
      <button onClick={() => checkoutRef.current?.open()}>Buy now</button>
    </>
  );
}
```

`event` is fully typed inside each listener. For example, order data for
`ec.complete` is available at `event.detail.checkout.order`. The element's
overloaded `addEventListener` signatures provide these types. See
[Checkout lifecycle](#checkout-lifecycle) for the full event list.

TypeScript doesn't know about the `<shopify-checkout>` tag in JSX out of the
box. Declare it once, anywhere in your project's type definitions:

```ts
import type {ShopifyCheckout} from '@shopify/checkout-kit';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'shopify-checkout': DetailedHTMLProps<
        HTMLAttributes<ShopifyCheckout>,
        ShopifyCheckout
      > & {
        src?: string;
        target?: string;
        appearance?: string;
        'log-level'?: 'debug' | 'warn' | 'error' | 'none';
      };
    }
  }
}
```

> [!NOTE]
> On React 18 and earlier, declare the element on the **global** `JSX`
> namespace (`declare global { namespace JSX { ... } }`) instead of augmenting
> the `react` module.

> [!NOTE]
> The `import '@shopify/checkout-kit'` side effect registers the element with
> `customElements` and touches browser-only globals, so it must run on the
> client. In server-rendered frameworks (Next.js, Remix), keep the import and
> the component in a client component — e.g. add `'use client'` to the top of
> the file.

## Usage with the Shopify Storefront API

To present checkout you first need a checkout URL. The most common way is to
use the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront) to
assemble a cart (via `cartCreate` and related mutations) and read the
[`checkoutUrl`](https://shopify.dev/docs/api/storefront/2026-04/objects/Cart#field-cart-checkouturl)
field. Alternatively, a
[cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink)
can be provided.

```ts
const response = await fetch(
  'https://your-store.myshopify.com/api/2026-04/graphql.json',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': '<storefront access token>',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        mutation CreateCart($lines: [CartLineInput!]) {
          cartCreate(input: {lines: $lines}) {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        lines: [{merchandiseId: 'gid://shopify/ProductVariant/...', quantity: 1}],
      },
    }),
  },
);

if (!response.ok) {
  throw new Error(`Storefront API request failed: ${response.status}`);
}

const {data, errors} = await response.json();
if (errors?.length || data.cartCreate.userErrors.length) {
  throw new Error('Could not create cart');
}

checkout.src = data.cartCreate.cart.checkoutUrl;
```

For production use, see the
[Storefront API GraphiQL Explorer](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started)
for schema exploration and the
[`cartCreate`](https://shopify.dev/docs/api/storefront/2026-04/mutations/cartCreate)
mutation reference for the full input shape (buyer identity, attributes,
discount codes, delivery preferences, etc.).

> [!IMPORTANT]
> `src` must be an `https:` URL. The component drops invalid or non-HTTPS
> values and refuses to open. At `log-level="warn"` or more verbose, a
> warning is logged to the console.

## Configuration

The presented checkout is customized via attributes on the
`<shopify-checkout>` element (or the equivalent properties on the
`ShopifyCheckout` instance — both are reflected).

### `src`

The URL of the checkout to load. Typically `cart.checkoutUrl` from the
Storefront API.

```html
<shopify-checkout src="https://your-store.myshopify.com/checkouts/cn/abc123" />
```

```ts
checkout.src = 'https://your-store.myshopify.com/checkouts/cn/abc123';
```

The component appends a handful of query parameters to `src` when it opens
checkout: `ec_version` (Embedded Checkout Protocol version),
`ec_delegate` (which capabilities the host delegates), and `ck_version`
(the Checkout Kit version).

### `target`

Where the checkout is presented. Defaults to `"auto"`.

| Value      | Behavior                                                            |
| ---------- | ------------------------------------------------------------------- |
| `"auto"`   | Opens checkout in a new browser tab (default).                      |
| `"popup"`  | Opens checkout in a popup window sized and centered over the page.  |
| `"_blank"` | Synonym for `"auto"` — new tab.                                     |
| _(string)_ | Any other value is treated as a named window target, the same as the [`target` parameter of `window.open()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#target). |

```html
<shopify-checkout target="popup" />
```

> [!NOTE]
> `"_self"`, `"_parent"`, and `"_top"` are not allowed — they would navigate
> the host page away. The component falls back to `"auto"` if you set one,
> and logs a warning at `log-level="warn"` or more verbose.

### `appearance`

Sets the checkout appearance preference. Defaults to `"storefront"`.

| Value             | Behavior                                            |
| ----------------- | --------------------------------------------------- |
| _(unset)_         | Uses the storefront's configured checkout branding. |
| `"app:light"`     | Uses the app appearance with the light color scheme. |
| `"app:dark"`      | Uses the app appearance with the dark color scheme. |
| `"app:automatic"` | Uses the app appearance and lets checkout choose.   |
| `"storefront"`    | Uses the storefront's configured checkout branding. |

```html
<shopify-checkout appearance="app:dark" />
```

```ts
checkout.appearance = 'app:dark';
checkout.appearance = undefined;
```

Invalid values are ignored. At `log-level="warn"` or more verbose, the
component logs a warning for invalid values.

### `log-level`

Controls console logging verbosity. Defaults to `"error"`. The levels form a
threshold ordered from most to least verbose — selecting one emits that level
and every more-severe level:

| Value     | Emits                          |
| --------- | ------------------------------ |
| `"debug"` | debug, warnings, and errors    |
| `"warn"`  | warnings and errors            |
| `"error"` | errors only (default)          |
| `"none"`  | nothing                        |

Use `"debug"` while wiring up `src` and event handlers during integration, or
`"error"` / `"none"` to quiet the integration warnings in production.

```html
<shopify-checkout src="..." log-level="debug" />
```

```ts
checkout.logLevel = 'debug';
```

### Popup dimensions

When `target="popup"`, the popup is centered over the host window. Defaults
are `600 × 600`, capped at 90% of the host window. Override via CSS custom
properties:

```css
shopify-checkout {
  --shopify-checkout-dialog-width: 720;
  --shopify-checkout-dialog-height: 800;
}
```

### Overlay scrim

While a popup is open the component renders a `<dialog>` scrim over the host
page, with a "Continue your purchase in the checkout window" link and a close
button. Hide it by either:

- Setting `display: none` on the element itself, or
- Targeting the `overlay` shadow part:

```css
shopify-checkout::part(overlay) {
  display: none;
}
```

## Checkout lifecycle

The element dispatches `ec.*` `CustomEvent`s at every meaningful moment
of the checkout session. All events bubble, so you can listen anywhere in your
DOM — including a single delegated listener at `document` if you have many
elements on the page. Each event carries a typed `event.detail` payload with
exactly the fields relevant to that moment.

| Event                  | `event.detail` | When it fires                                                              |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| `ec.start`             | `{checkout}`   | Checkout has loaded and is interactive.                                    |
| `ec.complete`          | `{checkout}`   | The buyer completed the order successfully.                                |
| `ec.close`             | _(none)_       | The popup was dismissed (by the buyer, by `close()`, or by `focus` loss).  |
| `ec.error`             | `{error}`      | Session-level fatal error — tear down the embedded context.                |
| `ec.line_items.change` | `{checkout}`   | The cart's line items changed (item added/removed/quantity updated).       |
| `ec.totals.change`     | `{checkout}`   | The cart totals changed (subtotal, tax, shipping, discounts, total).       |
| `ec.messages.change`   | `{checkout}`   | Checkout-level warnings/errors/info shown inside the checkout changed.     |

`ec.start`, `ec.complete`, and the change events carry the full UCP `Checkout`
snapshot in `event.detail.checkout` for handlers that need broader context.

```ts
checkout.addEventListener('ec.complete', (event) => {
  const {order} = event.detail.checkout;
  if (order) {
    analytics.track('checkout_complete', {orderId: order.id});
  }
});

checkout.addEventListener('ec.totals.change', (event) => {
  miniCart.updateTotals(event.detail.checkout.totals);
});

checkout.addEventListener('ec.close', () => {
  router.back();
});
```

Because these events carry the full snapshot, one handler can combine fields.
For example, rendering an inline cart summary on `ec.start` requires line
items, totals, and currency together:

```ts
checkout.addEventListener('ec.start', (event) => {
  const {checkout: snapshot} = event.detail;
  loadingSpinner.hide();
  cartSummary.render({
    currency: snapshot.currency,
    items: snapshot.lineItems,
    totals: snapshot.totals,
  });
});
```

The latest full UCP `Checkout` snapshot is also mirrored to `element.checkout`
whenever an event with `{checkout}` arrives. The latest error is mirrored to
`element.error` when `ec.error` fires. These properties are useful for handlers
that don't have a reference to the originating event. TypeScript users get
fully typed events through overloaded `addEventListener` signatures with no
additional setup.

> [!NOTE]
> Most public `ec.*` DOM event names mirror the underlying
> [Embedded Checkout Protocol](https://ucp.dev/2026-04-08/specification/embedded-checkout/)
> JSON-RPC method names. `ec.close` is component-only and synthetic; it is not
> part of the ECP wire protocol.

## Explore the sample app

See the [`sample/`](./sample) directory for a small Vite playground that mounts
the real `<shopify-checkout>` element next to a faux storefront. Run it from
this directory with:

```sh
pnpm install
pnpm sample
```

Then open the dev server URL and paste a valid checkout URL into the `src`
field to try `open()` / `close()` / `focus()` and see the live event stream.

## Contributing

We welcome code contributions, feature requests, and reporting of issues.
Please see [guidelines and instructions](../../.github/CONTRIBUTING.md).

## Releasing

See [RELEASING.md](./RELEASING.md) for the day-to-day publish flow, tag
conventions, and one-time setup notes.

## License

Shopify's Checkout Kit is provided under an [MIT License](LICENSE).
