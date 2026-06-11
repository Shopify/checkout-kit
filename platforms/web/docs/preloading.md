# Checkout Preloading on Web

This is a working note for possible web preloading support in Checkout Kit. It
captures the current direction rather than a committed API.

Current scope:

- Focus on popup/new-tab targets, because those are the only web presentation
  modes supported today.
- Defer iframe preloading until iframe presentation is an active product/API
  direction.
- Treat preloading as measurable network/cache warming first, not a promise of a
  retained checkout browsing context.

## Native reference model

Native SDKs are expected to use a single-entry WebView cache:

- `preload(url)` creates a WebView without attaching it to a visible hierarchy.
- The SDK starts loading the checkout URL immediately.
- `present(url)` later attaches that same WebView to the presented sheet or
  dialog when the URL is still usable.
- Preloading is a hint, not a guarantee.
- Consumers should call preload only when there is a strong signal that the
  buyer will enter checkout, and should invalidate/re-preload after cart
  mutations or other stale-making actions.

The useful property is that native can keep a real, loaded browsing context and
later present that exact instance.

## Current web shape

The current web component opens checkout with `window.open()` from `open()`.
Supported targets are popup, new tab, or a named window. There is no iframe
presentation target in the public API today.

Relevant implementation points:

- `platforms/web/src/checkout.ts` appends embedded-checkout protocol parameters
  to the URL and calls `window.open(...)` in `open()`.
- `platforms/web/src/checkout.types.ts` defines `CheckoutTarget` as
  `"auto" | "popup" | "_blank"`.
- Checkout-web already has a storefront-facing preload endpoint at
  `/checkouts/internal/preloads.js`:
  `/Users/danielkift/world/trees/root/src/areas/clients/checkout-web/app/entrypoints/worker/preloads-handler.tsx`.

That endpoint warms shop/config cache and emits JavaScript that injects
`preconnect` and `rel="prefetch"` links for checkout CSS, JS, fonts, and selected
images. It is asset/config warming, not a hidden checkout document.

## Active proposal: popup and new-tab preloading

The native WebView cache model does not translate cleanly to popups or new tabs.

Browser constraints:

- Popup creation is user-activation-sensitive. Creating a hidden popup early is
  not a viable general-purpose preload strategy.
- `window.open()` returns a `WindowProxy` for the window opened at that moment;
  there is no reliable browser primitive that lets us prerender a checkout
  document and later attach it to a popup `WindowProxy`.
- Speculation Rules prerender activates by replacing the current tab's document,
  which is not the same presentation model as opening checkout in a separate
  popup or named window.

Practical conclusion: for popup/new-tab targets, `preload()` should only promise
network/cache warming. It should not promise that `open()` will reuse a loaded
checkout browsing context.

Candidate implementation:

- Add a `preload()` method to `<shopify-checkout>`.
- Use the element's current validated checkout URL, including the same
  embedded-checkout protocol query parameters used by `open()`.
- Add `preconnect` hints for the checkout origin and known CDN origins.
- Load the checkout-web `/checkouts/internal/preloads.js` endpoint when the
  checkout URL can be mapped to it. In the initial prototype this endpoint is
  prefetched as a resource rather than executed as host-page JavaScript.
- Optionally add document prefetch or Speculation Rules as progressive
  enhancements after benchmarking the baseline preload endpoint approach.
- Keep failures silent or debug-only; preload remains a hint and should not block
  a later `open()`.

Important non-goals for this phase:

- Do not create a popup before `open()`.
- Do not claim a preloaded popup document will be reused.
- Do not add iframe presentation or hidden iframe caching as part of the popup
  preload work.

## Deferred: iframe preloading

An iframe target is much closer to the native model.

Possible model:

- `preload(url)` creates or reuses a single hidden iframe.
- The iframe is kept connected to the DOM so its browsing context is retained.
- The iframe uses the same embedded checkout URL parameters as `open()`.
- `open()` reveals or moves the same iframe into the visible dialog/sheet when
  the requested URL still matches the preloaded URL.
