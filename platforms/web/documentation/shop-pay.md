# Shop Pay in Checkout Kit Web

`<shop-pay>` presents a Universal session: one checkout for each participating
shop, each completed with Shop Pay. Your server creates the session and
passes its Universal session URL to the element as `src`. The element presents
that URL and reports each shop's checkout; it does not create carts or
sessions.
The [sample guide](https://github.com/Shopify/checkout-kit/blob/main/platforms/web/sample/shop-pay/README.md) covers the storefront-to-session
flow.

## Open a session

Show Shop Pay's button with the `button` attribute. A tap calls `open()`, so the
browser can open the popup from the buyer's gesture:

```html
<shop-pay id="shop-pay" target="popup" button></shop-pay>
```

```ts
import '@shopify/checkout-kit/shop-pay';

const shopPay = document.querySelector('shop-pay')!;
shopPay.src = universalSessionUrl;
```

To use your own control instead, leave out `button` and call `open()` from the
buyer's gesture:

```html
<shop-pay id="shop-pay" target="popup"></shop-pay>
<button id="pay" type="button">Buy with Shop Pay</button>
```

```ts
document.querySelector('#pay')!.addEventListener('click', () => shopPay.open());
```

While checkout is open, the element shows an overlay over the page that can
focus or close the checkout window. `close()` closes both.

`universalSessionUrl` is an application-owned placeholder. The Universal session
URL grants access to the buyer's checkout: don't log it, persist it, or include
it in diagnostics. Its path is `/checkouts/uc/<id>`, and the element warns, at
`log-level="warn"` or more verbose, when `src` has another path. Create a new
session for each checkout attempt: a URL that was already opened elsewhere can
open as a copy of the session that reports no events to your page.

### Manual registration

Importing `@shopify/checkout-kit/shop-pay` registers `<shop-pay>`. The
package root, `@shopify/checkout-kit`, exports the `ShopPay` class and its types
without registering the element. To register it yourself, or under another tag name, call
`ShopPay.register()`:

```ts
import {ShopPay} from '@shopify/checkout-kit';

ShopPay.register();
ShopPay.register('my-shop-pay');
```

### Buyer sign-in

The buyer must be signed in to Shop to continue. A signed-out buyer first sees
Shop's sign-in page in the checkout window. Until sign-in finishes, checkout
sends nothing, so the element dispatches no `start`, `update`, or `error`. If the
buyer closes the window at that point, the element dispatches only `close`.
Treat `close` with no earlier `start`, `update`, or `error` as "no checkout was
shown", and let the buyer open checkout again. An `update` or `error` before
`start` reports a real change or failure.

## Configuration

The element's attributes and the matching properties on the `ShopPay` instance
are reflected.

| Attribute         | Property         | Default        | Description |
| ----------------- | ---------------- | -------------- | ----------- |
| `src`             | `src`            | _(none)_       | The Universal session URL. |
| `button`          | `button`         | `false`        | Shows Shop Pay's button. A tap calls `open()`. |
| `target`          | `target`         | `"auto"`       | Where checkout opens: `"auto"` or `"_blank"` for a new tab, `"popup"` for a popup window centered over the page, or a window name. `"_self"`, `"_parent"`, and `"_top"` fall back to `"auto"`. |
| `log-level`       | `logLevel`       | `"error"`      | Console logging: `"debug"`, `"warn"`, `"error"`, or `"none"`. |
| `telemetry`       | `telemetry`      | `true`         | Set to `false` to turn off anonymous diagnostic metrics. |

Changing `src` or `target` closes an open checkout.

## Checkout lifecycle

The element dispatches typed `CustomEvent`s. None of them bubble, so attach
listeners directly to the element. Each event describes the checkouts it
changed, not necessarily every checkout in the session.

| Event      | `event.detail`                  | When it fires |
| ---------- | ------------------------------- | ------------- |
| `start`    | `readonly {context, checkout}[]` | Checkouts became interactive. |
| `update`   | `readonly {context, checkout}[]` | Checkouts or their status changed. A shop that leaves the session has `context.status` `"ejected"`. |
| `complete` | `readonly {context, checkout}[]` | Checkouts completed. A session can emit more than one; sibling checkouts may continue. Previously ejected shops are not repeated. |
| `error`    | `readonly {context?, checkout?, error}[]` | Something failed. Each `error` is `{code, message}`; `context.shopId` names the failed shop, and `checkout` is its final snapshot when the producer supplied one. |
| `close`    | `null`                          | The checkout window closed through `close()`, the overlay, or the buyer, including after `complete` or `error`. Closing says nothing about the outcome. |
| `blocked`  | `{code}`                        | The browser blocked the checkout window, with `code` set to `"popup_blocked"`. The overlay offers a retry; dismissing it dispatches `close`. |

`context` is `{sessionId, revision, shopId, status?}`. `status` is the shop's
place in the session: `"active"`, `"completed"`, `"failed"`, `"ejected"`, or
`"unknown"`. When it's absent or `"active"`, use the checkout's own
`checkout.status`. Each `checkout` is Checkout Kit's frozen `Checkout` snapshot
without the protocol's top-level `ucp` metadata; unrecognized checkout statuses
become `"unknown"`.

A `complete` event doesn't necessarily end the session. Keep handling sibling
updates and later completion events. The session ends once at least one shop
has completed and every other shop has completed, reported a terminal error, or
left. A session with no successful completion stays open for recovery, and a
session-scoped error ends it immediately. Don't close the checkout on the first
`complete` event unless you intend to stop the remaining shops.

Events are the element's only state. Each one carries only the checkouts it
describes, so keep the latest entry per `shopId` yourself, and attach listeners
before calling `open()`.

```ts
import type {ShopPayResourceEventEntry} from '@shopify/checkout-kit';

const shops = new Map<string, ShopPayResourceEventEntry>();

for (const type of ['start', 'update', 'complete'] as const) {
  shopPay.addEventListener(type, (event) => {
    for (const entry of event.detail) {
      const {context, checkout} = entry;
      shops.set(context.shopId, entry);
      const status =
        context.status === undefined || context.status === 'active'
          ? checkout.status
          : context.status;
      renderShop(context.shopId, status, checkout.totals);
    }
  });
}

shopPay.addEventListener('complete', (event) => {
  // Shops can complete separately; the others may still send updates.
  showOrderConfirmation(event.detail);
});

shopPay.addEventListener('error', (event) => {
  for (const {context, error} of event.detail) {
    console.error('Shop Pay error', error.code, error.message, context?.shopId);
  }
});
```

### Errors

An error with `context.shopId` belongs to that checkout and leaves the session
open. Any other error ends the session; an error without `context` happened
before a session, such as an invalid `src`. After the session completes or
ends, the element ignores later checkout messages but leaves the checkout
window open: call `close()` when your page is done with it.

| `error.code`                   | Meaning |
| ------------------------------ | ------- |
| `unsupported_browser`          | The browser lacks Shadow DOM, native dialogs, or abortable event listeners. No window opens. |
| `sdk_error`                    | Checkout Kit couldn't open checkout, for example because `src` is empty or not an HTTPS URL, or received a malformed error from checkout. |
| `storefront_password_required` | The storefront is password protected. |
| `customer_account_required`    | The shop requires a customer account. |
| `cart_expired`                 | The cart has expired. |
| `cart_completed`               | The cart was already checked out. |
| `invalid_cart`                 | The cart can't be checked out. |
| `unknown`                      | Any other error. |

Use `code` for application behavior; `message` is diagnostic text.

Invalid URLs and failures to open the presentation report `sdk_error` instead
of throwing. These local failures, including `unsupported_browser`, close any
previous presentation before dispatching `error`. A browser-blocked popup still
emits `blocked` and keeps its retry overlay open.

A `blocked` listener can't reopen checkout: a call to `open()` from it is
ignored. Call `open()` again from a user action, such as a click.

## Styling

| Name                                | Kind                | Description |
| ----------------------------------- | ------------------- | ----------- |
| `overlay`                           | CSS part            | The overlay scrim shown over the page while checkout is open. |
| `overlay`                           | Slot                | Replaces the overlay's contents while checkout is open. |
| `overlay-blocked`                   | Slot                | Replaces the overlay's contents when the browser blocked the window. |
| `--shopify-checkout-dialog-width`   | CSS custom property | Popup width in pixels. Defaults to `600`, capped at 90% of the window. |
| `--shopify-checkout-dialog-height`  | CSS custom property | Popup height in pixels. Defaults to `600`, capped at 90% of the window. |

A custom overlay slot replaces the built-in focus and close controls, so provide
your own. To hide only the overlay, target its part. With `button`, hiding the
element itself also hides Shop Pay's button:

```css
shop-pay::part(overlay) {
  display: none;
}
```
