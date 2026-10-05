# Android R8 app-size benchmark

Measures the incremental cost of Checkout Kit in a fixed, minimal AppCompat app.
Both `baselineRelease` and `checkoutRelease` enable R8 and resource shrinking.
The baseline button displays a toast; the checkout button invokes the real
`ShopifyCheckoutKit.present` API with a synthetic URL. The checkout variant uses
the in-tree SDK and its published, catalog-pinned protocol dependency, including
the SDK's shipped consumer ProGuard rules.

## Run

From the repository root, with the Android development environment provisioned:

```sh
shadowenv exec -- /opt/dev/bin/dev android size-benchmark
shadowenv exec -- /opt/dev/bin/dev android size-benchmark --output /tmp/app-size.json
shadowenv exec -- /opt/dev/bin/dev android size-benchmark check
```

No emulator, storefront configuration, signing credentials, or real checkout is
required. Initial builds need network access to resolve Gradle dependencies.
The APKs are unsigned. The synthetic URL is not a functioning checkout; the app
is a build-time reachability fixture, not an end-to-end purchase test.

The command reruns both release builds with Gradle's build cache disabled, checks
published protocol resolution, and verifies R8 mappings. It refuses a report if
the baseline contains Checkout Kit or the checkout variant loses the SDK entry
point. A failed run removes any previous report at the requested output path.
Gradle logs go to stderr; stdout includes a machine-readable metric line:

```text
delta_compressed_payload_bytes=...
report=...
```

By default, JSON is written to `build/report.json` in this directory. APKs and
R8 reports, including mappings and removed-code reports, remain under
`build/outputs/`. The module is opt-in (`-PappSizeBenchmark=true`) and is not
included in normal SDK builds or publishing. Android CI explicitly validates the
fixture and collector, then uploads `report.json` as the `android-app-size` artifact.
It records measurements without imposing a size budget. The fixture uses a package
outside `com.shopify.checkoutkit` so SDK consumer keep rules do not keep fixture code.

## Metric

**Primary: `delta_compressed_payload_bytes`**, lower is better.

For each unsigned APK, sum the compressed sizes of every ZIP file entry, then
subtract baseline from checkout. Unlike APK file size, this excludes ZIP headers,
alignment padding, and the central directory. It includes transitive dependencies
not already retained by the baseline and the small difference in button handlers.
Metadata entries are included; timestamps in ZIP headers do not affect the sum.

JSON contains `baseline`, `checkout`, and signed `delta` measurements:

| Field | Measurement |
| --- | --- |
| `compressed_payload_bytes` | Sum of compressed ZIP entry sizes |
| `uncompressed_payload_bytes` | Sum of uncompressed ZIP entry sizes |
| `dex_bytes` | Uncompressed `classes*.dex` bytes |
| `resource_bytes` | Uncompressed `resources.arsc`, `res/`, and `assets/` bytes |
| `native_bytes` | Uncompressed `lib/` bytes |
| `apk_bytes` | Entire unsigned APK file size, including container overhead |

This is **not** a Play Store download estimate, installed-size estimate, or a
universal SDK size. An app already using more of the same dependencies will have
a different marginal cost. DEX/resource values are category totals, not exclusive
class-level attribution: R8 optimizes the entire application.

## Using it for autoresearch later

Keep the fixture, version catalog, Gradle/AGP/JDK versions, SDK levels, compression
settings, and baseline dependencies fixed. Compare runs on the same toolchain.
Run twice before starting a loop and compare all numeric fields to verify local
repeatability. Rebaseline after any fixture or toolchain change.

Do not optimize the benchmark by deleting the presentation call, weakening its
validation, or changing the baseline. Changes to consumer keep rules require
separate runtime tests of a shrunk app; existing SDK unit tests alone do not
prove that reflection, serialization, or WebView callbacks survive R8. The current
SDK keeps all `com.shopify.checkoutkit.**` members; this benchmark intentionally
honors that rule rather than imposing artificial benchmark-only shrink settings.

This change provides measurement only; it does not start an autoresearch session.

Collector-only tests need Python's standard library and no Android toolchain:

```sh
shadowenv exec -- /opt/dev/bin/dev android size-benchmark test
```
