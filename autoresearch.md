# Autoresearch: Android incremental R8 app size

## Objective

Reduce the compressed APK payload added by Checkout Kit to the fixed minimal
AppCompat host in `platforms/android/benchmarks/app-size`. The operator authorized
one bounded run, including automatic experiment commits. Limit this run to five
candidate experiments after the baseline, then report results. Do not push or
open a PR without further authorization. Use the existing AE task branch.

## Metrics

- Primary: `delta_compressed_payload_bytes` (bytes, lower is better).
- Secondary: `delta_dex_bytes`, `delta_resource_bytes`, `delta_apk_bytes`.
- Baseline previously measured: 263692 compressed bytes; 592584 raw DEX bytes;
  20444 raw resource bytes; 265750 unsigned APK bytes.
- Baseline host compressed payload: 590590 bytes; this must remain unchanged.

The metric includes retained SDK dependencies and minimal consumer glue. It is
not a Play download estimate or universal SDK attribution. Compare on the same
host/toolchain. The benchmark README specifies exact counting semantics.

## How to run

`shadowenv exec -- bash autoresearch.sh`

The script runs collector tests, SDK unit tests, API compatibility, detekt,
release lint, the R8 size collector, and fixture lint. It emits `METRIC name=value`
lines only after all gates pass. Use `run_experiment`, then always record the
result using `log_experiment`. Keep strictly smaller primary measurements;
restore only changed experiment files after discard/crash. Never revert unrelated
user changes. Baseline setup is committed by the initial `log_experiment` call.

## Files in scope

- `platforms/android/lib/src/main/java/com/shopify/checkoutkit/`: small internal
  implementation changes that preserve externally observable behavior.
- `platforms/android/lib/src/test/`: focused regression coverage for changes.
- This document: record candidate hypotheses, results, and retained changes.

## Off limits

- Benchmark fixture, metric collector, baseline dependencies and workload.
- Consumer ProGuard rules, build flags, SDK/API levels, toolchain and dependencies.
- Public APIs and `lib/api/lib.api`; API check must pass unchanged.
- Published protocol dependency and generated models.
- Disabling telemetry, features, tests, checks, or supported runtime behavior.
- Broad refactors or changes to other platforms.

## Constraints

SDK consumer rules keep all `com.shopify.checkoutkit.**` members. This run honors
those rules. Removing unnecessary compiler-generated methods from private/internal
containers may therefore save bytes without altering shrinker policy. Do not
remove value equality/copy semantics where any callers rely on them. No runtime
validation of modified keep rules is available, so such experiments are excluded.

Every kept production change must pass the full script and include relevant
regression tests. Run the final retained state again to confirm repeatability.
Commit attribution must be:

```
Co-authored-by: GPT-6-astra <noreply@openai.com>
Orchestrated-by: ae <noreply@shopify.com>
```

## What's been tried

- Benchmark setup: three identical measurements before optimization. Both R8
  variants and fixture lint passed; 9 collector and 508 SDK unit tests passed.
- Candidate investigation: inspect private/internal data carriers for unnecessary
  generated copy/component/equality methods retained by the blanket keep rule.