- If `src` changes, the cart mutates, checkout emits a stale/error signal, or
  the consumer calls an invalidation method, the cached iframe is discarded.

Key caveats:

- Checkout must be allowed to render in a frame for the relevant merchant and
  route.
- Payment, authentication, redirects, and delegated `window.open` flows must
  work in an embedded context.
- We should avoid detaching/recreating the iframe during presentation if that
  would discard the warmed browsing context.
- A hidden iframe can still consume network, CPU, memory, storage, and session
  state, so the cache should stay single-entry and be explicitly invalidated.

Practical conclusion: iframe preloading can plausibly match the native contract,
but only if iframe presentation becomes a supported web target and checkout-web
supports the embedded flow end to end.

For now, keep this as context only. It should not shape the first popup/new-tab
preload API beyond making sure the public contract remains broad enough to allow
a stronger iframe implementation later.

## Resource hint options

These can help both popup and iframe modes, but they are hints rather than
guarantees.

### Existing preload endpoint

Use `/checkouts/internal/preloads.js` as the first layer. It already:

- computes the same shop/config cache namespace used by checkout rendering,
- returns 2xx and fails open on preload errors,
- emits `preconnect` for relevant origins,
- emits low-priority `prefetch` for known checkout assets.

Open question: whether Checkout Kit should directly insert this script, expose a
consumer-callable `preload()` that loads it, or rely on storefront-renderer
injection when available.

### `rel="preconnect"`

Useful for early DNS/TLS/connection setup to checkout and CDN origins. This is
low-risk and should be part of any `preload()` implementation.

Future option: allow consumers to pass additional HTTPS origins to preconnect
when they know checkout will rely on a specific third-party service, such as an
analytics or identity origin. Keep this origin-only rather than URL-based:
normalize inputs to `new URL(value).origin`, reject non-HTTPS values, cap the
number of entries, and dedupe. Do not use this as an arbitrary request primitive.

### `rel="prefetch"`

Useful for future subresources and possibly documents. Limitations:

- Browser support and behavior vary.
- Fetch priority is intentionally low.
- Cache headers and cache partitioning can prevent reuse.
- Cross-site popup/new-tab reuse is less dependable than same-top-level iframe
  reuse.

This is still useful as progressive warming, especially when driven by the
checkout-web preload endpoint.

### Speculation Rules

Potentially useful for document prefetch/prerender where supported, but not a
replacement for a hidden iframe cache.

Limitations to validate:

- Browser support is not universal.
- It is document-oriented; subresources still need normal resource hints.
- Cross-origin and same-site cases have additional constraints and may require
  destination opt-in.
- Prerender activation is tab-navigation-shaped, not popup-shaped.

Practical conclusion: treat Speculation Rules as a progressive enhancement for
document warming, likely behind feature detection and conservative eligibility.

## Possible Checkout Kit API shape

Candidate API:

```ts
checkout.preload();
checkout.preload({speculationRules: true});
checkout.preload({executePreloadScript: true});
checkout.invalidatePreload();
checkout.open();
```

Semantics:

- `preload()` is best-effort and non-throwing for ordinary preload failure.
- `preload()` uses the element's current `src` and target.
- For current popup/new-tab targets, it warms resources only.
- Speculation Rules are opt-in through `preload({speculationRules: true})` and
  gated by browser support, so benchmark arms can measure their incremental
  impact separately.
- Executing checkout-web's `/checkouts/internal/preloads.js` endpoint is also
  being evaluated as a benchmark-only prototype path. This runs checkout-web's
  generated preload script on the host page so it can inject the checkout asset
  hints it returns, rather than only prefetching the endpoint response.
- `open()` should work the same whether or not preload completed.
- A future iframe target may use the same method name for a stronger retained
  iframe implementation, but that is out of scope for the popup benchmark.

Questions before committing:

- Should `preload(url)` accept an explicit URL, or only use `checkout.src`?
- Do we need a preload state/event, or should the hint remain intentionally
  silent?
