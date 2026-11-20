# Bundle size budgets

`.ci/bundle-size-budgets.json` defines named budgets for each platform. Each budget
explicitly selects a `measurement` and may select a `file` within a package or CDN
build. An optional `name` supplies a readable display name in the budget table
and the corresponding measurement or file breakdown row.
The platform adapter defines what its `bundle` contains; for web, that is all
shipped JavaScript under `dist`.
Limits are KiB (1,024 bytes), including fractions. Comparisons use exact
bytes, not the rounded numbers displayed in PR reports.

Web has a 72 KiB soft limit and 85 KiB hard limit on all shipped JavaScript,
using `"measurement": "bundle"`. This measures all entry points and shared chunks
in `dist`. Declarations, source maps, and other package contents are excluded from
this measurement. `shopify-universal-checkout` and `shop-pay` also have individual file budgets;
their report names omit the `dist/chunks/` path prefix.
The separate CDN build has a 132 KiB soft limit and 150 KiB hard limit using
`"measurement": "cdn"`. It measures all runtime JavaScript in `dist-cdn`, including
the loader and hashed component chunks (currently about 130.3 KiB). CDN files are
built with `pnpm build:cdn` for both the PR base and head; they are not included in
the npm tarball. A failed or empty head CDN build fails measurement.
CDN collection is enabled by default. Callers measuring an npm-only package can
set `MEASURE_WEB_CDN=false` to skip the CDN build and measurements.
Deterministic gzip sizes for both builds and the npm package size remain informational.

One summary table combines bundle and package totals, npm components, configured
file budgets, and the CDN loader and components. It shows current raw and
compressed sizes with explicit KiB units and nonzero changes from the PR base
beside each value. Limits share the same row, and an overall status replaces
repeated success messages. Breaches remain visible on the affected rows;
acceptance instructions appear only when needed. File inventories,
accepted-increase reasons, and measurement explanations live inside one
**Measurement details** disclosure.

Entry names show ⚠️ when the current size is above a soft limit and 🛑 when it is
above a hard limit. Comparisons use exact bytes, with the hard-limit indicator
taking precedence if multiple budgets share a row. Accepted or unchanged sizes
above a limit retain the indicator; the budget status explains whether action is
required. Rows without budgets or current measurements have no threshold indicator.

npm components are discovered from implementation chunks with matching package
entry points, even without a configured budget. Each component row measures its
implementation chunk. **Shared runtime** groups the remaining internal JavaScript,
and **Entry points** groups the top-level JavaScript files. Individually budgeted
files appear separately and are excluded from these groups. Together, the rows
account for the npm JavaScript total without counting any file twice. Gzip sizes
for individual npm rows are not collected. Missing measurements are shown as
unavailable.

CDN component sizes include their bundled dependencies. Files under
`assets/<component>/` are grouped by component name, so changing a content hash
preserves the comparison. Other runtime files remain visible by path. Added or
removed CDN components compare against zero when measurements exist on both
revisions; missing measurements are shown as unavailable.

Android and React Native use `"measurement": "package"` to budget the complete
compressed artifact:

| Platform | Artifact | Soft limit | Hard limit |
| --- | --- | --- | --- |
| Android | Release AAR (ZIP) | 450 KiB | 500 KiB |
| React Native | Published npm package (gzip) | 130 KiB | 150 KiB |

The Android budget covers the library's compiled code and resources, excluding
separately resolved dependencies such as the protocol artifact. The React Native
budget includes the wrapper's JavaScript outputs, sources, declarations, source
maps, native bridge sources, and bundled protocol; separately resolved native SDKs
are excluded. These budgets measure package size, not the final consumer app size.

## Accepting an increase

The **Size budgets** check combines all configured metrics for affected platforms:

- At or below the soft limit: pass.
- Already above a limit on the PR base, and unchanged or smaller: pass.
- Growing above the soft limit, but at or below the hard limit: require acceptance.
- Growing above the hard limit: require a reviewed budget-file change.
- Missing a configured head measurement: fail. Missing base measurements do not
  exempt an increase from its limits.

Once the current revision's report is posted, a repository writer (including the
PR author) can add a new PR comment:

```text
/accept-size web Required for the new checkout capability.
```

The reason is mandatory. The command accepts every currently unaccepted soft-limit
breach for that platform, recording an independent byte cap for each metric, the
actor, and a link to the reason. Multiple commands may share one comment:

