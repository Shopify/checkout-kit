#!/usr/bin/env bash
set -euo pipefail

WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WEB_DIR"

if [[ -z "${CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL:-}" && "${CHECKOUT_KIT_BENCHMARK_CART_SOURCE:-}" != "storefront" ]]; then
  echo "CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL is required unless CHECKOUT_KIT_BENCHMARK_CART_SOURCE=storefront." >&2
  echo "Set it to a checkout URL, or configure the Storefront cart source env vars." >&2
  exit 1
fi

ITERATIONS="${CHECKOUT_KIT_BENCHMARK_ITERATIONS:-10}"
RUN_MODE="${CHECKOUT_KIT_BENCHMARK_RUN_MODE:-interleaved}"
LEAD_TIME_MS="${CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS:-2000}"
EQUALIZE_LEAD_TIME="${CHECKOUT_KIT_BENCHMARK_EQUALIZE_LEAD_TIME:-true}"
WAIT_FOR_START="${CHECKOUT_KIT_BENCHMARK_WAIT_FOR_START:-true}"
COLLECT_POPUP="${CHECKOUT_KIT_BENCHMARK_COLLECT_POPUP:-true}"
POPUP_TIMEOUT_MS="${CHECKOUT_KIT_BENCHMARK_POPUP_TIMEOUT_MS:-45000}"
POPUP_PROBE_INTERVAL_MS="${CHECKOUT_KIT_BENCHMARK_POPUP_PROBE_INTERVAL_MS:-25}"
SAMPLE_HOST="${CHECKOUT_KIT_BENCHMARK_SAMPLE_HOST:-127.0.0.1}"
SAMPLE_PORT="${CHECKOUT_KIT_BENCHMARK_SAMPLE_PORT:-5173}"
SAMPLE_URL="${CHECKOUT_KIT_BENCHMARK_SAMPLE_URL:-http://${SAMPLE_HOST}:${SAMPLE_PORT}}"
RUN_ID="$(date -u +"%Y%m%dT%H%M%SZ")"
OUTPUT_ROOT="${CHECKOUT_KIT_BENCHMARK_MATRIX_OUTPUT_DIR:-benchmarks/preload/results/matrix-${RUN_ID}}"

mkdir -p "$OUTPUT_ROOT"

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_sample() {
  local attempt
  for attempt in $(seq 1 60); do
    if curl -fsS "$SAMPLE_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done

  echo "Timed out waiting for sample app at ${SAMPLE_URL}." >&2
  if [[ -f "${OUTPUT_ROOT}/sample-server.log" ]]; then
    echo "Sample server log: ${OUTPUT_ROOT}/sample-server.log" >&2
  fi
  return 1
}

if curl -fsS "$SAMPLE_URL" >/dev/null 2>&1; then
  echo "Using existing sample app at ${SAMPLE_URL}."
else
  echo "Starting sample app at ${SAMPLE_URL}."
  pnpm sample --host "$SAMPLE_HOST" --port "$SAMPLE_PORT" \
    >"${OUTPUT_ROOT}/sample-server.log" 2>&1 &
  SERVER_PID="$!"
  wait_for_sample
fi

echo "Results: ${OUTPUT_ROOT}"
echo "Iterations: ${ITERATIONS}"
echo "Run mode: ${RUN_MODE}"
echo "Lead time: ${LEAD_TIME_MS}ms"
echo "Equalize lead time: ${EQUALIZE_LEAD_TIME}"
if [[ "${CHECKOUT_KIT_BENCHMARK_CART_SOURCE:-}" == "storefront" ]]; then
  echo "Checkout URL source: Storefront cartCreate"
else
  echo "Checkout URL: configured but not printed"
fi

ARMS_STRING="${CHECKOUT_KIT_BENCHMARK_ARMS:-none preconnect preload preload_speculation preload_execute preload_execute_speculation}"
read -r -a ARMS <<<"$ARMS_STRING"