- What is the stale/invalidation signal from cart mutation in web integrations?
- Can checkout-web expose a more direct document preload route, or is the
  existing asset/config preload route sufficient for popup/new-tab targets?
- Should we expose `preconnectOrigins` for additional merchant-known origins?
  If yes, keep it origin-only; arbitrary prefetch URLs are out of scope for now
  because they can trigger third-party requests before the buyer opens checkout.

## Benchmark direction

Before committing to a broader API or more advanced preload mechanisms, measure
the popup/new-tab preload path against no preload.

Candidate scenarios:

- Baseline: set `src`, call `open()` on buyer action.
- Preload endpoint: set `src`, call `preload()` after a strong signal such as
  cart view, wait a controlled delay, then call `open()`.
- Preconnect only: isolate connection warming from asset/config prefetching.
- Optional later arm: Speculation Rules or document prefetch.

Candidate metrics:

- `open_to_popup_created`: time from `checkout.open()` call to `window.open()`
  returning. This mostly detects SDK overhead and popup blocking behavior.
- `open_to_first_checkout_response`: time from `checkout.open()` to the checkout
  document response starting, captured with browser automation or network logs.
- `open_to_checkout_visible`: time from `checkout.open()` to the first observable
  checkout page paint/loaded signal in the popup. Exact marker needs a harness
  decision.
- `open_to_checkout_usable`: time from `checkout.open()` to `checkout:start`,
  which the README currently documents as the point where checkout has loaded
  and is interactive.
- `preload_to_open_delay`: controlled delay between `preload()` and `open()`, so
  results can be compared at intervals such as 0 ms, 500 ms, 2 s, and 5 s.
- Preload hit diagnostics: whether `/checkouts/internal/preloads.js` was fetched,
  whether hinted assets were fetched before open, and whether the later checkout
  load reused cached resources.

Possible harness shape:

- Extend or add a small web sample page that can run each arm with a real
  checkout URL.
- Use Playwright to drive the page, click the buyer action, capture popup
  network events, and record component events.
- Run multiple iterations per arm and report median/p75/p95 rather than a single
  run.
- Keep storefront and checkout configuration fixed across arms.
- Add throttled-network runs only after the basic no-throttle signal is clear.

Open benchmark questions:

- What is the best reliable marker for "checkout visible" in a cross-window
  popup flow?
- Can checkout-web expose a lightweight performance mark or protocol event that
  distinguishes "first visible" from `checkout:start`?
- How much preload lead time is realistic in merchant integrations?
- Should the harness use a local checkout-web preview, production-like checkout,
  or both?

### Prototype harness

There is now a Sitespeed/Browsertime prototype at
`platforms/web/benchmarks/preload/`.

Current behavior:

- Chromium-only.
- Clears browser cache/cookies before each iteration, then leaves cache enabled
  during the iteration so preload warming can be measured.
- Supports `none`, `preload`, and `preload_speculation` arms.
- Emits one `checkout-kit-preload-benchmark` JSON line per iteration.
- Captures opener-side timings, preload hint diagnostics, and best-effort popup
  navigation timings through Selenium window switching.

Current limitations:

- A real checkout URL is still needed for meaningful `checkout:start` /
  "checkout usable" timings.
- Popup paint metrics are best-effort; some pages may not expose FCP/LCP through
  the standard performance entries at collection time.
- There is not yet a preconnect-only arm, although the harness shape should
  support adding one.

## Suggested path

1. Implement a web `preload()` method as a hint for popup/new-tab targets:
   preconnect relevant origins and load the checkout-web preload endpoint when
   available.
2. Add instrumentation around preload request success, subsequent checkout open,
   and visible load milestones.
3. Build a benchmark harness to compare no preload, preconnect-only, and preload
   endpoint behavior.
4. Explore Speculation Rules document prefetch behind feature detection only if
   the first benchmark suggests there is still meaningful document-load latency
   to attack.
5. Revisit iframe target/preloading separately if iframe presentation becomes an
   active direction.
