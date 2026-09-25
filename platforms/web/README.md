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
experience through typed Checkout Kit events.

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
  - [`allowed-origins`](#allowed-origins)
  - [`telemetry`](#telemetry)
  - [Popup dimensions](#popup-dimensions)
  - [Overlay scrim](#overlay-scrim)
- [Checkout lifecycle](#checkout-lifecycle)
- [Explore the sample app](#explore-the-sample-app)
- [Contributing](#contributing)
- [Releasing](#releasing)
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
# Pin to this alpha (recommended for now — prereleases can change shape)
pnpm add @shopify/checkout-kit@4.0.0-alpha.5

# Or track the latest prerelease via the `next` dist-tag
pnpm add @shopify/checkout-kit@next

# The same works with npm:
npm install @shopify/checkout-kit@4.0.0-alpha.5
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
scrim that appears over the host page while the checkout window or tab is open.
It can sit anywhere in your DOM.

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

checkout.addEventListener('complete', (event) => {
  console.log('Order complete', event.detail.checkout.order?.id);
});

checkout.open();
// Later:
checkout.close();
```

The `ShopifyCheckout` class is also exported directly when you need the
constructor. The package has a single entry point, so this named import also
registers `<shopify-checkout>` with `customElements`:

```ts
import {ShopifyCheckout} from '@shopify/checkout-kit';

const checkout = new ShopifyCheckout();
checkout.src = 'https://your-store.myshopify.com/checkouts/cn/abc123';
document.body.append(checkout);
```

## Usage with other frameworks

### React

React 19+ has first-class support for custom elements — it renders
`<shopify-checkout>` and forwards props to it as properties with no extra
configuration. Use a `ref` to call imperative methods (`open()`, `close()`,
`focus()`) and subscribe to typed Checkout Kit events with `addEventListener`.

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
      'complete',
      (event) => console.log('Order complete', event.detail.checkout.order?.id),
      {signal},
    );
    checkout.addEventListener('close', () => console.log('Dismissed'), {
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
`complete` is available at `event.detail.checkout.order`. The element's
overloaded `addEventListener` signatures provide these types. See
[Checkout lifecycle](#checkout-lifecycle) for the full event list.

TypeScript doesn't know about the `<shopify-checkout>` tag in JSX out of the
box. Declare it once, anywhere in your project's type definitions:

```ts
import type {DetailedHTMLProps, HTMLAttributes} from 'react';
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
        'allowed-origins'?: string;
        telemetry?: boolean | 'true' | 'false';
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
> client. In server-rendered frameworks (Next.js, Remix), load the package
> through a client-only dynamic import, or load the component with server
> rendering disabled. In Next.js, `'use client'` alone still allows server
> prerendering, so it does not make a top-level package import safe.

## Usage with the Shopify Storefront API

To present checkout you first need a checkout URL. The most common way is to
use the [Storefront GraphQL API](https://shopify.dev/docs/api/storefront) to
assemble a cart (via `cartCreate` and related mutations) and read the
[`checkoutUrl`](https://shopify.dev/docs/api/storefront/2026-07/objects/Cart#field-cart-checkouturl)
field. Alternatively, a
[cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink)
can be provided.

```ts
const response = await fetch(
  'https://your-store.myshopify.com/api/2026-07/graphql.json',
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
[`cartCreate`](https://shopify.dev/docs/api/storefront/2026-07/mutations/cartCreate)
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
<shopify-checkout src="https://your-store.myshopify.com/checkouts/cn/abc123"></shopify-checkout>
```

```ts
checkout.src = 'https://your-store.myshopify.com/checkouts/cn/abc123';
```

The component appends a handful of query parameters to `src` when it opens
checkout: `ec_version` (Embedded Checkout Protocol version),
`ec_delegate` (which capabilities the host delegates), and `ck_version`
(the Checkout Kit version). The appearance also sets `ec_color_scheme` and
`ck_branding`.

### `target`

Where the checkout is presented. Defaults to `"auto"`.

| Value      | Behavior                                                            |
| ---------- | ------------------------------------------------------------------- |
| `"auto"`   | Opens checkout using the browser window target `"auto"` (default); an existing tab/window with that name may be reused. |
| `"popup"`  | Opens checkout in a popup window sized and centered over the page.  |
| `"_blank"` | Opens checkout in a new tab/window. |
| _(string)_ | Any other value is treated as a named window target, the same as the [`target` parameter of `window.open()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#target). |

```html
<shopify-checkout target="popup"></shopify-checkout>
```

Changing `target` while a session is open closes that session. Changing `src`
or `appearance` does not navigate the open window; the next `open()` call loads
the updated checkout URL.

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
<shopify-checkout appearance="app:dark"></shopify-checkout>
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
<shopify-checkout src="..." log-level="debug"></shopify-checkout>
```

```ts
checkout.logLevel = 'debug';
```

### `allowed-origins`

Adds trusted origins that may send checkout protocol messages, beyond the
checkout URL origin from `src` and `shop.app`, which are always trusted.
This includes `shop.app` subdomains. Separate multiple entries with spaces or
commas. Entries may be exact origins or wildcard subdomains:

```html
<shopify-checkout
  allowed-origins="https://payments.example.com https://*.example.net"
></shopify-checkout>
```

```ts
checkout.allowedOrigins = [
  'https://payments.example.com',
  'https://*.example.net',
];
```

Wildcard entries match subdomains only, not the apex domain. For example,
`https://*.example.net` matches `https://pay.example.net` but not
`https://example.net`. Invalid entries are ignored and log a warning at
`log-level="warn"` or more verbose.

Only HTTPS messages from the checkout window opened by this element are
processed. Set `onMessageRejected` to observe origin rejections instead of
the default warning log:

```ts
checkout.onMessageRejected = ({origin, reason}) => {
  console.warn('Checkout message rejected', origin, reason);
};
```

The callback also receives `data`, the untrusted message body. Rejection does
not emit a checkout `error` event or close the session.

> [!CAUTION]
> Setting `allowed-origins="*"` disables the message-origin allowlist. The
> HTTPS and source-window checks still apply. Use it only for controlled
> debugging, never in production.

### `telemetry`

Controls anonymous diagnostic metrics sent to Shopify. Telemetry is enabled by
default. Checkout Kit reports limited diagnostic metrics, including checkout
errors, protocol decoding failures, and checkout navigation timing (web has no
navigation retries). Diagnostics never
include checkout URLs, message payloads, buyer data, or checkout, order,
customer, or shop identifiers. Set the attribute or property to `false` to opt
out; changing it at runtime also discards buffered measurements.

On web, navigation duration starts when Checkout Kit opens the popup and ends
when checkout sends `ec.start`, because the host page cannot reliably observe
cross-origin checkout page-finish. `ec.start` means checkout is loaded and
interactive.

```html
<shopify-checkout src="..." telemetry="false"></shopify-checkout>
```

```ts
checkout.telemetry = false;
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

While a checkout window or tab is open, the component renders a `<dialog>`
scrim over the host page, with a "Continue your purchase in the checkout window"
button that focuses checkout and a close button. Hide it by either:

- Setting `display: none` on the element itself, or
- Targeting the `overlay` shadow part:

```css
shopify-checkout::part(overlay) {
  display: none;
}
```

## Checkout lifecycle

The element dispatches typed `CustomEvent`s at every meaningful moment of the
checkout session. The `start`, `update`, `complete`, and `close` events bubble,
so you can listen anywhere in your DOM, including a single delegated listener
at `document` if you have many elements on the page. The `error` event does not
bubble; attach its listener directly to the checkout element. Event payloads
are available in `event.detail`.

| Event      | `event.detail` | When it fires |
| ---------- | -------------- | ------------- |
| `start`    | `{checkout}`   | Checkout has loaded and is interactive. |
| `update`   | `{checkout}`   | A change to line items, fulfillment, totals, or checkout messages produces a different checkout snapshot. |
| `complete` | `{checkout}`   | The buyer completed the order successfully. |
| `error`    | `{error}`      | Checkout reported a terminal error, exposed as `{code, message}`. The component closes automatically after this event. |
| `close`    | _(none)_       | The open session ended through `close()`, overlay dismissal, or detection of a popup the buyer closed. |

`start`, `update`, and `complete` carry a Checkout Kit `Checkout` snapshot in
`event.detail.checkout`. It preserves checkout data, including unknown
extension fields, and omits the protocol's top-level `ucp` metadata. Known
fields use camelCase names such as `lineItems` and `fulfillment`.
Unknown extension properties remain inline and keep their original names.

All four supported change notifications feed the same `update` event. Repeated
identical snapshots are deduplicated, including when separate notifications
describe the same checkout state. Read the fields you need from the full
snapshot; there is no list of changed fields. Buyer and payment updates are
not currently supported.
Start and complete events are always delivered. Opening checkout starts a
fresh snapshot history and clears the previous checkout and error properties.

```ts
checkout.addEventListener('complete', (event) => {
  const {order} = event.detail.checkout;
  if (order) {
    analytics.track('checkout_complete', {orderId: order.id});
  }
});

checkout.addEventListener('update', (event) => {
  miniCart.updateTotals(event.detail.checkout.totals);
});

checkout.addEventListener('error', (event) => {
  const {code, message} = event.detail.error;
  console.error('Checkout error', code, message);
});

checkout.addEventListener('close', () => {
  router.back();
});
```

Protocol errors are terminal for the checkout session regardless of message
severity. The component emits `error` before closing and emitting `close`.
Use `error.code` for recovery decisions: `storefront_password_required`,
`customer_account_required`, `cart_expired`, `cart_completed`, `invalid_cart`,
or `unknown`. The `message` is diagnostic text.

Completion leaves the confirmation page open. Call `close()` if your app
should dismiss checkout after handling `complete`.

Because these events carry the full snapshot, one handler can combine fields.
For example, rendering an inline cart summary on `start` requires line items,
totals, and currency together:

```ts
checkout.addEventListener('start', (event) => {
  const {checkout: snapshot} = event.detail;
  loadingSpinner.hide();
  cartSummary.render({
    currency: snapshot.currency,
    items: snapshot.lineItems,
    totals: snapshot.totals,
  });
});
```

The latest snapshot is also mirrored to `element.checkout`. The latest
`{code, message}` error is mirrored to `element.error` when `error` fires.
These properties are useful for handlers that don't have a reference to the
originating event. TypeScript users get fully typed events through overloaded
`addEventListener` signatures with no additional setup.

## Explore the sample app

See the [`sample/`](./sample) directory for a small Vite playground that mounts
the real `<shopify-checkout>` element next to a faux storefront. Run it from
this directory with:

```sh
pnpm install
pnpm sample
```

Then open the dev server URL. In Settings, choose **Build cart permalink**
to load products from a storefront and build a cart, or **Use existing checkout
source** to enter a checkout URL directly. Open checkout and inspect the live
lifecycle events and component state in the Runtime panel.

## Contributing

We welcome code contributions, feature requests, and reporting of issues.
Please see [guidelines and instructions](../../.github/CONTRIBUTING.md).

## Releasing

See [RELEASING.md](./RELEASING.md) for the day-to-day publish flow, tag
conventions, and one-time setup notes.

## License

Shopify's Checkout Kit is provided under an [MIT License](LICENSE).
