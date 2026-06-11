# Popup Checkout Preload Benchmark Report

Date: 2026-06-11

## Summary

We ran two 20-round Chromium benchmark matrices against popup checkout using a
fresh Storefront `cartCreate` checkout URL per round. The result is directionally
positive, but noisy:

- `preconnect` was the lowest-risk and most consistently useful arm.
- `preload_execute` showed useful gains in the first run and in combined paired
  analysis, but was not consistently better than `preconnect`.
- `preload_execute_speculation` did not show a clear incremental win over
  `preload_execute`; Speculation Rules should stay behind a benchmark or
  experiment toggle for now.

Recommendation: make web `preload()` a best-effort popup/new-tab network hint,
starting with `preconnect`/`dns-prefetch` to checkout and known CDN origins.
Continue evaluating execution of checkout-web's preload endpoint behind an
experiment or debug option, because it may be worthwhile if the security/product
caveat is acceptable. Do not include Speculation Rules in the default path yet.

## Methodology

Harness: `platforms/web/benchmarks/preload/run-matrix.sh` and
`platforms/web/benchmarks/preload/preload.sitespeed.cjs`.

Configuration:

- Browser: Chromium via Sitespeed/Browsertime.
- Presentation: popup target.
- Run mode: interleaved, with arm order randomized per round.
- Samples: 20 rounds per run, 4 arms per round, 80 samples per run.
- Checkout URL source: Storefront API `cartCreate` against a Shopify test store.
  The harness creates one fresh cart per round with one configured product
  variant at quantity 1, then uses the returned `cart.checkoutUrl`.
- Storefront details: the real test store domain, Storefront access token,
  variant ID, and generated checkout URLs are intentionally omitted from this
  report. The active run used `CHECKOUT_KIT_BENCHMARK_CART_SOURCE=storefront`.
- Round fairness: each round's freshly generated `cart.checkoutUrl` is reused
  across all shuffled arms in that round, so the variants compare against the
  same checkout URL instead of four different carts.
- Lead time: 1000 ms before `open()`.
- Baseline fairness: `none` also waits the same 1000 ms before `open()`.
- Browser cache and cookies are cleared before each sample; cache remains enabled
  during the sample so preload can warm state before `open()`.
- Sensitive Storefront config and generated checkout URLs are intentionally not
  included in this report.

Per-sample flow:

1. Sitespeed/Browsertime clears browser cache and cookies.
2. Browsertime loads the local sample app at `http://127.0.0.1:5173`.
3. The harness waits for the `<shopify-checkout>` element.
4. The checkout element `src` is set to the round's `cart.checkoutUrl`, and the
   target is set to `popup`.
5. The harness installs host-page metric hooks for `window.open()` and checkout
   protocol events such as `checkout:start`.
6. The selected arm prepares preload state:
   - `none`: no hints or preload calls.
   - `preconnect`: appends benchmark-only `preconnect` and `dns-prefetch` links.
   - `preload_execute`: calls `checkout.preload({executePreloadScript: true})`.
   - `preload_execute_speculation`: same as `preload_execute`, plus
     Speculation Rules.
7. The harness waits 1000 ms. This pause is applied to every arm, including
   `none`, so preload arms do not get extra wall-clock time after `open()`.
8. The harness calls `checkout.open()`.
9. Selenium switches into the popup, polls popup DOM/performance state, captures
   navigation/user-timing metrics, waits for `checkout:start`, closes the popup,
   and proceeds to the next sample.

Sanitized command shape:

```sh
CHECKOUT_KIT_BENCHMARK_CART_SOURCE=storefront \
CHECKOUT_KIT_BENCHMARK_STOREFRONT_DOMAIN="<test-store>" \
CHECKOUT_KIT_BENCHMARK_STOREFRONT_ACCESS_TOKEN="<token>" \
CHECKOUT_KIT_BENCHMARK_VARIANT_ID="<variant-id>" \
CHECKOUT_KIT_BENCHMARK_ARMS="none preconnect preload_execute preload_execute_speculation" \
CHECKOUT_KIT_BENCHMARK_ITERATIONS=20 \
CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS=1000 \
pnpm benchmark:preload:matrix
```

Result directories:

- `platforms/web/benchmarks/preload/results/matrix-20260610T225957Z`
- `platforms/web/benchmarks/preload/results/matrix-20260611T064414Z`

## Benchmark Environment

Tooling and runtime observed in the run output:

