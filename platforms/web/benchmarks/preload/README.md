# Checkout Preload Benchmark

Prototype benchmark harness for measuring popup/new-tab preload behavior with
Sitespeed/Browsertime.

## Setup

Run the sample app in one shell:

```sh
pnpm sample --host 127.0.0.1
```

Run one benchmark arm in another shell:

```sh
CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL="https://your-store.myshopify.com/checkouts/..." \
CHECKOUT_KIT_BENCHMARK_SAMPLE_URL="http://127.0.0.1:5173" \
CHECKOUT_KIT_BENCHMARK_ARM=preload \
CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS=2000 \
pnpm benchmark:preload
```

Or run the comparison matrix:

```sh
CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL="https://your-store.myshopify.com/checkouts/..." \
CHECKOUT_KIT_BENCHMARK_ITERATIONS=10 \
CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS=2000 \
pnpm benchmark:preload:matrix
```

To create a fresh cart URL for every benchmark iteration instead of reusing a
fixed checkout URL:

```sh
CHECKOUT_KIT_BENCHMARK_CART_SOURCE=storefront \
CHECKOUT_KIT_BENCHMARK_STOREFRONT_DOMAIN="your-store.myshopify.com" \
CHECKOUT_KIT_BENCHMARK_STOREFRONT_ACCESS_TOKEN="..." \
CHECKOUT_KIT_BENCHMARK_VARIANT_ID="gid://shopify/ProductVariant/123" \
CHECKOUT_KIT_BENCHMARK_ITERATIONS=10 \
pnpm benchmark:preload:matrix
```

`CHECKOUT_KIT_BENCHMARK_VARIANT_ID` can also be a raw numeric ProductVariant
ID; the harness converts it to a Storefront GID.

For iframe-copied URLs, the harness normalizes common copy artifacts:

- `&amp;` becomes `&`.
- Backslash-escaped shell characters are unescaped.
- A missing leading `h` in `ttps://` is repaired.

You can also keep `ec_auth` separate:

```sh
CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL="https://your-store.myshopify.com/cart/123:1?ec_auth=placeholder&ec_delegate=window.open" \
CHECKOUT_KIT_BENCHMARK_EC_AUTH="new-token-value" \
pnpm benchmark:preload:matrix
```

Do not paste real storefront tokens or sensitive generated config into logs.

## Arms

- `none`: opens checkout without calling `preload()`.
- `preconnect`: adds only `preconnect`/`dns-prefetch` hints for the checkout
  and CDN origins, waits for the configured lead time, then opens checkout.
- `preload`: calls `checkout.preload()`, waits for the configured lead time,
  then opens checkout.
- `preload_speculation`: calls
  `checkout.preload({speculationRules: true})`, waits for the configured lead
  time, then opens checkout.
- `preload_execute`: calls
  `checkout.preload({executePreloadScript: true})`, waits for the configured
  lead time, then opens checkout.
- `preload_execute_speculation`: calls
  `checkout.preload({executePreloadScript: true, speculationRules: true})`,
  waits for the configured lead time, then opens checkout.
- `endpoint_execute_direct`: benchmark-only isolation arm. Injects
  `/checkouts/internal/preloads.js` directly without calling
  `checkout.preload()`, waits for the configured lead time, then opens checkout.
  This strips out SDK-added connection hints, but the endpoint script can still
  append its own hints.
- `endpoint_execute_assets_only`: benchmark-only diagnostic arm. Injects
  `/checkouts/internal/preloads.js` directly while suppressing `preconnect` and
  `dns-prefetch` links appended by the endpoint script, waits for the configured
  lead time, then opens checkout. This is intentionally artificial and exists to
  estimate whether endpoint asset hints help separately from endpoint connection
  hints. The suppression stays active for the sample so late endpoint script
  execution cannot add connection hints during popup loading.

## Environment

- `CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL` is required.
- `CHECKOUT_KIT_BENCHMARK_EC_AUTH` replaces or adds the URL's `ec_auth`
  parameter without printing it.
- `CHECKOUT_KIT_BENCHMARK_CART_SOURCE=storefront` creates a fresh cart through
  Storefront API for each benchmark iteration and uses the returned
  `cart.checkoutUrl`; in this mode `CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL` is not
  required.
  In matrix `interleaved` mode, one fresh cart is created per round and reused
  across the shuffled arms in that round to reduce Storefront API throttling.
- `CHECKOUT_KIT_BENCHMARK_STOREFRONT_DOMAIN`,
  `CHECKOUT_KIT_BENCHMARK_STOREFRONT_ACCESS_TOKEN`, and
  `CHECKOUT_KIT_BENCHMARK_VARIANT_ID` are required when
  `CHECKOUT_KIT_BENCHMARK_CART_SOURCE=storefront`.
- `CHECKOUT_KIT_BENCHMARK_CART_CREATE_MAX_ATTEMPTS`,
  `CHECKOUT_KIT_BENCHMARK_CART_CREATE_THROTTLE_BACKOFF_MS`, and
  `CHECKOUT_KIT_BENCHMARK_CART_CREATE_THROTTLE_BACKOFF_MAX_MS` tune Storefront
  cartCreate retry behavior for throttled benchmark runs.
- `CHECKOUT_KIT_BENCHMARK_STOREFRONT_API_VERSION` defaults to
  `STOREFRONT_VERSION`, then `API_VERSION`, then `2026-04`.