```text
/accept-size web Includes the new checkout capability.
/accept-size android Includes its native implementation.
```

Every breached metric must be satisfied before the aggregate check passes.
Acceptance survives subsequent commits when the accepted measurement stays the same
size or gets smaller. Further growth or a newly breached metric requires a new
comment. Changing a budget's measurement or file also requires fresh acceptance.
A comment cannot override a hard limit, failed build, or missing data.
It does not modify the configured budget. Edited comments are not processed; post
a new command instead. Editing or deleting an already accepted reason does not
erase the recorded decision in the bot report.

Commands posted before the current report is ready cannot pre-approve future
measurements. If the PR head or base has changed, rerun **Package Size** and wait
for the updated report. Expired measurement artifacts also require a rerun.

## Metrics and additional platforms

| Platform key | `measurement` | Scope |
| --- | --- | --- |
| `web` | `bundle` | Sum of raw shipped `.js`, `.mjs`, and `.cjs` files in `dist` |
| `web` | `bundleGzip` | Sum of those files compressed individually with `gzip -n -9` |
| `web` | `cdn` | Sum of raw `.js`, `.mjs`, and `.cjs` files in the separate `dist-cdn` build |
| `web` | `cdnGzip` | Sum of those CDN files compressed individually with `gzip -n -9` |
| `web` | `package` | Whole compressed npm tarball |
| `react-native` | `package` | Whole compressed wrapper npm tarball |
| `android` | `package` | Whole compressed release AAR |

With `measurement: "package"`, an optional `file` selects that exact file's
**uncompressed** size inside the package. Paths are relative to the published
package root (or AAR root); globs are not supported. A missing file fails the check.
With `measurement: "cdn"`, `file` selects a runtime JavaScript file relative to
`dist-cdn`, such as `checkout-kit.js`. Paths must be exact, including any filename
hash; use the aggregate `cdn` budget to track hashed chunks across builds. Source
maps and declarations are excluded from CDN measurements.

For example, these entries give the npm runtime chunk and CDN loader readable names:

```json
{
  "web": {
    "checkout": {
      "name": "Checkout runtime",
      "measurement": "package",
      "file": "dist/chunks/shopify-checkout.js",
      "softKiB": 37,
      "hardKiB": 50
    },
    "cdnLoader": {
      "name": "CDN loader",
      "measurement": "cdn",
      "file": "checkout-kit.js",
      "softKiB": 1.5,
      "hardKiB": 2
    }
  }
}
```

Omit `file` from a `package` budget to measure the complete compressed artifact.
Keys such as `checkout` are stable budget identifiers; the selector fields determine
what is measured. The optional `name` replaces the default scope or path label,
while the report still shows the platform and compression. Names must contain
1–100 characters on one line and are escaped for Markdown. Omit `name` to keep the
existing labels. Renaming a display name does not invalidate an acceptance; changing
its measurement or file does. If multiple budgets name the same measurement or
file, the first name is used in the informational breakdown.

Unknown platforms, measurements, units, and invalid limits fail configuration
validation. Adding a new measurement (for example a Swift framework) requires a
reproducible collector in `measure-package-size`, its changed-path detection and
build setup in `package-size.yml`, and an adapter in `bundle-size-budgets.cjs`.
The evaluator, comment commands, and aggregate check need no platform-specific policy.

## CI integration

**Package Size** builds the explicit PR head and base SHAs with a read-only token,
including on drafts. It uploads measurements and the informational file breakdown.
Title and body edits skip every job and do not cancel a running measurement;
**Size budgets** ignores those skipped runs and republishes the latest
measurement. Changing the PR base still measures again.
When no packages are affected, detection uploads an empty report and skips the
measurement job, avoiding a second runner and the head/base build checkouts.
The empty report still completes **Size budgets** through the same publisher.
**Bundle Size Budgets** runs trusted default-branch code to read that data, check
commenter permissions, and publish the report and **Size budgets** check. It never
executes code from a PR in the job with write permissions. Saved acceptances are
read only from the GitHub Actions bot's report, and concurrent updates are serialized
per PR. Older runs cannot overwrite a newer revision's result.

The publisher and comment commands become available after this workflow lands on
the default branch. At that point, add **Size budgets** (GitHub Actions) to the
repository's required status checks, alongside **CI Required**. Requiring it before
then would block PRs waiting for a check that cannot yet run. Keep it separate from
the build gate so accepting an increase can update its result without rebuilding.
