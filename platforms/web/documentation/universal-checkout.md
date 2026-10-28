# Universal Checkout in Checkout Kit Web

Universal Checkout presents a session spanning multiple shops and delivers typed,
batched lifecycle events. For an overview, see
[Universal Checkout on Shopify.dev](https://shopify.dev/docs/agents/carts-and-checkout/universal-checkout).
The [sample guide](https://github.com/Shopify/checkout-kit/blob/main/platforms/web/sample/universal-checkout/README.md) covers the
storefront-to-session flow.

## Open a session

The host creates a Universal Checkout session and passes its keyed
`continue_url` to Checkout Kit. The SDK presents that URL and handles the
embedded protocol; it does not create carts or sessions. Pass a Universal session
URL, not a cart permalink. Call `open()` directly from a
buyer gesture so browsers can open the popup.

Import the Universal entry point to register `<shopify-universal-checkout>`.
Importing `@shopify/checkout-kit/shopify-checkout` registers only
`<shopify-checkout>`. The package root exports the Universal class and its types without
registering the element. For manual registration, import
`ShopifyUniversalCheckout` from `@shopify/checkout-kit` and call
`ShopifyUniversalCheckout.register()`, optionally passing a custom tag name.
The two elements have separate event contracts.

```html
<shopify-universal-checkout id="universal" target="popup"></shopify-universal-checkout>
<button id="continue" type="button">Continue to checkout</button>
```

```ts
import "@shopify/checkout-kit/shopify-universal-checkout";
import type {
  ShopifyUniversalCheckout,
  ShopifyUniversalCheckoutResourceEventEntry,
} from "@shopify/checkout-kit";

const checkout = document.querySelector<ShopifyUniversalCheckout>("#universal")!;
const listeners = new AbortController();
// The element reports each change once and keeps no state for the host to read
// back. Keep the latest entry per shop; attach listeners before calling open().
const shops = new Map<string, ShopifyUniversalCheckoutResourceEventEntry>();

checkout.addEventListener(
  "start",
  (event) => {
    // A batch can contain more than one shop, and not necessarily every shop.
    for (const entry of event.detail) {
      const { context, checkout: snapshot } = entry;
      shops.set(context.shopId, entry);
      const status =
        context.status === undefined || context.status === "active"
          ? snapshot.status
          : context.status;
      renderShopStatus(context.shopId, status);
    }
    renderSession(shops);
  },
  { signal: listeners.signal },
);

checkout.addEventListener(
  "update",
  (event) => {
    for (const entry of event.detail) {
      const { context, checkout: snapshot } = entry;
      shops.set(context.shopId, entry);
      const status =
        context.status === undefined || context.status === "active"
          ? snapshot.status
          : context.status;
      renderShopStatus(context.shopId, status);
    }
    renderSession(shops);
  },
  { signal: listeners.signal },
);

checkout.addEventListener(
  "complete",
  (event) => {
    // Completion contains the completed shops. Shops ejected earlier stay in `shops`.
    // Use the resource status when present, or the child checkout status when
    // the resource status is absent or `active`.
    for (const entry of event.detail) {
      const { context, checkout: snapshot } = entry;
      shops.set(context.shopId, entry);
      const status =
        context.status === undefined || context.status === "active"
          ? snapshot.status
          : context.status;
      if (status === "completed") markShopCompleted(context.shopId);
    }
    renderSession(shops);
  },
  { signal: listeners.signal },
);

checkout.addEventListener(
  "error",
  (event) => {
    for (const { context, checkout: snapshot, error } of event.detail) {
      if (context?.shopId !== undefined) {
        // One shop failed; other shops can continue. The final snapshot is optional.
        showShopFailure(context.shopId, error.code, snapshot);
      } else if (context !== undefined) {
        showSessionFailure(error.code);
      } else {
        // A Kit-local failure before a session, such as an invalid URL.
        showPresentationFailure(error.code);
      }
    }
  },
  { signal: listeners.signal },
);

checkout.addEventListener("blocked", () => showAllowPopupsHint(), {
  signal: listeners.signal,
});

checkout.addEventListener("close", () => showCheckoutClosed(), {
  signal: listeners.signal,
});

document.querySelector("#continue")!.addEventListener("click", () => {
  shops.clear();
  checkout.src = authenticatedContinueUrl;
  checkout.open();
});

// Call listeners.abort() when the host view is removed.
```

The functions and `authenticatedContinueUrl` above are application-owned
placeholders. The URL can grant access to checkout: do not log, persist, or
place it in event diagnostics. The expected URL has a `/checkouts/uc/` path;
the SDK warns at the `warn` log level about other paths.

### Session creation and buyer authentication

Create an independent Storefront cart for each participating shop. A trusted
server then creates a Universal Checkout session from the cart IDs and returns
a keyed continuation URL. The local sample includes an adapter for this
preparation flow; see the [sample guide](https://github.com/Shopify/checkout-kit/blob/main/platforms/web/sample/universal-checkout/README.md). Keep the
continuation URL private. Configure session creation endpoints on the server;
the sample exposes only the expected continuation hostname to browser code for
destination validation.

Creating a session and authenticating the buyer are separate steps. The buyer
must be signed in to the corresponding Shop Pay environment to continue through
checkout. A signed-out buyer first sees a Shop sign-in page in the presentation.
Until sign-in finishes, checkout sends no protocol messages, so the element emits
no `start`, `update`, or `error`, and Kit does not time out. If the buyer closes
the presentation at that point, the host receives only `close`. Treat `close`
with no earlier `start`, `update`, or `error` as "no checkout was shown", not as
a lost event or a failed session, and let the buyer open checkout again. An `update`
or `error` before `start` is different: it reports a real pre-start ejection or
failure and should be handled as such. The sample does not provide a
general-purpose session creation API.

## Lifecycle contract

Universal event names are `start`, `update`, `complete`, `error`, `close`, and
`blocked`.
All lifecycle events are non-bubbling; attach listeners directly to the element.
The protocol handshake and delegated window requests are handled internally;
hosts do not subscribe to them. Per-section change notifications are not part of
this Universal surface.

| Event      | `event.detail`                            | Meaning                                                                                                                                                                |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start`    | `readonly {context, checkout}[]`          | Initial full snapshots for the child checkouts that became interactive.                                                                                                |
| `update`   | `readonly {context, checkout}[]`          | Full snapshots for changed shops, including facade status changes. It may introduce a shop, even before start. Shops it omits are unchanged.                           |
| `complete` | `readonly {context, checkout}[]`          | Shops that completed. A session can emit more than one; sibling checkouts may continue. Previously ejected shops are not repeated. |
| `error`    | `readonly {context?, checkout?, error}[]` | A resource, session, or Kit-local presentation failure. Resource failures can include the shop's final snapshot. Session failures end the session. |
| `close`    | `null`                                    | The presentation closed. Closing alone says nothing about purchase success or failure.                                                                                 |
| `blocked`  | `{code: "popup_blocked"}`                 | The browser blocked the checkout window. The overlay offers a retry; dismissing it emits `close`. Call `open()` from a user action, not from this listener.            |

A `complete` event does not necessarily end the session. Keep handling sibling
updates and later completion events. Kit ends the session once at least one shop
has completed and every other announced or observed shop has completed, reported
a terminal error, or been ejected. A session with no successful completion stays
open for recovery. A session-scoped error ends the session immediately.

Do not close the presentation on the first `complete` event unless you intend to
stop the remaining shops. `close` remains a separate presentation event.

Each resource `context` contains `sessionId`, `revision`, and `shopId`, plus
an optional `status`: `active`, `completed`, `failed`,
or `ejected`. `active` means use the child's `checkout.status`; `completed` marks
a completed shop, `failed` reports a retryable facade
failure, and `ejected` means the shop no longer participates.
These states never overwrite the full child snapshot's `checkout.status`.
A status-only change still emits an update. Retrying or a late successful
completion returns the resource to `active`; retryable failure alone does not
emit `error` or prevent later checkout updates.

An absent `context.status` on a new full snapshot clears any previous facade
override and uses the child status.
Unknown string statuses become `unknown`; a malformed non-string status drops
that member with safe diagnostics. Unknown statuses must not be interpreted as
successful completion.

Kit removes top-level `ucp` transport metadata and maps unrecognized checkout
statuses to `unknown`. Event details contain accepted entries from a contiguous
same-method, same-revision group, so do not assume one event contains every shop
in the session. Events are the element's only state surface: it exposes no
checkout or error property to read back, so keep the latest entry per shop from
`start`, `update` and `complete`, and attach listeners before calling `open()`.
An ejected shop is reported once, by the update or error that ejects it, and is
not repeated in the final completion batch.

If the host keeps per-shop errors, clear a shop's prior failure when a new
`start` arrives for that shop. An `update` alone does not clear a terminal error.

An `error` entry has a Kit-owned error code and message, optional context, and an
optional final checkout snapshot for a resource error. A context with `shopId`
identifies a resource error; absent context represents a Kit-local presentation
failure. Context without `shopId` identifies a session failure. An unsupported
browser emits an `unsupported_browser` error without opening a presentation.
An invalid `src` or failure to open the presentation emits `sdk_error` instead
of throwing. These local failures close any previous presentation before
dispatching `error`; a blocked popup still emits `blocked` with a retry overlay.
Error events are delivered directly to the element and do not bubble to global
error handlers. A resource error does not by itself close or fail the other shops. Do
not infer a session failure merely from one failed resource. `complete` and
`error` are outcomes; `close` is a separate presentation event. A custom
`slot="overlay"` replaces the built-in
overlay contents, including its focus and close controls, so the host must
provide usable controls when it supplies that slot.
