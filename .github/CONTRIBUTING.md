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

Setup creates or syncs sample app storefront configuration from the repo-root
`.env`. If `.env` is missing, setup prompts for required storefront values and
then generates the Android, Swift, and React Native sample config files.
Optional Apple Pay and Customer Account API values are preserved if already set,
but `dev up` leaves missing optional values blank instead of prompting.

Platform-scoped commands are available as `dev android <command>`, `dev swift <command>`, `dev react-native <command>` (or `dev rn`), and `dev web <command>` after setup. Protocol schema/model commands are available as `dev protocol <command>`. For cross-platform changes, use `dev lint`, `dev test`, `dev check`, `dev format`, and `dev build`.

React Native sample apps can be run against local in-repo SDK sources with
`dev rn ios --local` or `dev rn android --local`. The Web sample accepts a
checkout URL directly and does not use the shared storefront credential files.

### Testing PR builds with Tophat

[Tophat](https://github.com/Shopify/tophat) is a macOS menu-bar app that
installs testable builds onto a simulator, emulator, or connected device that
your Mac controls. Checkout Kit's E2E pipeline (Bitrise) produces the
installable artifacts, and Tophat downloads them. Because Tophat installs onto
the device your Mac controls, install links must be opened on that Mac —
scanning a QR code with a phone does not work with Tophat.

**First-time setup.** `dev up` installs Tophat and seeds Quick Launch entries.
Tophat needs a Bitrise Personal Access Token to download build artifacts:

1. Create a PAT at https://app.bitrise.io/me/account/security
2. Add it in Tophat -> Settings -> Extensions -> Bitrise

There are three ways to install a build:

1. **Quick Launch (latest `main`)** — `dev up` seeds a `Checkout Kit (React
   Native)` entry (from `scripts/tophat/targets.json`) that installs the latest
   successful `main` build. Select a device in Tophat's menu, then pick the
   entry.
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
   dev tophat https://github.com/Shopify/checkout-kit/pull/382
   ```

   It resolves the PR's branch, asks what to test (e.g. React Native iOS /
   Android), reuses a running device that matches or lets you pick one with
   `fzf`, then installs the matching artifact. Set `TOPHAT_DRY_RUN=1` to print
   the generated install config without installing.

**Adding a new SDK target.** Add an entry to `scripts/tophat/targets.json` with
an `id`, `label`, and `recipes` (each a `platform`, `destination`, Bitrise
`workflow`, and `artifact_name`). It automatically flows into the Quick Launch
entries, the per-PR comment table, and `dev tophat`.

Sample app storefront configuration is generated from the repo-root `.env`.
Shopify employees get this through `dev up`. External contributors can copy
`.env.example` to `.env`, fill in local storefront values, then run
`scripts/setup_storefront_env` from the repo root.

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

The library's public API is tracked via committed baselines under `platforms/swift/api/`, one JSON file per module (`EmbeddedCheckoutProtocol.json`, `ShopifyCheckoutKit.json`, `ShopifyAcceleratedCheckouts.json`). They are produced by `xcrun swift-api-digester -dump-sdk` against the built `.swiftmodule` files. The unified `Breaking Changes` CI workflow runs `dev swift api check` on every PR that touches Swift sources and fails if the digester output for any module diverges from its committed baseline.

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

1. Bump `embeddedCheckoutProtocolAndroid` in `platforms/android/gradle/libs.versions.toml`.
2. Update `protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` if the public protocol API changed.

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
2. If the Android Kit release depends on a new protocol version, release `embeddedCheckoutProtocolAndroid` first.

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

### Public API surface

The library's public API is tracked via a committed report at `platforms/react-native/modules/@shopify/checkout-kit-react-native/api/checkout-kit-react-native.api.md`, generated by [@microsoft/api-extractor](https://api-extractor.com/) from the bob-produced `.d.ts` files. The unified `Breaking Changes` CI workflow runs `dev rn api check` on every PR that touches React Native sources and fails if the regenerated report diverges from the committed one.

If your change intentionally modifies the public API:

1. Run `dev rn api dump` from the repo root to regenerate the report.
2. Review the diff in `platforms/react-native/modules/@shopify/checkout-kit-react-native/api/checkout-kit-react-native.api.md` alongside your code changes.
3. Commit the updated `.api.md` file in the same PR.

If you did *not* intend to change public API and `api:check` is failing, the diff shows what your change inadvertently affected — treat it as a signal that something in your PR has consumer-visible impact.

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
