# Contributing

The following is a set of guidelines for contributing to this project. Please take a moment to read through them before submitting your first PR.

This is a monorepo containing the iOS/Swift, Android, and (forthcoming) React Native implementations of the Shopify Checkout Kit. Each platform has its own conventions, tooling, and release process; the shared guidelines below apply to all of them.

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

The library's public API is tracked via committed baselines under `platforms/swift/api/`, one JSON file per module (`ShopifyCheckoutProtocol.json`, `ShopifyCheckoutKit.json`, `ShopifyAcceleratedCheckouts.json`). They are produced by `xcrun swift-api-digester -dump-sdk` against the built `.swiftmodule` files. The unified `Breaking Changes` CI workflow runs `dev swift api check` on every PR that touches Swift sources and fails if the digester output for any module diverges from its committed baseline.

If your change intentionally modifies the public API:

1. Run `dev swift api dump` from the repo root to regenerate the baselines.
2. Review the diff in `platforms/swift/api/*.json` alongside your code changes.
3. Commit the updated JSON files in the same PR.

When `dev swift api check` fails, it prints both the unified diff and a `swift-api-digester -diagnose-sdk` summary categorizing the changes (removed, renamed, type/protocol/inheritance changes). Use the diagnose summary to decide whether the diff is intentional.

### Releasing a new Swift version

Open a pull request with the following changes:

1. Bump the package version in `platforms/swift/Sources/ShopifyCheckoutKit/ShopifyCheckoutKit.swift`.
2. Bump the podspec version in `ShopifyCheckoutKit.podspec` (at the repo root).
3. Add an entry to the top of `platforms/swift/CHANGELOG.md`.

Once merged, draft a release on GitHub:

1. Create a tag with the bare semver name (e.g. `3.8.1`) — Swift releases use bare semver so SwiftPM consumers can resolve them with `from:` constraints.
2. Use the same tag as the release name.
3. Document the changes since the previous release in the description.
4. Check "Set as the latest release".
5. Click "Publish release". This kicks off the [Swift publish workflow](../../actions/workflows/swift-publish.yml) which publishes the new version to CocoaPods.

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

The library's public API is tracked via a committed baseline at `platforms/android/lib/api/lib.api`, managed by the [binary-compatibility-validator](https://github.com/Kotlin/binary-compatibility-validator) Gradle plugin. The unified `Breaking Changes` CI workflow runs `./gradlew :lib:apiCheck` on every PR that touches Android sources and fails if the compiled public API diverges from the baseline.

If your change intentionally modifies the public API:

1. Run `dev android api dump` from the repo root (or `./gradlew :lib:apiDump` from `platforms/android/`) to regenerate the baseline.
2. Review the diff in `platforms/android/lib/api/lib.api` alongside your code changes.
3. Commit the updated `.api` file in the same PR.

If you did *not* intend to change public API and `apiCheck` is failing, the diff shows what your change inadvertently affected — treat it as a signal that something in your PR has consumer-visible impact.

### Releasing a new Android version

Open a pull request with the following changes:

1. Bump the `versionName` in `platforms/android/lib/build.gradle`.
2. Add an entry to the top of `platforms/android/CHANGELOG.md`.

Once merged, draft a release on GitHub:

1. Create a tag prefixed with `android/` (e.g. `android/3.0.1`) — Android releases use the `android/` prefix so the Maven publish workflow can distinguish them from Swift releases.
2. Use the same tag as the release name.
3. Document the changes since the previous release in the description.
4. Check "Set as the latest release".
5. Click "Publish release". This kicks off the [Android publish workflow](../../actions/workflows/android-publish.yml). **A manual approval by a maintainer is required before publication to Maven Central.**

---

## React Native (`platforms/react-native/`)

### Public API surface

The library's public API is tracked via a committed report at `platforms/react-native/modules/@shopify/checkout-kit-react-native/api/checkout-kit-react-native.api.md`, generated by [@microsoft/api-extractor](https://api-extractor.com/) from the bob-produced `.d.ts` files. The unified `Breaking Changes` CI workflow runs `dev rn api check` on every PR that touches React Native sources and fails if the regenerated report diverges from the committed one.

If your change intentionally modifies the public API:

1. Run `dev rn api dump` from the repo root to regenerate the report.
2. Review the diff in `platforms/react-native/modules/@shopify/checkout-kit-react-native/api/checkout-kit-react-native.api.md` alongside your code changes.
3. Commit the updated `.api.md` file in the same PR.

If you did *not* intend to change public API and `api:check` is failing, the diff shows what your change inadvertently affected — treat it as a signal that something in your PR has consumer-visible impact.