| Factor | Value |
| --- | --- |
| Browser | Chrome 149.0.7827.103 |
| Browser engine coverage | Chromium only |
| Sitespeed | 41.2.1 |
| Browsertime | 27.4.1 |
| Coach | 9.2.1 |
| Node.js | v22.14.0 |
| OS | Darwin 25.3.0 |
| Package manager | pnpm 10.33.1 |
| Checkout Kit benchmark command | `pnpm benchmark:preload:matrix` |
| Sample app | Local Vite app on `127.0.0.1:5173` |

Important environment factors:

- These were local-machine runs, not lab hardware or CI isolation.
- Network was live rather than throttled or replayed.
- Browser cache/cookies were cleared before each sample, but the operating
  system, DNS, TLS, process, and network stack may still have cross-sample
  effects.
- The sample page itself is local and lightweight; the measured work is mostly
  the popup checkout navigation and checkout-web boot path.
- The current prototype measures popup behavior only. It does not validate
  iframe preloading or native-style retained browsing contexts.

## Variants

| Arm | Behavior |
| --- | --- |
| `none` | Does not call `preload()`. Waits 1000 ms, then opens checkout. |
| `preconnect` | Benchmark-only arm. Adds `preconnect` and `dns-prefetch` for checkout plus known CDN origins. |
| `preload_execute` | Combined arm. Calls `checkout.preload({executePreloadScript: true})`, which first adds the same connection hints as `preload()`, then injects checkout-web's `/checkouts/internal/preloads.js` endpoint. |
| `preload_execute_speculation` | Combined arm. Same as `preload_execute`, plus `checkout.preload({speculationRules: true})`. |

## Metrics

The report focuses on open-relative popup metrics:

- `checkout visible`: checkout-web `checkout:visible` performance mark. This is
  when the critical checkout UI is visible, not when the initial loading
  skeleton first appears.
- `FCP`: popup first contentful paint.
- `checkout:start`: host-side `checkout:start` event.
- `hydrated`: checkout-web `checkout:hydrated` performance mark.
- `DCL`: popup `DOMContentLoaded`.
- `shell first visible`: DOM probe for the loading shell first becoming visible.
- `response end`: popup navigation response end.

Negative deltas mean faster than `none`.

## Aggregate Median Deltas

These compare each arm's median against the `none` median in the same run. Each
cell shows `ms delta (percentage delta)`.

### Run 1

| Arm | checkout visible | FCP | checkout:start | hydrated | DCL |
| --- | ---: | ---: | ---: | ---: | ---: |
| `preconnect` | -170 ms (-11.0%) | -149 ms (-9.5%) | -159 ms (-9.2%) | -161 ms (-10.0%) | -144 ms (-9.3%) |
| `preload_execute` | -145 ms (-9.4%) | -135 ms (-8.6%) | -115 ms (-6.6%) | -111 ms (-6.9%) | -129 ms (-8.3%) |
| `preload_execute_speculation` | -31 ms (-2.0%) | -3 ms (-0.2%) | -25 ms (-1.4%) | -27 ms (-1.6%) | +4 ms (+0.2%) |

Run 1 showed a clear win for both `preconnect` and `preload_execute`.
Speculation Rules were weak in this run.

### Run 2

| Arm | checkout visible | FCP | checkout:start | hydrated | DCL |
| --- | ---: | ---: | ---: | ---: | ---: |
| `preconnect` | -49 ms (-3.5%) | -40 ms (-2.8%) | +70 ms (+4.3%) | +63 ms (+4.2%) | -40 ms (-2.8%) |
| `preload_execute` | -7 ms (-0.5%) | +2 ms (+0.1%) | +42 ms (+2.6%) | +49 ms (+3.3%) | +7 ms (+0.5%) |
| `preload_execute_speculation` | -45 ms (-3.2%) | -56 ms (-3.9%) | +10 ms (+0.6%) | +1 ms (+0.1%) | -46 ms (-3.3%) |

Run 2 still improved earlier render/network milestones, but checkout app
milestones were mixed. This is why paired analysis is more useful than only
comparing aggregate medians: each round has a fresh checkout URL and slightly
different backend/network conditions.

### Combined Pooled Medians

This pools both runs into 40 samples per arm.

