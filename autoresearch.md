# Autoresearch: Reduce the web JavaScript bundle

## Objective

Minimize the production JavaScript shipped by `platforms/web` while preserving its public API, declarations, checkout behavior, accessibility, protocol compatibility, telemetry events, and telemetry delivery behavior. The target is at most 32 KiB of minified JavaScript, with 27.6 KiB as a stretch goal.

## Metrics

- **Primary**: `js_bytes` (bytes, lower is better), the sum of all runtime `.js` files emitted under `platforms/web/dist` by the standard production build. The current build emits only `dist/index.js`, so this is also its exact byte size.
- **Secondary**: `gzip_bytes`, the sum of each emitted runtime JavaScript file compressed independently with gzip level 9 and `mtime=0`.
- **Correctness**: every experiment must complete the standard production build. Retained production changes also require focused tests plus the web lint, test, build, package verification, and sample build checks.

## How to Run

Run `shadowenv exec --dir <repo-root> -- ./autoresearch.sh`. It emits `METRIC js_bytes=<number>` and `METRIC gzip_bytes=<number>`.

## Files in Scope

- `platforms/web/src/**/*.ts` and `platforms/web/src/**/*.css`: web component runtime and focused regression tests.
- `platforms/web/vite.config.ts`: production bundling and tree-shaking configuration.
- `telemetry/languages/typescript/src/**/*.ts`: shared telemetry client and OTLP serialization used by web and React Native.
- `telemetry/languages/typescript/test/**/*.ts`: telemetry regression coverage.
- `protocol/languages/typescript/src/**/*.ts`: shared protocol runtime, including generated artifacts when changed through their generator.
- Protocol generators and their tests when generated runtime changes are required.

## Off Limits

- Public API or declaration removals.
- Removing, disabling, sampling, or deferring telemetry or checkout functionality solely to reduce size.
- Externalizing runtime dependencies, adding a CDN, or adding runtime dependencies.
- Toolchain, lockfile, compression-method, source-map-only, documentation-only, declaration-only, or package-metadata-only size changes.
- Manual edits to generated files.

## Constraints

- Keep the package self-contained and count every shipped runtime JavaScript chunk.
- Preserve React Native behavior for shared telemetry or protocol changes.
- Keep production build and measurement methodology unchanged between experiments.
- Add or update focused regression coverage for retained production changes; do not weaken tests.
- Run every command through the repository's required `shadowenv exec` environment.
- Stop at 50 experiments or the worker's $50 spend limit.

## What's Been Tried

- Fresh `main` baseline: 42,204 JavaScript bytes and 11,490 deterministic gzip bytes.
- Retained: derive embedded method values from existing catalogs; 41,895 bytes.
- Retained: generate only wire names in the protocol rename map and derive camelCase names at runtime; 39,058 bytes.
- Retained: replace generated protocol model-name references with numeric model IDs; 37,029 bytes.
- Retained: enable Oxc code generation in Vite's ES-library minifier output; 29,397 bytes.
- Retained: dictionary-encode wire field names and numeric-tag rename traversal nodes; 28,402 bytes.
- Retained: encode the generated rename spine as a compact printable string, decode symbols arithmetically, and reconstruct it once at startup; 27,545 bytes.
- Retained: simplify telemetry export handling, async flush branches, and shared counter attributes; 27,432 bytes.
- Retained: represent protocol traversal direction as a boolean; 27,387 bytes and 9,786 gzip bytes.
- Discarded: individually exported protocol descriptors, alternate minifiers, delimiter-joined field dictionaries, attribute-helper inlining, and nested rename-entry scans. These were neutral, regressed size, added disproportionate complexity, or risked runtime performance.
- Rebased onto main while retaining its newer protocol validation and undefined normalization; 27,839 JavaScript bytes and 9,963 gzip bytes.
- Operator-approved review fixes: build reusable decode/encode lookup tables once per model, support escaped base-91 integers through `Number.MAX_SAFE_INTEGER`, and extract a pure decoder. Added synthetic child-variant, explicit-name, fixed-format, boundary, invalid-integer, and lookup-reuse tests (117 protocol tests total). Final size: 27,953 JavaScript bytes and 9,998 gzip bytes, still below both targets. Experiment #24 is classified as a size regression, but these required correctness/performance fixes are retained; do not revert them as a discarded optimization.
