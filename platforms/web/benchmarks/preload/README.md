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
- `preload`: calls `checkout.preload()`, waits for the configured lead time,
  then opens checkout.
- `preload_speculation`: calls
  `checkout.preload({speculationRules: true})`, waits for the configured lead
  time, then opens checkout.

## Environment

- `CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL` is required.
- `CHECKOUT_KIT_BENCHMARK_EC_AUTH` replaces or adds the URL's `ec_auth`
  parameter without printing it.
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
- `CHECKOUT_KIT_BENCHMARK_ARMS` defaults to
  `none preload preload_speculation` for the matrix runner.
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
- `openToWindowOpenMs`
- `openToWindowOpenWallMs`
- `openToCheckoutStartMs`
- `openToCheckoutCompleteMs`
- `openToCheckoutErrorMs`
- `openToCheckoutCloseMs`
- `leadTimeMs`
- `linkCount`
- `speculationRulesCount`

## Notes

The script clears browser cache and cookies before each iteration, then leaves
cache enabled during the iteration. That keeps previous iterations from
polluting the result while still measuring whether preload hints can warm
browser state before `open()`.

`checkout:visible` is the checkout-web performance mark emitted when the loading
skeleton is removed and the critical checkout UI is visible. It is a better
checkout-specific visibility signal than `DOMContentLoaded`.

The package allows the `@sitespeed.io/chromedriver` install script through
pnpm's `onlyBuiltDependencies` setting because Sitespeed needs the local Chrome
driver binary.
