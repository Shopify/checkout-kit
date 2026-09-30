# Universal Checkout in Checkout Kit Web

> [!IMPORTANT]
> The Universal Checkout Web entry point is an experimental preview. Its API
> and sample are under development and are not a supported public release.

This guide describes the Web element's observable behavior and the current
integration assumptions. The [sample guide](../sample/README.md) covers the
local storefront-to-session flow. Live two-shop completion and resource-error
isolation have been observed; the remaining release gates are listed below.

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

The integration fixtures cover the expected exchange below. Live browser runs
also verified start/update delivery, partial and explicit final completion, and
resource-error isolation. Synthetic tests cover additional edge cases; the
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

A live child-checkout reload produced a resource error, and the healthy sibling
subsequently completed while the failed resource's snapshot and error remained
visible. Session-scoped producer errors, late first snapshots, all-unavailable
startup, retry or replacement, and ejection still need final producer agreement or live
validation. Kit removes child transport version metadata from public checkout
snapshots.

## Conformance evidence and remaining gates

The Web unit suite covers batched ready replies, two-shop start, changed-shop
updates, A → B → A ordering, partial completion, explicit completion,
malformed-member isolation and diagnostics, structured-cloned `undefined`,
scoped synthetic errors, source/origin isolation, close/reopen, and immutable
state. A sample integration fixture sends trusted batches through the
registered element and checks the slotted overlay DOM. These tests use a mocked popup;
they do not prove cart/session creation or real event delivery in a browser.

On 30 September 2026, Chrome runs against Kit revision `57dec1a4` used approved
test-payment stores and exercised product selection, separate carts, session
creation, Kit presentation, and received overlay events. A completed-shop
update retained its incomplete sibling, followed by an explicit final completion
batch for both shops. In a separate session, one child failed and its healthy
sibling completed without clearing the failed snapshot or error. The final live
batch changed one shop's state; preservation of a fully identical final snapshot
is covered by synthetic tests, not established by that run.

Closing and reopening the completed URL reset Kit's resources and event history,
but the producer displayed an error page before sending any protocol events.
This verified fresh presentation state, not successful completed-session replay
or a session-scoped protocol error.

The completion runs were observed live but were not recorded, and the deployed
producer revision was not independently pinned. For reproducible release
validation, record both versions, the environment, and the remaining outcomes
below. Use approved test payment flows and keep keyed URLs and buyer data out of
logs, screenshots, and public reports.

| Case | Required evidence or decision |
| --- | --- |
| Session-scoped producer errors | Agree the producer wire shape and validate real session errors through Kit; resource-error isolation and healthy-sibling completion were observed. |
| Child failure before its first snapshot | Validate interim valid-snapshot startup; settle late first snapshots, omitted-resource representation, and all-unavailable behavior without fabricated checkout data. |
| Retry, replacement, and resource ejection | Settle the resource lifecycle contract and add source-pinned fixtures plus browser coverage. |
| Reopen and replay | Fresh Kit state was observed. Confirm successful producer replay after completion; the attempted completed URL returned an error page before events. |
| Reproducible release evidence | Pin Kit and producer versions and record the approved two-shop browser path; the live completion runs above were not recorded. |
| Release readiness | Finish the wider rollout, observability, documentation, and live validation checks before supporting this API publicly. |

Keep this guide and the conformance tests synchronized with the final producer
contract.
