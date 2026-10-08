# Bundle size budgets

`.ci/bundle-size-budgets.json` defines named budgets for each platform. Each budget
explicitly selects a `measurement` and may select a `file` within a package.
The platform adapter defines what its `bundle` contains; for web, that is all
shipped JavaScript under `dist`.
Limits are KiB (1,024 bytes), including fractions. Comparisons use exact
bytes, not the rounded numbers displayed in PR reports.

Web has a 40 KiB soft limit and 50 KiB hard limit on all shipped JavaScript,
using `"measurement": "bundle"`. This measures every JavaScript file shipped in
`dist`, including entry files and shared chunks. Declarations, source maps, and
other package contents are excluded from this measurement. Web's deterministic
gzip bundle size and npm package size remain informational.

### Per-package Web JavaScript

The Web bundle also includes code from other packages, such as the protocol and
telemetry clients. `bundle-size-attribution.cjs` splits the same uncompressed
bundle bytes by the npm package that owns each original source file, using the
shipped source maps. Owners come from the nearest `package.json` inside the
repository. JavaScript files without a source map, such as entry shims, belong
to the package that builds them. Unmapped bytes (bundler glue such as
import/export wiring) stay unattributed and count only toward the total. Package
rows plus the unattributed row always sum to the `bundle` measurement.

Budget one package with `"measurement": "bundlePackage"` and its npm name:

```json
{
  "web": {
    "protocol": {
      "measurement": "bundlePackage",
      "package": "@shopify/checkout-kit-protocol",
      "softKiB": 16,
      "hardKiB": 20
    }
  }
}
```

A budgeted package that no longer contributes bytes reports a missing
measurement. Remove or rename its budget in the same change. Accepting a
per-package breach records that package, so the acceptance cannot satisfy
another package's budget.

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
| `web` | `bundlePackage` | Raw shipped JavaScript bytes owned by `package` (via source maps) |
| `web` | `package` | Whole compressed npm tarball |
| `react-native` | `package` | Whole compressed wrapper npm tarball |
| `android` | `package` | Whole compressed release AAR |

With `measurement: "package"`, an optional `file` selects that exact file's
**uncompressed** size inside the package. Paths are relative to the published
package root (or AAR root); globs are not supported. A missing file fails the check.
For example, this budgets only the entry file, rather than every JavaScript chunk:

```json
{
  "web": {
    "entryPoint": {
      "measurement": "package",
      "file": "dist/index.js",
      "softKiB": 35,
      "hardKiB": 50
    }
  }
}
```

Omit `file` from a `package` budget to measure the complete compressed artifact.
Budget names such as `entryPoint` are labels; the selector fields determine what
is measured, and the PR report displays that scope explicitly.

Unknown platforms, measurements, units, and invalid limits fail configuration
validation. Adding a new measurement (for example a Swift framework) requires a
reproducible collector in `measure-package-size`, its changed-path detection and
build setup in `package-size.yml`, and an adapter in `bundle-size-budgets.cjs`.
The evaluator, comment commands, and aggregate check need no platform-specific policy.

**Size budgets** evaluates a PR's budget file with the default branch's policy code.
Land a new measurement type first, then add the budgets that use it in a later
change. Otherwise the check rejects the budget file until the new type merges.

## CI integration

**Package Size** builds the explicit PR head and base SHAs with a read-only token,
including on drafts. It uploads measurements and the informational file breakdown.
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