| Arm | checkout visible | FCP | checkout:start | hydrated | DCL |
| --- | ---: | ---: | ---: | ---: | ---: |
| `preconnect` | -97 ms (-6.6%) | -98 ms (-6.5%) | -84 ms (-5.0%) | -65 ms (-4.2%) | -97 ms (-6.5%) |
| `preload_execute` | -76 ms (-5.2%) | -70 ms (-4.7%) | -52 ms (-3.1%) | -25 ms (-1.6%) | -68 ms (-4.6%) |
| `preload_execute_speculation` | -82 ms (-5.6%) | -73 ms (-4.9%) | -54 ms (-3.2%) | -41 ms (-2.6%) | -77 ms (-5.2%) |

## Combined Paired Deltas

This compares each arm to `none` within the same round, then reports the median
millisecond delta, median percentage delta, and how often the arm was faster.
This is the most useful view from the current harness.

| Arm | checkout visible | FCP | checkout:start | hydrated | DCL |
| --- | ---: | ---: | ---: | ---: | ---: |
| `preconnect` | -87 ms (-6.0%), 27/40 faster | -98 ms (-6.3%), 26/40 faster | -69 ms (-4.1%), 24/40 faster | -74 ms (-4.5%), 23/39 faster | -91 ms (-6.2%), 27/40 faster |
| `preload_execute` | -65 ms (-4.7%), 24/40 faster | -59 ms (-4.1%), 25/40 faster | -68 ms (-4.2%), 26/40 faster | -70 ms (-4.8%), 25/38 faster | -58 ms (-4.2%), 25/40 faster |
| `preload_execute_speculation` | -56 ms (-4.0%), 23/40 faster | -32 ms (-2.3%), 23/40 faster | -74 ms (-4.7%), 24/40 faster | -67 ms (-4.9%), 23/39 faster | -58 ms (-3.6%), 22/40 faster |

Notably, `shell first visible` barely moved in pooled aggregate medians
(`preconnect`: -15 ms, `preload_execute`: -8 ms,
`preload_execute_speculation`: -8 ms). The measured wins mostly happen after
the loading shell has appeared: response end, DCL/FCP, `checkout:visible`, and
hydration.

## Speculation Rules Incremental Result

Comparing `preload_execute_speculation` directly against `preload_execute`
across both runs:

| Metric | Median delta | Faster count |
| --- | ---: | ---: |
| checkout visible | -2 ms (-0.1%) | 20/40 |
| FCP | -13 ms (-0.8%) | 22/40 |
| checkout:start | +8 ms (+0.5%) | 19/40 |
| hydrated | +9 ms (+0.5%) | 19/39 |
| DCL | -3 ms (-0.2%) | 20/40 |

This does not justify making Speculation Rules part of the default preload path.
Keep the toggle for benchmarking or controlled experiments.

## Interpretation

`preconnect` performing well is plausible: popup checkout still needs to make
network requests after `open()`, and warming DNS/TLS/connection state plus CDN
origins can reduce the critical path without executing remote JavaScript on the
merchant page.

`preload_execute` may help by running checkout-web's preload endpoint early,
which can inject the asset hints checkout-web knows about. The result is not
cleanly better than `preconnect`, though, so the endpoint execution cost and
trust boundary need more review before this becomes the default behavior.
Because `preload_execute` includes connection warming before executing the
endpoint, the current matrix cannot prove how much of its gain came from
endpoint execution versus the connection hints.

Speculation Rules are not clearly useful in this popup flow. That also matches
the product model: popup checkout is opened with `window.open()`, while
Speculation Rules are document-navigation oriented and do not give us a retained
popup browsing context.

The loading shell first appears at roughly the same time across arms. Preload is
not making the first skeleton paint much earlier in this benchmark; it is mostly
moving later checkout milestones earlier.

## Caveats

- Local-machine and live-network runs are noisy. The second run was materially
  noisier than the first.
- Chromium only. This does not validate Safari or Firefox behavior.
- Popup/new-tab only. Iframe preloading remains deferred.
- One-second lead time only. Longer lead times may change results.
- Storefront `cartCreate` creates a fresh checkout URL per round, but checkout
  backend and network variability still affect samples.
- Arm order is randomized within each round, not simultaneous.
- Some hydration samples were missing the relevant mark, so paired hydration
  counts are 38-39 rather than 40.
- Run 1 had a diagnostic `prefetchCount` instrumentation issue where
  `dns-prefetch` was counted as `prefetch`. Timing behavior was not affected;
  Run 2 has the corrected count.
- Attribution caveat: the combined `preload_execute` arms include connection
  warming, so they do not isolate checkout-web preload endpoint execution from
  `preconnect`/`dns-prefetch`.
