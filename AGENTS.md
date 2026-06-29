## Repository layout

```
platforms/
  swift/         # iOS Swift Package and CocoaPods sources
  android/       # Android library and sample apps
  react-native/  # React Native wrapper
  web/           # Web component package and sample app
protocol/        # cross-platform communication layer and protocol language artifacts based on UCP
e2e/             # cross-platform end-to-end tests
.github/         # workflows, issue templates, CODEOWNERS
```

## Dev workflow

> **AI agents:** All commands require the `shadowenv exec --` prefix to run inside the shadowenv-managed environment.
>
> ```
> shadowenv exec --dir <repo_root> -- /opt/dev/bin/dev up
> shadowenv exec --dir <repo_root> -- /opt/dev/bin/dev test [ARGS]
> ```

Run `dev` commands from the repo root or any platform directory. Use `dev up`
before running commands when the environment may not be provisioned.

For platform-scoped work, prefer the root `dev.yml` commands:

- Android: `dev android <command>`
- Swift: `dev swift <command>`
- React Native: `dev react-native <command>` or `dev rn <command>`
- Web: `dev web <command>`

Use `dev up` for setup and setup recovery.

For protocol schema/model work, use `dev protocol <command>`.

For cross-platform changes, use the repo-wide aggregates: `dev lint`,
`dev test`, `dev check`, `dev format`, and `dev build`. Use
`dev <platform> format` for formatting; `fix` remains an alias for existing
workflows.

## Swift Xcode builds

Prefer the `dev swift ...` commands for Swift package and sample builds. When
running `xcodebuild` directly for Swift package, Swift sample, or React Native
iOS sample work, always include `-disableAutomaticPackageResolution` so Xcode
uses the committed `Package.resolved` files instead of silently updating package
pins. This prevents sample app dependencies such as Apollo iOS from being
written into the repo-root Swift package lockfile.

## React Native development with local native SDK changes

Until the new native SDK libraries have stable released versions, assume React Native validation needs the local native SDK workflow. Use `--local` whenever running the React Native sample or native React Native tests that depend on the in-repo Swift/Kotlin SDKs.

Use the React Native `--local` workflow when you need to test React Native against native SDK changes that exist in this repository but have not been released as a SemVer/CocoaPods/Maven version yet.

This applies when changes are made under:

- `platforms/swift/` — the iOS Swift SDK / CocoaPods sources
- `platforms/android/` — the Android SDK / Maven artifact sources
- `protocol/languages/kotlin/` — Kotlin protocol artifacts consumed by the Android SDK

It does **not** refer to the React Native wrapper platform folders:

- `platforms/react-native/modules/@shopify/checkout-kit-react-native/ios/`
- `platforms/react-native/modules/@shopify/checkout-kit-react-native/android/`

### What `--local` does

- For React Native iOS, `--local` wires CocoaPods to the in-repo `platforms/swift/` sources via a local path instead of a released pod version.
- For React Native Android, `--local` publishes/uses the in-repo Android SDK and Kotlin protocol artifacts through Maven Local so Gradle resolves the local `com.shopify:checkout-kit` and `com.shopify:embedded-checkout-protocol` artifacts instead of released Maven versions.

### When to use it

Use `--local` whenever you are validating React Native behavior that depends on unreleased native SDK changes, for example:

- a new Swift SDK API that the React Native iOS bridge calls
- a new Android SDK API that the React Native Android bridge calls
- generated protocol/model changes under `protocol/languages/kotlin/` that the React Native module consumes through Android
- any change in `platforms/swift/`, `platforms/android/`, or `protocol/languages/kotlin/` that has not yet been released and consumed through normal dependency versions

Re-run the relevant local workflow whenever `platforms/swift/`, `platforms/android/`, or `protocol/languages/kotlin/` changes, because the React Native sample/tests need to re-resolve those local native SDK sources/artifacts.

```bash
# iOS sample using local platforms/swift sources
dev rn ios --local

# Android sample using local Android and Kotlin protocol artifacts via Maven Local
dev rn android --local

# React Native Android unit tests using local Android and Kotlin protocol artifacts via Maven Local
# `dev rn test android` publishes the Android SDK artifacts to ~/.m2 first, then runs the RN module tests.
dev rn test android
```

For ad-hoc Android Gradle test commands, publish the local Android SDK first and set `USE_LOCAL_SDK=1` so the React Native sample resolves the local `com.shopify:checkout-kit` and `com.shopify:embedded-checkout-protocol` artifacts from Maven Local:

```bash
cd platforms/react-native
USE_LOCAL_SDK=1 ./scripts/publish_android_snapshot
cd sample/android
USE_LOCAL_SDK=1 ./gradlew :shopify_checkout-kit-react-native:testDebugUnitTest
```

The React Native Android sample uses exclusive Maven Local resolution for those two `com.shopify` modules when `USE_LOCAL_SDK=1`. Keep that filtering in the sample Gradle build; duplicating exclusive repository filters for the same modules elsewhere can break dependency resolution.

## Sensitive configuration

Treat storefront environment and generated sample app configuration values as
sensitive. Never print, commit, paste, or document real values from `.env`,
generated platform config, access tokens, merchant identifiers, shop IDs,
account IDs. Use synthetic placeholders for docs and
verification.