if [[ "$RUN_MODE" != "interleaved" && "$RUN_MODE" != "grouped" ]]; then
  echo "Unsupported CHECKOUT_KIT_BENCHMARK_RUN_MODE=${RUN_MODE}." >&2
  echo "Expected interleaved or grouped." >&2
  exit 1
fi

create_round_checkout_url() {
  if [[ "${CHECKOUT_KIT_BENCHMARK_CART_SOURCE:-}" != "storefront" ]]; then
    printf "%s" "${CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL:-}"
    return
  fi

  node <<'NODE'
const domain = required("CHECKOUT_KIT_BENCHMARK_STOREFRONT_DOMAIN");
const token = required("CHECKOUT_KIT_BENCHMARK_STOREFRONT_ACCESS_TOKEN");
const rawVariantId = required("CHECKOUT_KIT_BENCHMARK_VARIANT_ID");
const variantId = rawVariantId.startsWith("gid://")
  ? rawVariantId
  : `gid://shopify/ProductVariant/${rawVariantId}`;
const apiVersion =
  optional("CHECKOUT_KIT_BENCHMARK_STOREFRONT_API_VERSION") ??
  optional("STOREFRONT_VERSION") ??
  optional("API_VERSION") ??
  "2026-04";
const quantity = Number(process.env.CHECKOUT_KIT_BENCHMARK_VARIANT_QUANTITY ?? "1");
const maxAttempts = numberEnv("CHECKOUT_KIT_BENCHMARK_CART_CREATE_MAX_ATTEMPTS", 12);
const throttleBackoffMs = numberEnv("CHECKOUT_KIT_BENCHMARK_CART_CREATE_THROTTLE_BACKOFF_MS", 60_000);
const throttleBackoffMaxMs = numberEnv(
  "CHECKOUT_KIT_BENCHMARK_CART_CREATE_THROTTLE_BACKOFF_MAX_MS",
  300_000,
);
const endpoint = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/api/${apiVersion}/graphql.json`;
const query = `
  mutation CheckoutKitBenchmarkCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        checkoutUrl
      }
      userErrors {
        message
      }
    }
  }
