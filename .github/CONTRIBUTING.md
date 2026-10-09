# Contributing

The following is a set of guidelines for contributing to this project. Please take a moment to read through them before submitting your first PR.

This is a monorepo containing the Swift, Android, React Native, and Web implementations of the Shopify Checkout Kit. Each platform has its own conventions, tooling, and release process; the shared guidelines below apply to all of them.

## Code of Conduct

This project and everyone participating in it are governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [opensource@shopify.com](mailto:opensource@shopify.com).

## Welcomed contributions

- Reporting issues with existing features
- Bug fixes
- Performance improvements
- Documentation
- Usability improvements

## Things we won't merge

- Additional dependencies that limit SDK use (e.g. unnecessary Swift or Android dependencies)
- Any changes that break existing tests
- Any changes without sufficient tests

## Proposing features

When in doubt about whether we will be interested in including a new feature, please open an issue to propose the feature so we can confirm scope before it is implemented.

**NOTE**: Issues that have not been active for 30 days will be marked as stale, and subsequently closed after a further 7 days of inactivity.

## How to contribute (general flow)

1. Fork the repo and branch off of `main`.
2. Create a feature branch in your fork.
3. Make changes and add any relevant tests.
4. Run the platform-specific formatter / linter (see below).
5. Verify the changes locally (e.g. via the platform's sample app).
6. Commit your changes and push.
7. Ensure all checks (tests, lint) are passing in GitHub.
8. Open a pull request with a detailed description of what is changing and why.

### Dev tooling

Shopify employees can use the root `dev.yml` from the repo root or any platform
directory:

```bash
dev up
dev check
```

`dev up` performs full DevHub provisioning, then runs Checkout Kit's repo-owned
setup steps. Those repo-owned steps are summarized at the end so a Swift,
Android, React Native, or Web setup failure is visible without hiding later
platform results. If a setup step fails, fix it and rerun `dev up`.

Setup generates the Android, Swift, and React Native sample config files from
`.env`, with matching keys in `.env.local` taking precedence.

**Shopify employees.** Run `dev up` to generate `.env` and `e2e/.env` from
`config/secrets`. Use `dev secrets edit demo` or `dev secrets edit e2e` for shared
changes, and `.env.local` for gitignored overrides.

**External contributors.** Create `.env`, add your storefront details, then run
setup from the repository root:

```bash
cp .env.example .env
# Edit .env with your storefront details
scripts/setup_storefront_env
```

Platform-scoped commands are available as `dev android <command>`, `dev swift <command>`, `dev react-native <command>` (or `dev rn`), and `dev web <command>` after setup. Protocol schema/model commands are available as `dev protocol <command>`. For cross-platform changes, use `dev lint`, `dev test`, `dev check`, `dev format`, and `dev build`.

React Native sample apps can be run against local in-repo SDK sources with
`dev rn ios --local` or `dev rn android --local`. The Web sample accepts a
checkout URL directly and does not use the shared storefront credential files.

### Test coverage

CI requires at least **85% statements, branches, functions, and lines** for
each of the Web, React Native JavaScript, and TypeScript protocol packages.
The thresholds apply to each package as a whole, including untested source
files, rather than to individual files. Sample apps, test helpers, and type
declarations do not contribute to these thresholds; the protocol also excludes
generated models and its barrel export.

Run the same coverage checks locally from the repository root:

```bash
pnpm --dir platforms/web test
pnpm --dir platforms/react-native test --coverage --testPathPatterns="modules/@shopify/checkout-kit-react-native/tests"
pnpm --dir protocol test --coverage
```

A failing threshold fails the test command and its CI job. Add tests for the
uncovered behavior instead of lowering the threshold. The thresholds live in
`platforms/web/vite.config.ts`, `platforms/react-native/jest.config.js`, and
`protocol/vitest.config.ts`. Swift, Android, and standalone telemetry tests do
not yet enforce coverage thresholds.

### Testing PR builds with Tophat

[Tophat](https://github.com/Shopify/tophat) is a macOS menu-bar app that
installs testable builds onto a simulator, emulator, or connected device that
your Mac controls. Checkout Kit's E2E pipeline (Bitrise) produces the
installable artifacts, and Tophat downloads them. Because Tophat installs onto
the device your Mac controls, install links must be opened on that Mac —
scanning a QR code with a phone does not work with Tophat.

**First-time setup.** `dev up` installs Tophat and seeds Quick Launch entries.
Installs need a Bitrise Personal Access Token to download build artifacts. The
first time you run `dev tophat` and no token is stored, it opens the Bitrise
token page, prompts you to paste a token (input hidden), stores it in your
login keychain, and saves it into Tophat for you (macOS may ask to let
`security` update Tophat's keychain entry — choose Always Allow). If you would
rather configure it yourself, create a PAT at
https://app.bitrise.io/me/account/security and add it in
Tophat -> Settings -> Extensions -> Bitrise.

There are three ways to install a build:

1. **Quick Launch (latest `main`)** — `dev up` seeds a `Checkout Kit` entry per
   SDK target (React Native, Swift, Kotlin) from `scripts/tophat/targets.json`,
   each installing the latest successful `main` build. Select a device in
   Tophat's menu, then pick the entry.
2. **Per-PR comment** — each PR gets a sticky comment with an `Install with
   Tophat` link per SDK target for that PR's branch. Open Tophat, select your
   target device, then click the link on the Mac running Tophat.
3. **`dev tophat` command** — installs a specific PR's build directly to a
   device, targeting the device explicitly so you do not need to pre-select one
   in Tophat:

   ```bash
   dev tophat                                              # pick a PR, then what to test, then a device
   dev tophat 382                                          # PR 382
   dev tophat 382 react-native-ios                         # skip the "what to test" prompt
   dev tophat 382 --wait                                   # ensure the HEAD build, then install
   dev tophat https://github.com/Shopify/checkout-kit/pull/382
   ```

   It resolves the PR's HEAD commit, asks what to test (e.g. React Native iOS /
   Android), then checks that the selected target's newest Bitrise build was
   built at that HEAD commit. Tophat's branch provider always installs the
   newest build for the branch, so this guards against silently installing an
   older commit's artifact. When the newest build already matches HEAD it
   installs straight away. Otherwise it shows the current CI state and offers to:
   - trigger a HEAD build and wait (~6 min), or, when a HEAD build is already
     running, wait for that one instead of starting a duplicate;
   - install the current (older) build, showing its short SHA, commit title,
     how many commits it is behind HEAD, and its age; or
   - cancel.

   Draft PRs do not automatically trigger CI, so on a draft with no builds it
   offers to trigger the build directly. Pass `--wait` to skip the menu and
   ensure the HEAD build non-interactively (wait for a running HEAD build, or
   trigger one and wait). After the build is ready it reuses a running device
   that matches or lets you pick one with `fzf`, and installs the artifact.

   Set `TOPHAT_DRY_RUN=1` to print the generated install config without
   installing, or `TOPHAT_SKIP_ARTIFACT_CHECK=1` to skip the HEAD-build
   verification and install whatever the branch provider resolves.

**Adding a new SDK target.** Add an entry to `scripts/tophat/targets.json` with
an `id`, `label`, and `recipes` (each a `platform`, `destination`, Bitrise
`workflow`, and `artifact_name`). It automatically flows into the Quick Launch
entries, the per-PR comment table, and `dev tophat`.

Sample app storefront configuration is generated from the repo-root `.env` and, when
it exists, `.env.local`. See [Dev tooling](#dev-tooling) for how each audience gets
those files.

## Release notes

The Release package workflow prepends `.github/RELEASE_TEMPLATE.md` to GitHub's
generated release notes. Before publishing a draft release, complete the
breaking, additive, and behaviour change sections, including focused code diffs
where they help consumers understand the change or migrate. Keep `None.` for
sections that do not apply. The generated list of included pull requests and
contributors remains below the curated sections.

### Coordinating ECP, Android, and React Native releases

When a feature needs changes across all three packages, release them in this order:

```text
Embedded Checkout Protocol (Maven Central)
  → Checkout Kit Android (Maven Central)
    → Checkout Kit React Native (npm)
```

Each downstream package must build and pass CI against its newly published
dependency before it is released. A GitHub tag or release alone is not enough:
wait for the upstream publish workflow and any registry approval/propagation to
finish, then let the downstream Gradle build resolve the artifact from Maven
Central. The release workflows run independently; they do not automatically
sequence these three stages.

The version declarations have different jobs. The Android catalog is
`platforms/android/gradle/libs.versions.toml`; the RN manifest is
`platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json`.

| Package | Its release version | Dependency it consumes |
| --- | --- | --- |
| Kotlin ECP | Catalog: `embeddedCheckoutProtocolAndroidRelease` | — |
| Android Kit | Catalog: `checkoutKitAndroid` | Catalog: `embeddedCheckoutProtocolAndroid` |
| React Native | RN manifest: `version` | RN manifest: `checkoutKit.nativeSdkVersions.android` |

1. **Release ECP.** Merge the protocol changes, any API baseline changes, and
   `embeddedCheckoutProtocolAndroidRelease` bump after protocol tests/API checks pass.
   Leave Kit's dependency pin and RN's native SDK pins at their existing published
   versions. Follow [the ECP release steps](#releasing-a-new-embedded-checkout-protocol-version)
   and wait for the new protocol JAR and metadata to be available on Maven Central.
2. **Adopt ECP and release Android.** In the Kit PR, update
   `embeddedCheckoutProtocolAndroid`, make the SDK changes, and bump
   `checkoutKitAndroid` and the installation snippets. Run normal SDK and sample
   tests/builds and API checks against the published ECP dependency. Merge with
   passing CI, follow [the Android release steps](#releasing-a-new-android-version),
   and wait for the Kit AAR and metadata to be available on Maven Central.
3. **Adopt Android and release RN.** In the RN PR, update
   `checkoutKit.nativeSdkVersions.android` to the published Kit version, make the
   wrapper changes, and bump the RN package's own `version`. Run the normal RN
   Android tests and sample build, plus the other required RN checks, before
   merging. Follow [the RN release steps](#releasing-a-new-react-native-version)
   to publish the npm package. RN resolves ECP transitively through Kit; it does
   not need a separate ECP version pin. Update the iOS pin only when needed, after
   the required Swift release is available on CocoaPods.

This is a dependency waterfall, not a requirement to release every package every
time. An Android-only fix can retain its ECP pin and start at stage 2. An RN-only
fix can retain its native SDK pins and start at stage 3. An ECP release does not
force Kit or RN to adopt it immediately, and the package versions need not match.

#### Why publish in this order?

- **Each layer tests the artifacts it declares.** Kit compiles against the same
  published ECP API it asks consumers to resolve. RN then compiles against the
  released Kit and its transitive protocol dependency. Missing types or methods
  can fail those builds before a downstream release ships.
- **Versions form an explicit boundary.** A protocol source change does not
  silently change Kit's dependency, and a Kit source change does not silently
  change RN's dependency. Each adoption is a reviewable pin update with CI results.
- **The packages remain composable.** Apps and other SDKs can use standalone ECP
  or Kit's normal transitive dependency without Kit embedding another copy of the
  protocol classes. Gradle can resolve the shared dependency through its metadata.

The cost is waiting for upstream publication and running downstream CI between
releases. That waiting is deliberate: a successful local source build does not
prove that the declared published dependency supports the new code. The RN npm
publish job builds and packs the JavaScript module; it does not rerun Android
compilation, so passing RN Android CI against the published SDK is required before
the RN release.

#### Developing changes across packages

Develop the changes together on stacked branches using `dev android test --local`
or `dev android api check --local` for Kit/ECP, and `dev rn test android --local`
or `dev rn android --local` for RN/native changes. These explicit overrides allow
early integration before publication. On the RN development branch, set
`checkoutKit.nativeSdkVersions.android` to the in-repo `checkoutKitAndroid` version
so Maven Local resolves the artifact just built. Keep downstream adoption PRs open
until their upstream artifacts are published, then rerun normal builds and CI without
the overrides. Clear `USE_LOCAL_SDK` and `ORG_GRADLE_PROJECT_useLocalProtocol` if
they were exported in your shell. Local success does not replace the published
dependency checks or change the release order.

---

## Swift (`platforms/swift/`)

### Prerequisites

This project uses [Mint](https://github.com/yonaskolb/Mint) to manage Swift linting tools (SwiftLint and SwiftFormat) at pinned versions via `platforms/swift/Mintfile`. This ensures consistent formatting across all contributors and CI.

**Shopify employees** (from the repo root):

```bash
dev up
```

**External contributors**:

```bash
brew install mint
cd platforms/swift && mint bootstrap
```

### Formatting

```bash
cd platforms/swift && ./Scripts/lint fix
```

### Public API surface

The library's public API is tracked via committed baselines under `platforms/swift/api/`, one JSON file per module (`EmbeddedCheckoutProtocol.json`, `ShopifyCheckoutKit.json`, `ShopifyAcceleratedCheckouts.json`). They are produced by `xcrun swift-api-digester -dump-sdk` against the built `.swiftmodule` files. The `swift-api-check` job in the Bitrise `ci-ios` pipeline runs `./Scripts/api check` on every PR that touches Swift sources and fails the required `ci/bitrise/ci-ios/pr` check if the digester output for any module diverges from its committed baseline.

If your change intentionally modifies the public API:

1. Run `dev swift api dump` from the repo root to regenerate the baselines.
2. Review the diff in `platforms/swift/api/*.json` alongside your code changes.
3. Commit the updated JSON files in the same PR.

When `dev swift api check` fails, it prints both the unified diff and a `swift-api-digester -diagnose-sdk` summary categorizing the changes (removed, renamed, type/protocol/inheritance changes). Use the diagnose summary to decide whether the diff is intentional.

### Releasing a new Swift version

Open a pull request with the following changes:

1. Bump the package version in `platforms/swift/Sources/ShopifyCheckoutKit/ShopifyCheckoutKit.swift`.
2. Bump the metadata version in `platforms/swift/Sources/ShopifyCheckoutKit/MetaData.swift`.
3. Bump the podspec version in `ShopifyCheckoutKit.podspec` (at the repo root).

All Swift version declarations must match exactly. Supported release versions are `X.Y.Z` and prerelease versions are `X.Y.Z-{alpha|beta|rc}.N`.

Once merged, run the [Release package workflow](../../actions/workflows/release.yml):

1. Select `iOS` as the platform.
2. Enter the expected version. The workflow reads the SDK version from the checked-in files and fails if the typed version does not match.
3. Select `Dry run` first to review the release plan without creating a release.
4. Rerun with `Draft release` to create a draft GitHub Release with generated release notes and the bare semver tag (e.g. `4.0.1`) for human review.
5. Publish the draft release when ready. Publishing the draft kicks off the [Swift publish workflow](../../actions/workflows/swift-publish.yml), which publishes the new version to CocoaPods.

---

## Android (`platforms/android/`)

### Formatting

This project uses [detekt](https://detekt.dev/) for Kotlin linting and formatting. From `platforms/android/`:

```bash
./gradlew detekt --auto-correct
```

To check for lint issues without auto-correcting:

```bash
./gradlew detekt
```

### Public API surface

The Android-facing public APIs are tracked via committed baselines managed by the [binary-compatibility-validator](https://github.com/Kotlin/binary-compatibility-validator) Gradle plugin:

- `platforms/android/lib/api/lib.api` for `com.shopify:checkout-kit`.
- `protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` for `com.shopify:embedded-checkout-protocol`.

The unified `Breaking Changes` CI workflow runs `./gradlew :lib:apiCheck` from `platforms/android` and `./gradlew :embedded-checkout-protocol:apiCheck` from `protocol/languages/kotlin` on every PR that touches Android or Kotlin protocol sources. It fails if either compiled public API diverges from the committed baselines.

If your change intentionally modifies the public API:

1. Run `dev android api dump` from the repo root to regenerate both baselines. For project-scoped updates, run `./gradlew :lib:apiDump` from `platforms/android/` or `./gradlew :embedded-checkout-protocol:apiDump` from `protocol/languages/kotlin/`.
2. Review the relevant `.api` diff alongside your code changes.
3. Commit the updated `.api` file in the same PR.

If you did _not_ intend to change public API and `apiCheck` is failing, the diff shows what your change inadvertently affected — treat it as a signal that something in your PR has consumer-visible impact.

### Releasing a new Embedded Checkout Protocol version

Open a pull request with the following changes:

1. Bump `embeddedCheckoutProtocolAndroidRelease` in `platforms/android/gradle/libs.versions.toml`.
2. Update `protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` if the public protocol API changed.

Keep `embeddedCheckoutProtocolAndroid` at the existing published version
until the new protocol artifact is available. This lets the protocol release PR
merge while Kit continues building against its current dependency.

Supported protocol release versions are `YYYY.MM.DD.PATCH` and prerelease versions are `YYYY.MM.DD.PATCH-{alpha|beta|rc}.N`.

Once merged, run the [Release package workflow](../../actions/workflows/release.yml):

1. Select `Embedded Checkout Protocol` as the platform.
2. Enter the expected version. The workflow reads the protocol version from `platforms/android/gradle/libs.versions.toml` and fails if the typed version does not match.
3. Select `Dry run` first to review the release plan without creating a release.
4. Rerun with `Draft release` to create a draft GitHub Release with the `embedded-checkout-protocol/`-prefixed tag (e.g. `embedded-checkout-protocol/2026.04.08.1-alpha.1`) for human review.
5. Publish the draft release when ready. Publishing the draft kicks off the [Embedded Checkout Protocol publish workflow](../../actions/workflows/android-protocol-publish.yml). **A manual approval by a maintainer is required before publication to Maven Central.**

### Releasing a new Android version

Open a pull request with the following changes:

1. Bump `checkoutKitAndroid` in `platforms/android/gradle/libs.versions.toml`.
2. If Kit needs a new protocol version, publish that protocol release first, then
   update `embeddedCheckoutProtocolAndroid` to it in the same catalog.

The Android library and sample compile against the protocol artifact pinned in
`platforms/android/gradle/libs.versions.toml` from Maven Central. CI uses the same
dependency, and the publish workflow runs unit tests and API checks before uploading.
Unit tests and remote publication also run `:lib:verifyPublishedProtocol`, which
checks that the release and unit-test classpaths resolve ECP as an external module
at exactly the catalog-pinned dependency version. This rejects accidental project
substitution or version changes introduced by dependency resolution. Explicit local
mode skips this assertion; remote publication still rejects local mode.
Changes to protocol source are tested separately with `dev protocol test kotlin`.
Repository-wide `dev test`, `dev lint`, and `dev format` also cover Kotlin protocol
source independently of Kit's published dependency. Use `dev protocol lint` or
`dev protocol format` to run the protocol checks and formatting directly.

For joint development against unreleased protocol changes, run `dev android test --local`,
`dev android build --local`, or `dev android start --local`. The `--local` flag works with
Android build, test, lint, format, check, and API commands and sets the Gradle property
`useLocalProtocol=true` for that invocation. When running Gradle directly, pass `-PuseLocalProtocol=true`.
Remote publication rejects local mode; React Native's explicit `--local` flow can
still publish both artifacts to Maven Local. Kit changes that need a new protocol
version become mergeable once that version is published and normal CI passes.

Supported release versions are `X.Y.Z` and prerelease versions are `X.Y.Z-{alpha|beta|rc}.N`.

Once merged, run the [Release package workflow](../../actions/workflows/release.yml):

1. Select `Android` as the platform.
2. Enter the expected version. The workflow reads the SDK version from `platforms/android/gradle/libs.versions.toml` and fails if the typed version does not match.
3. Select `Dry run` first to review the release plan without creating a release.
4. Rerun with `Draft release` to create a draft GitHub Release with generated release notes and the `android/`-prefixed tag (e.g. `android/4.0.1`) for human review.
5. Publish the draft release when ready. Publishing the draft kicks off the [Android publish workflow](../../actions/workflows/android-publish.yml). The workflow verifies that `com.shopify:embedded-checkout-protocol` is already available on Maven Central before publishing `com.shopify:checkout-kit`. **A manual approval by a maintainer is required before publication to Maven Central.**

---

## React Native (`platforms/react-native/`)

### Native SDK dependency versions

The React Native package reads its published native SDK dependency versions from `platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json`:

```json
"checkoutKit": {
  "nativeSdkVersions": {
    "ios": "4.0.0-alpha.1",
    "android": "4.0.0-alpha.1"
  }
}
```

When updating the Swift or Android SDK version that React Native should consume, update the matching `checkoutKit.nativeSdkVersions` entry in this package file after the native SDK version has been published. These values drive `RNShopifyCheckoutKit.podspec` for iOS and the module/sample Gradle dependencies for Android, so they must stay aligned with the published native SDK versions used by the React Native release. Android CI uses the published Maven artifact by default, so `nativeSdkVersions.android` must reference a `com.shopify:checkout-kit` version that is already available from Maven Central.

For coordinated native and React Native releases, publish Android and Swift first, then update these React Native native SDK version pointers and publish React Native.

For an Android change that also needs a new protocol version, use the full
[ECP → Android → RN release sequence](#coordinating-ecp-android-and-react-native-releases).
Keep an unchanged iOS dependency pinned to its existing published release.

### Public API surface

The library's public API is tracked via a committed report at `platforms/react-native/modules/@shopify/checkout-kit-react-native/api/checkout-kit-react-native.api.md`, generated by [@microsoft/api-extractor](https://api-extractor.com/) from the bob-produced `.d.ts` files. The unified `Breaking Changes` CI workflow runs `dev rn api check` on every PR that touches React Native sources and fails if the regenerated report diverges from the committed one.

If your change intentionally modifies the public API:

1. Run `dev rn api dump` from the repo root to regenerate the report.
2. Review the diff in `platforms/react-native/modules/@shopify/checkout-kit-react-native/api/checkout-kit-react-native.api.md` alongside your code changes.
3. Commit the updated `.api.md` file in the same PR.

If you did _not_ intend to change public API and `api:check` is failing, the diff shows what your change inadvertently affected — treat it as a signal that something in your PR has consumer-visible impact.

### Releasing a new React Native version

Open a pull request with the following changes:

1. Bump the `version` in `platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json`.
2. Update `checkoutKit.nativeSdkVersions.ios` and `checkoutKit.nativeSdkVersions.android` in `platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json` to the published native SDK versions React Native should consume.

Supported release versions are `X.Y.Z` and prerelease versions are `X.Y.Z-{alpha|beta|rc}.N`.

Once merged, run the [Release package workflow](../../actions/workflows/release.yml):

1. Select `React Native` as the platform.
2. Enter the expected version. The workflow reads the SDK version from `platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json` and fails if the typed version does not match.
3. Select `Dry run` first to review the release plan without creating a release.
4. From the dry-run job summary, copy the generated `gh workflow run` command to create a `Draft release` without retyping the validated version. Running it creates a draft GitHub Release with generated release notes and the `react-native/`-prefixed tag (e.g. `react-native/4.0.1`) for human review.
5. Publish the draft release when ready. Publishing the draft kicks off the [React Native publish workflow](../../actions/workflows/rn-publish.yml), which publishes `@shopify/checkout-kit-react-native` to npm.
