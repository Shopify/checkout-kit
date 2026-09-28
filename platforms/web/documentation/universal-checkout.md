# Universal Checkout in Checkout Kit Web

> [!IMPORTANT]
> The Universal Checkout Web entry point is an experimental preview. Its API
> and sample are under development and are not a supported public release.

This guide describes the Web element's observable behavior and the current
integration assumptions. The [sample guide](../sample/README.md) covers the
local storefront-to-session flow. A live multi-shop buyer run is still required
before release.

## Open a session

The host creates a Universal Checkout session and passes its keyed
`continue_url` to Checkout Kit. The SDK presents that URL and handles the
embedded protocol; it does not create carts, create sessions, or accept cart
permalinks as a replacement for the session URL. Call `open()` directly from a
buyer gesture so browsers can open the popup.

Import the Universal entry point to register `<shopify-universal-checkout>`.
Importing the standard entry point alone registers only `<shopify-checkout>`.
The two elements have separate event contracts.

```html
<shopify-universal-checkout id="universal" target="popup"></shopify-universal-checkout>
<button id="continue" type="button">Continue to checkout</button>
```

```ts
import '@shopify/checkout-kit/universal';
import type {ShopifyUniversalCheckout} from '@shopify/checkout-kit/universal';

const checkout = document.querySelector<ShopifyUniversalCheckout>('#universal')!;
const listeners = new AbortController();

checkout.addEventListener('start', (event) => {
  // A batch can contain more than one shop. The aggregate is already committed.
  for (const {context, checkout: snapshot} of event.detail) {
    renderShopStatus(context.shopId, snapshot.status);
  }
  renderSession(checkout.checkout);
}, {signal: listeners.signal});

checkout.addEventListener('update', (event) => {
  for (const {context, checkout: snapshot} of event.detail) {
    renderShopStatus(context.shopId, snapshot.status);
  }
  renderSession(checkout.checkout);
}, {signal: listeners.signal});

checkout.addEventListener('complete', (event) => {
  for (const {context} of event.detail) markShopCompleted(context.shopId);
}, {signal: listeners.signal});

checkout.addEventListener('error', (event) => {
  for (const {scope, context, error} of event.detail) {
    showFailure(scope, context?.shopId, error.code);
  }
}, {signal: listeners.signal});

checkout.addEventListener('close', () => showCheckoutClosed(), {
  signal: listeners.signal,
});

document.querySelector('#continue')!.addEventListener('click', () => {
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
preparation flow; see the [sample guide](../sample/README.md). Keep the
continuation URL private. Configure session creation endpoints on the server;
the sample exposes only the expected continuation hostname to browser code for
destination validation.

Creating a session and authenticating the buyer are separate steps. The buyer
must be signed in to the corresponding Shop Pay environment to continue through
checkout. The sample does not provide a general-purpose session creation API.

## Preview lifecycle contract

Universal event names are `start`, `update`, `complete`, `error`, and `close`.
`ec.ready` and delegated window requests are handled internally; hosts do not
subscribe to them. Granular `ec.*.change` notifications are not part of this
Universal surface.

| Event | `event.detail` | Meaning |
| --- | --- | --- |
| `start` | `readonly {context, checkout}[]` | Initial full snapshots for the child checkouts that became interactive. |
| `update` | `readonly {context, checkout}[]` | Full replacement snapshots for the shops whose public state changed. Other shops remain in `element.checkout`. A completed shop can first appear here. |
| `complete` | `readonly {context, checkout}[]` | Explicit terminal session notification, even when a final snapshot equals an earlier update. |
| `error` | `readonly {scope, context?, error}[]` | A resource failure or a Kit-local presentation failure. Producer session failures remain provisional. |
| `close` | `null` | The presentation closed. Closing alone says nothing about purchase success or failure. |

Each resource `context` contains `sessionId`, `revision`, and `shopId`.
`checkout` is a full immutable child snapshot with `status` on the checkout
itself; there is no `context.status`. Kit removes the top-level `ucp` transport
metadata and maps an unrecognized checkout status to `unknown`. Event details
contain accepted entries from a contiguous same-method, same-revision group,
so do not assume one event contains every shop in the session. Read
`element.checkout` for the current immutable aggregate `{sessionId, revision,
resources}`. It is committed for the entire accepted wire batch before the
first public listener runs. `element.error` holds the accumulated resource or
session failures separately.

An `error` entry has `scope: 'resource' | 'session'`, a Kit-owned error code and
message, and optional context for a local SDK error. Session-scoped producer
errors have not yet been verified; Kit-local presentation errors can use this
scope. Error events are delivered directly to the element and do not bubble
to global error handlers. A resource error does not by itself close or fail the other shops. Do
not infer a session failure merely from one failed resource. `complete` and
`error` are outcomes; `close` is a separate presentation event. A custom
`slot="overlay"` replaces the built-in
overlay contents, including its focus and close controls, so the host must
provide usable controls when it supplies that slot.

## Expected producer exchange for this preview

The integration fixtures cover the expected exchange below. It reflects
source inspection and synthetic tests, not a completed live buyer run. The
producer contract may change before a supported release.

1. Checkout sends one `ec.ready` request per shop in a batch. Kit replies with
   one response per request. The handshake remains private to Kit.
2. An `ec.start` batch introduces full child checkout snapshots with
   `{context: {session_id, revision, shop_id}, checkout}` members. A child
   without an available snapshot may be omitted at startup.
3. Later `ec.update` batches contain full replacement snapshots for changed
   shops. A shop can become `completed` in an update while other shops remain
   active. Repeated equal snapshots need not produce another update.
4. `ec.complete` explicitly marks session completion and may repeat a snapshot
   already delivered by an update. Hosts should handle it as an outcome event,
   even if no visible checkout field changed.
5. Kit treats optional `undefined` fields as absent after structured-clone
   delivery. Required undefined fields and malformed nested objects are still
   rejected. A malformed member is dropped without discarding valid siblings;
   Kit logs a safe reason and records decode telemetry for each dropped member.

Resource errors, missing initial snapshots, retry or replacement, and ejection
still need final producer agreement or live validation. Kit's error parser has
synthetic coverage, but real producer error outcomes remain unverified. Kit
removes child transport version metadata from public checkout snapshots.

## Conformance evidence and remaining gates

The Web unit suite covers batched ready replies, two-shop start, changed-shop
updates, A → B → A ordering, partial completion, explicit completion,
malformed-member isolation and diagnostics, structured-cloned `undefined`,
scoped synthetic errors, source/origin isolation, close/reopen, and immutable
state. A sample integration fixture sends trusted batches through the
registered element and checks the slotted overlay DOM. These tests use a mocked popup;
they do not prove cart/session creation or real event delivery in a browser.

Before treating the sample as complete, record the Kit and producer versions,
environment, and results of an approved two-shop browser run: domains → product
selection → separate carts → session URL → Kit open → overlay events. Exercise
partial and full completion separately, and use approved test payment flows.
Keep keyed URLs out of logs, screenshots, and reports.

| Case | Required evidence or decision |
| --- | --- |
| Resource and session errors | Agree the producer wire shape and validate real errors through Kit. |
| Child failure before its first snapshot | Agree startup and late-arrival behavior, then verify healthy shops can proceed without fabricated checkout data. |
| Retry, replacement, and resource ejection | Settle the resource lifecycle contract and add source-pinned fixtures plus browser coverage. |
| Reopen and replay | Confirm behavior after completion and test fresh presentation state without duplicate callbacks. |
| Full sample flow | Record the two-shop browser path; fixtures alone do not satisfy this gate. |
| Release readiness | Finish the wider rollout, observability, documentation, and live validation checks before supporting this API publicly. |

Keep this guide and the conformance tests synchronized with the final producer
contract.