- `CHECKOUT_KIT_BENCHMARK_VARIANT_QUANTITY` defaults to `1`.
- `CHECKOUT_KIT_BENCHMARK_SAMPLE_URL` defaults to `http://localhost:5173`.
- `CHECKOUT_KIT_BENCHMARK_ARM` defaults to `none`.
- `CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS` defaults to `2000`.
- `CHECKOUT_KIT_BENCHMARK_EQUALIZE_LEAD_TIME` defaults to `true`, so the
  `none` arm waits for the same lead time before `open()`.
- `CHECKOUT_KIT_BENCHMARK_ITERATIONS` defaults to `5`.
- `CHECKOUT_KIT_BENCHMARK_RUN_MODE` defaults to `interleaved`; set `grouped`
  to run all iterations for each arm together.
- `CHECKOUT_KIT_BENCHMARK_WAIT_FOR_START` defaults to `true`.
- `CHECKOUT_KIT_BENCHMARK_COLLECT_POPUP` defaults to `true`.
- `CHECKOUT_KIT_BENCHMARK_POPUP_TIMEOUT_MS` defaults to `45000`.
- `CHECKOUT_KIT_BENCHMARK_POPUP_PROBE_INTERVAL_MS` defaults to `25`.
- `CHECKOUT_KIT_BENCHMARK_ARMS` defaults to
  `none preconnect preload preload_speculation preload_execute preload_execute_speculation`
  for the matrix runner.
  For endpoint attribution, use:
  `none preconnect endpoint_execute_direct endpoint_execute_assets_only preload_execute`.
- `CHECKOUT_KIT_BENCHMARK_MATRIX_OUTPUT_DIR` can override the matrix output
  directory.

## Matrix output

The matrix runner writes a timestamped directory under
`benchmarks/preload/results/` with:

- `metrics.jsonl`: combined custom metrics, one JSON object per iteration.
- `summary.csv`: median, p75, min, and max for the key metrics by arm.
- `<arm>/sitespeed.log`: raw Sitespeed output for each arm.
- `<arm>/sitespeed/`: the Sitespeed HTML report for each arm.

## Metrics

The script logs one JSON line per iteration prefixed with
`checkout-kit-preload-benchmark`.

Numeric metrics are also sent to Sitespeed when supported by the installed
version:

- `popupDomContentLoadedMs`
- `popupLoadEventEndMs`
- `popupRedirectCount`
- `popupRedirectDurationMs`
- `popupRequestToResponseStartMs`
- `popupResponseStartMs`
- `popupResponseEndMs`
- `popupResponseDurationMs`
- `popupProbeCount`
- `popupProbeTimedOut`
- `popupLoadingShellDetected`
- `popupLoadingShellVisibleDetected`
- `popupBodyLoadingDetected`
- `popupFirstContentfulPaintMs`
- `popupCheckoutVisibleMs`
- `popupCheckoutHydratedMs`
- `popupCheckoutVisibleToFirstContentfulPaintMs`
- `popupCheckoutBeforeHydrateDurationMs`
- `popupCheckoutHydrateDurationMs`
- `popupCheckoutBootDurationMs`
- `popupCheckoutInertDurationMs`
- `openToPopupFetchStartMs`
- `openToPopupRequestStartMs`
- `openToPopupDomContentLoadedMs`
- `openToPopupLoadEventEndMs`
- `openToPopupResponseStartMs`
- `openToPopupResponseEndMs`
- `openToPopupFirstContentfulPaintMs`
- `openToPopupCheckoutVisibleMs`
- `openToPopupCheckoutHydratedMs`
- `openToPopupLoadingShellFirstSeenMs`
- `openToPopupLoadingShellFirstVisibleMs`
- `openToPopupLoadingShellFirstHiddenMs`
- `openToPopupLoadingShellRemovedMs`
- `openToPopupBodyLoadingFirstSeenMs`
- `openToPopupBodyLoadingRemovedMs`
- `openToWindowOpenMs`
- `openToWindowOpenWallMs`
- `openToCheckoutStartMs`
- `openToCheckoutCompleteMs`
- `openToCheckoutErrorMs`
- `openToCheckoutCloseMs`
- `popupLoadingShellApproxVisibleDurationMs`
- `leadTimeMs`
- `linkCount`
- `preconnectCount`
- `dnsPrefetchCount`
- `prefetchCount`
- `allLinkCount`
- `allPreconnectCount`
- `allDnsPrefetchCount`
- `allPrefetchCount`
- `preloadScriptCount`
- `endpointSuppressedLinkCount`
- `endpointSuppressedPreconnectCount`
- `endpointSuppressedDnsPrefetchCount`
- `endpointLinkSuppressorActive`
- `speculationRulesCount`

## Notes

The script clears browser cache and cookies before each iteration, then leaves
cache enabled during the iteration. That keeps previous iterations from
polluting the result while still measuring whether preload hints can warm
browser state before `open()`.

`checkout:visible` is the checkout-web performance mark emitted when the loading
skeleton is removed and the critical checkout UI is visible. It is a better
checkout-specific visibility signal than `DOMContentLoaded`.

The loading-shell DOM probe polls the popup while it loads and records
approximate first-seen, first-visible, hidden, and removed timings for
`.LoadingShell`. It is intentionally approximate because it observes DOM/style
state from Selenium rather than using an in-page paint marker.

The package allows the `@sitespeed.io/chromedriver` install script through
pnpm's `onlyBuiltDependencies` setting because Sitespeed needs the local Chrome
driver binary.