- `executePreloadScript` runs checkout-web generated JavaScript on the host
  page. That needs explicit security and product review before exposing it as a
  default public behavior.

## Preload Mode Framing

Instead of treating the benchmark as choosing one winner, it is more useful to
think of popup checkout preloading as layered capabilities. Each capability has
different risk, browser support, and likely value.

| Capability | What it does | Evidence from this benchmark | Exposure recommendation |
| --- | --- | --- | --- |
| Connection warming | Adds `preconnect`/`dns-prefetch` for checkout and known Shopify CDN origins. | Consistently useful, with the best combined paired result among the tested arms. | Good default for `preload()`. |
| Checkout-web preload endpoint, prefetched | Fetches `/checkouts/internal/preloads.js` as a low-priority script resource without executing it. | Not included in the final 4-arm matrix, but earlier investigation suggested little benefit when the response is fetched but not executed. | Do not expose as a named mode unless a later benchmark shows value. |
| Checkout-web preload endpoint, executed | Executes checkout-web's generated preload script so it can inject asset hints it computes server-side. | Directionally useful, especially in Run 1 and combined paired data, but not clearly better than connection warming. | Possible opt-in/experiment mode after security and product review. |
| Speculation Rules document prefetch | Adds a Chromium-oriented document prefetch hint for the checkout URL. | No clear incremental gain over executing the preload endpoint. | Keep as benchmark/experiment-only; do not expose as a normal public mode yet. |
| Hidden popup / retained popup context | Opens or prepares a popup before user activation and later reuses it. | Not benchmarked because the web platform model does not fit. | Do not expose; not a viable general popup preload contract. |
| Hidden iframe / retained iframe context | Creates a hidden iframe and later reveals or moves the same browsing context. | Out of scope for this popup benchmark. | Defer until iframe presentation is a supported web product direction. |

Possible API model:

```ts
checkout.preload();
checkout.preload({mode: "connections"});
checkout.preload({mode: "assets"});
checkout.preload({mode: "full"});
```

Possible semantics:

- `connections`: only connection warming. Low risk and a good default.
- `assets`: connection warming plus checkout-web preload endpoint execution, if
  approved. The name should avoid promising a loaded checkout document.
- `full`: reserved for future iframe/native-like behavior, where a retained
  browsing context may actually exist. For popup/new-tab targets, `full` should
  either degrade to `assets`/`connections` or be unsupported; it should not imply
  hidden popup reuse.

The API should stay best-effort: repeated calls should dedupe by URL/origin,
failures should be silent or debug-only, and `open()` must behave normally
whether preload completed, partially completed, or did nothing.

The final benchmark matrix did include combined arms:

- `preload_execute` = connection warming plus executed checkout-web preload
  endpoint.
- `preload_execute_speculation` = connection warming plus executed checkout-web
  preload endpoint plus Speculation Rules.

Recommended follow-up isolation matrix:

| Arm | Purpose |
| --- | --- |
| `none` | Baseline with the same lead-time wait. |
| `preconnect` | Isolate SDK-side connection warming. |
| `endpoint_execute_direct` | Inject only `/checkouts/internal/preloads.js` without the SDK adding its own connection hints first. This still allows hints emitted by the endpoint itself. |
| `endpoint_execute_assets_only` | Benchmark-only diagnostic: execute the endpoint while suppressing `preconnect`/`dns-prefetch` links it appends, so asset prefetch value can be estimated separately. |
| `preload_execute` | Current combined behavior: SDK connection warming plus endpoint execution. |

That follow-up would answer two different questions:

- Whether executing the checkout-web endpoint adds anything beyond the SDK's
  fixed connection hints.
- Whether the endpoint's value, if any, comes from additional asset/resource
  hints rather than from more connection warming.

## Recommendation

Proceed with a popup/new-tab `preload()` prototype as layered best-effort
warming, not as a native-style retained browsing context.

Recommended initial shape:

- Default `preload()` should perform connection warming only.
- Keep an internal or experiment-only option for executing the checkout-web
  preload endpoint, because it may add value but carries a host-page script
  execution review burden.
- Keep Speculation Rules as a benchmark/control toggle, not a public default.
- Do not expose hidden popup reuse or any mode that implies a popup checkout
  document has been loaded and will later be attached.

For popup/new-tab targets, the honest contract is: preload can warm browser and
network state; it cannot guarantee that `open()` reuses a loaded checkout
browsing context.
