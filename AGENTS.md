## Repository layout

```
platforms/
  swift/         # iOS Swift Package and CocoaPods sources
  android/       # Android library and sample apps
  react-native/  # React Native wrapper
protocol/        # cross-platform communication layer based on UCP
e2e/             # cross-platform end-to-end tests
.github/         # workflows, issue templates, CODEOWNERS
```

## React Native development with local native SDK changes

Until the new native SDK libraries have stable released versions, assume React Native validation needs the local native SDK workflow. Use `--local` whenever running the React Native sample or native React Native tests that depend on the in-repo Swift/Kotlin SDKs.

Use the React Native `--local` workflow when you need to test React Native against native SDK changes that exist in this repository but have not been released as a SemVer/CocoaPods/Maven version yet.

This applies when changes are made under:

- `platforms/swift/` — the iOS Swift SDK / CocoaPods sources
- `platforms/android/` — the Android SDK / Maven artifact sources

It does **not** refer to the React Native wrapper platform folders:

- `platforms/react-native/modules/@shopify/checkout-kit-react-native/ios/`
- `platforms/react-native/modules/@shopify/checkout-kit-react-native/android/`

### What `--local` does

- For React Native iOS, `--local` wires CocoaPods to the in-repo `platforms/swift/` sources via a local path instead of a released pod version.
- For React Native Android, `--local` publishes/uses the in-repo `platforms/android/` SDK through Maven Local so Gradle resolves the local SDK artifact instead of a released Maven version.

### When to use it

Use `--local` whenever you are validating React Native behavior that depends on unreleased native SDK changes, for example:

- a new Swift SDK API that the React Native iOS bridge calls
- a new Android SDK API that the React Native Android bridge calls
- generated protocol/model changes under the native SDKs that the React Native module consumes
- any change in `platforms/swift/` or `platforms/android/` that has not yet been released and consumed through normal dependency versions

Re-run the relevant local workflow whenever `platforms/swift/` or `platforms/android/` changes, because the React Native sample/tests need to re-resolve those local native SDK sources/artifacts.

```bash
# iOS sample using local platforms/swift sources
dev rn ios --local

# Android sample using local platforms/android via Maven Local
dev rn android --local

# React Native Android unit tests using local platforms/android via Maven Local
# `dev rn test android` publishes platforms/android/lib to ~/.m2 first, then runs the RN module tests.
dev rn test android
```

For ad-hoc Android Gradle test commands, publish the local Android SDK first and set `USE_LOCAL_SDK=1` so the React Native module resolves `com.shopify:checkout-kit:1.0.0` from Maven Local instead of the unreleased placeholder artifact:

```bash
cd platforms/react-native
USE_LOCAL_SDK=1 ./scripts/publish_android_snapshot
cd sample/android
USE_LOCAL_SDK=1 ./gradlew :shopify_checkout-kit-react-native:testDebugUnitTest
```