`;

function optional(name) {
  const value = process.env[name]?.trim();
  return value && !isPlaceholder(value) ? value : undefined;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value || isPlaceholder(value)) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function isPlaceholder(value) {
  return (
    value.startsWith("<") ||
    value.startsWith("YOUR_") ||
    value.startsWith("your-") ||
    value.includes("placeholder")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createCart() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          lines: [
            {
              merchandiseId: variantId,
              quantity: Number.isFinite(quantity) ? quantity : 1,
            },
          ],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Storefront cartCreate failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  const graphQlError = payload.errors?.[0]?.message;
  const userError = payload.data?.cartCreate?.userErrors?.[0]?.message;

  if (graphQlError || userError) {
    throw new Error(graphQlError ?? userError);
  }

  const checkoutUrl = payload.data?.cartCreate?.cart?.checkoutUrl;
  if (typeof checkoutUrl !== "string" || checkoutUrl.length === 0) {
    throw new Error("Storefront cartCreate did not return cart.checkoutUrl");
  }

  return checkoutUrl;
}

(async () => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      process.stdout.write(await createCart());
      process.exit(0);
    } catch (error) {
      if (!String(error.message).includes("Throttled") || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = Math.min(throttleBackoffMs * attempt, throttleBackoffMaxMs);
      console.error(`Storefront cartCreate throttled; retrying in ${delayMs / 1000}s`);
      await sleep(delayMs);
    }
  }
})();
NODE
}

run_arm() {
  local arm="$1"
  local iteration="$2"
  local checkout_url="${3:-}"
  ARM_DIR="${OUTPUT_ROOT}/${arm}"
  mkdir -p "$ARM_DIR"

  local iteration_label=""
  local arm_iterations="$ITERATIONS"
  local output_folder="${ARM_DIR}/sitespeed"
  local log_path="${ARM_DIR}/sitespeed.log"

  if [[ -n "$iteration" ]]; then
    iteration_label=" iteration ${iteration}"
    arm_iterations="1"
    output_folder="${ARM_DIR}/iteration-${iteration}/sitespeed"
    log_path="${ARM_DIR}/iteration-${iteration}/sitespeed.log"
    mkdir -p "${ARM_DIR}/iteration-${iteration}"
  fi

  echo
  echo "Running arm: ${arm}${iteration_label}"

  CHECKOUT_KIT_BENCHMARK_ARM="$arm" \
    CHECKOUT_KIT_BENCHMARK_CART_SOURCE="$([[ -n "$checkout_url" ]] && printf "" || printf "%s" "${CHECKOUT_KIT_BENCHMARK_CART_SOURCE:-}")" \
    CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL="${checkout_url:-${CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL:-}}" \
    CHECKOUT_KIT_BENCHMARK_STOREFRONT_DOMAIN="${CHECKOUT_KIT_BENCHMARK_STOREFRONT_DOMAIN:-}" \
    CHECKOUT_KIT_BENCHMARK_STOREFRONT_ACCESS_TOKEN="${CHECKOUT_KIT_BENCHMARK_STOREFRONT_ACCESS_TOKEN:-}" \
    CHECKOUT_KIT_BENCHMARK_STOREFRONT_API_VERSION="${CHECKOUT_KIT_BENCHMARK_STOREFRONT_API_VERSION:-}" \
    CHECKOUT_KIT_BENCHMARK_VARIANT_ID="${CHECKOUT_KIT_BENCHMARK_VARIANT_ID:-}" \
    CHECKOUT_KIT_BENCHMARK_VARIANT_QUANTITY="${CHECKOUT_KIT_BENCHMARK_VARIANT_QUANTITY:-}" \
    CHECKOUT_KIT_BENCHMARK_SAMPLE_URL="$SAMPLE_URL" \
    CHECKOUT_KIT_BENCHMARK_ITERATIONS="$arm_iterations" \
    CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS="$LEAD_TIME_MS" \
    CHECKOUT_KIT_BENCHMARK_EQUALIZE_LEAD_TIME="$EQUALIZE_LEAD_TIME" \
    CHECKOUT_KIT_BENCHMARK_WAIT_FOR_START="$WAIT_FOR_START" \
    CHECKOUT_KIT_BENCHMARK_COLLECT_POPUP="$COLLECT_POPUP" \
    CHECKOUT_KIT_BENCHMARK_POPUP_TIMEOUT_MS="$POPUP_TIMEOUT_MS" \
    CHECKOUT_KIT_BENCHMARK_POPUP_PROBE_INTERVAL_MS="$POPUP_PROBE_INTERVAL_MS" \
    CHECKOUT_KIT_BENCHMARK_OUTPUT_FOLDER="$output_folder" \
    pnpm run benchmark:preload 2>&1 | tee "$log_path"
}

if [[ "$RUN_MODE" == "grouped" ]]; then
  for arm in "${ARMS[@]}"; do
    run_arm "$arm" ""
  done
else
  for iteration in $(seq 1 "$ITERATIONS"); do
    ROUND_CHECKOUT_URL="$(create_round_checkout_url)"
    ROUND_ARMS=($(
      node -e '
        const arms = process.argv.slice(1);
        for (let index = arms.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [arms[index], arms[swapIndex]] = [arms[swapIndex], arms[index]];
        }
        console.log(arms.join("\n"));
      ' "${ARMS[@]}"
    ))
    echo
    echo "Round ${iteration} order: ${ROUND_ARMS[*]}"
    for arm in "${ROUND_ARMS[@]}"; do
      run_arm "$arm" "$iteration" "$ROUND_CHECKOUT_URL"
    done
  done
fi

for arm in "${ARMS[@]}"; do
  ARM_DIR="${OUTPUT_ROOT}/${arm}"
  find "$ARM_DIR" -name sitespeed.log -print0 \
    | sort -z \
    | xargs -0 grep -h '^checkout-kit-preload-benchmark ' \
    | sed 's/^checkout-kit-preload-benchmark //' >"${ARM_DIR}/metrics.jsonl"
done

find "$OUTPUT_ROOT" -mindepth 2 -maxdepth 2 -name metrics.jsonl -print0 \
  | xargs -0 cat >"${OUTPUT_ROOT}/metrics.jsonl"

node - "$OUTPUT_ROOT/metrics.jsonl" "$OUTPUT_ROOT/summary.csv" <<'NODE'
const fs = require("node:fs");

const [inputPath, outputPath] = process.argv.slice(2);
const lines = fs.readFileSync(inputPath, "utf8").trim().split("\n").filter(Boolean);
const runs = lines.map((line) => JSON.parse(line));

const metrics = [
  "popupRedirectCount",
  "popupRedirectDurationMs",
  "popupDomainLookupDurationMs",
  "popupConnectDurationMs",
  "popupRequestToResponseStartMs",
  "popupResponseDurationMs",
  "popupProbeCount",
  "popupProbeTimedOut",
  "popupLoadingShellDetected",
  "popupLoadingShellVisibleDetected",
  "popupBodyLoadingDetected",
  "openToPopupFetchStartMs",
  "openToPopupRequestStartMs",
  "openToPopupResponseStartMs",
  "openToPopupResponseEndMs",
  "openToPopupDomContentLoadedMs",
  "openToPopupLoadEventEndMs",
  "openToPopupFirstContentfulPaintMs",
  "openToPopupCheckoutVisibleMs",
  "openToPopupCheckoutHydratedMs",
  "openToPopupLoadingShellFirstSeenMs",
  "openToPopupLoadingShellFirstVisibleMs",
  "openToPopupLoadingShellFirstHiddenMs",
  "openToPopupLoadingShellRemovedMs",
  "openToPopupBodyLoadingFirstSeenMs",
  "openToPopupBodyLoadingRemovedMs",
  "openToCheckoutStartMs",
  "popupCheckoutVisibleToFirstContentfulPaintMs",
  "popupLoadingShellApproxVisibleDurationMs",
  "popupCheckoutBeforeHydrateDurationMs",
  "popupCheckoutHydrateDurationMs",
  "popupCheckoutBootDurationMs",
  "popupCheckoutInertDurationMs",
  "preloadEndpointStartBeforeOpenMs",
  "preloadEndpointResponseBeforeOpenMs",
  "linkCount",
  "preconnectCount",
  "dnsPrefetchCount",
  "prefetchCount",
  "allLinkCount",
  "allPreconnectCount",
  "allDnsPrefetchCount",
  "allPrefetchCount",
  "preloadScriptCount",
  "endpointSuppressedLinkCount",
  "endpointSuppressedPreconnectCount",
  "endpointSuppressedDnsPrefetchCount",
  "endpointLinkSuppressorActive",
];

function percentile(values, p) {
  if (values.length === 0) return "";
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index].toFixed(2);
}

function median(values) {
  if (values.length === 0) return "";
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle].toFixed(2);
  }

  return ((sorted[middle - 1] + sorted[middle]) / 2).toFixed(2);
}

function numeric(value) {
  return typeof value === "number" && Number.isFinite(value);
}

const arms = [...new Set(runs.map((run) => run.arm))];
const rows = ["arm,metric,count,median_ms,p75_ms,min_ms,max_ms"];

for (const arm of arms) {
  const armRuns = runs.filter((run) => run.arm === arm);
  for (const metric of metrics) {
    const values = armRuns.map((run) => run[metric]).filter(numeric);
    if (values.length === 0) continue;
    rows.push(
      [
        arm,
        metric,
        values.length,
        median(values),
        percentile(values, 75),
        Math.min(...values).toFixed(2),
        Math.max(...values).toFixed(2),
      ].join(","),
    );
  }
}

fs.writeFileSync(outputPath, `${rows.join("\n")}\n`);
NODE

echo
echo "Wrote:"
echo "  ${OUTPUT_ROOT}/metrics.jsonl"
echo "  ${OUTPUT_ROOT}/summary.csv"
