#!/usr/bin/env bash
set -euo pipefail

WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WEB_DIR"

if [[ -z "${CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL:-}" ]]; then
  echo "CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL is required." >&2
  echo "Set it to a checkout URL before running this script." >&2
  exit 1
fi

if [[ "${CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL}" != *"ec_auth"* && -z "${CHECKOUT_KIT_BENCHMARK_EC_AUTH:-}" ]]; then
  echo "No ec_auth value found in CHECKOUT_KIT_BENCHMARK_CHECKOUT_URL." >&2
  echo "Set CHECKOUT_KIT_BENCHMARK_EC_AUTH if you are using a URL template." >&2
  exit 1
fi

ITERATIONS="${CHECKOUT_KIT_BENCHMARK_ITERATIONS:-10}"
RUN_MODE="${CHECKOUT_KIT_BENCHMARK_RUN_MODE:-interleaved}"
LEAD_TIME_MS="${CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS:-2000}"
EQUALIZE_LEAD_TIME="${CHECKOUT_KIT_BENCHMARK_EQUALIZE_LEAD_TIME:-true}"
WAIT_FOR_START="${CHECKOUT_KIT_BENCHMARK_WAIT_FOR_START:-true}"
COLLECT_POPUP="${CHECKOUT_KIT_BENCHMARK_COLLECT_POPUP:-true}"
POPUP_TIMEOUT_MS="${CHECKOUT_KIT_BENCHMARK_POPUP_TIMEOUT_MS:-45000}"
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
echo "Checkout URL: configured but not printed"

ARMS_STRING="${CHECKOUT_KIT_BENCHMARK_ARMS:-none preload preload_speculation}"
read -r -a ARMS <<<"$ARMS_STRING"

if [[ "$RUN_MODE" != "interleaved" && "$RUN_MODE" != "grouped" ]]; then
  echo "Unsupported CHECKOUT_KIT_BENCHMARK_RUN_MODE=${RUN_MODE}." >&2
  echo "Expected interleaved or grouped." >&2
  exit 1
fi

run_arm() {
  local arm="$1"
  local iteration="$2"
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
    CHECKOUT_KIT_BENCHMARK_SAMPLE_URL="$SAMPLE_URL" \
    CHECKOUT_KIT_BENCHMARK_ITERATIONS="$arm_iterations" \
    CHECKOUT_KIT_BENCHMARK_LEAD_TIME_MS="$LEAD_TIME_MS" \
    CHECKOUT_KIT_BENCHMARK_EQUALIZE_LEAD_TIME="$EQUALIZE_LEAD_TIME" \
    CHECKOUT_KIT_BENCHMARK_WAIT_FOR_START="$WAIT_FOR_START" \
    CHECKOUT_KIT_BENCHMARK_COLLECT_POPUP="$COLLECT_POPUP" \
    CHECKOUT_KIT_BENCHMARK_POPUP_TIMEOUT_MS="$POPUP_TIMEOUT_MS" \
    CHECKOUT_KIT_BENCHMARK_OUTPUT_FOLDER="$output_folder" \
    pnpm run benchmark:preload 2>&1 | tee "$log_path"
}

if [[ "$RUN_MODE" == "grouped" ]]; then
  for arm in "${ARMS[@]}"; do
    run_arm "$arm" ""
  done
else
  for iteration in $(seq 1 "$ITERATIONS"); do
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
      run_arm "$arm" "$iteration"
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
  "openToPopupFetchStartMs",
  "openToPopupRequestStartMs",
  "openToPopupResponseStartMs",
  "openToPopupResponseEndMs",
  "openToPopupDomContentLoadedMs",
  "openToPopupLoadEventEndMs",
  "openToPopupFirstContentfulPaintMs",
  "openToPopupCheckoutVisibleMs",
  "openToPopupCheckoutHydratedMs",
  "openToCheckoutStartMs",
  "popupCheckoutVisibleToFirstContentfulPaintMs",
  "popupCheckoutBeforeHydrateDurationMs",
  "popupCheckoutHydrateDurationMs",
  "popupCheckoutBootDurationMs",
  "popupCheckoutInertDurationMs",
  "preloadEndpointStartBeforeOpenMs",
  "preloadEndpointResponseBeforeOpenMs",
];

function percentile(values, p) {
  if (values.length === 0) return "";
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index].toFixed(2);
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
        percentile(values, 50),
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
