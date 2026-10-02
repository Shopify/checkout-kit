# Release

The `@shopify/checkout-kit-react-native` module is published to npm with public
access. Its Android wrapper consumes the published `com.shopify:checkout-kit`
artifact, which in turn depends on `com.shopify:embedded-checkout-protocol` (ECP).

## Publish dependencies before their consumers

For a change spanning the Android dependency chain, the release order is:

```text
ECP → Android Kit → React Native
```

Follow the repository's [coordinated release process](../../../../.github/CONTRIBUTING.md#coordinating-ecp-android-and-react-native-releases)
to publish ECP and then Android Kit. Wait for each required Maven Central artifact
and its metadata to be available before running the next package's normal CI.
Creating a GitHub release does not by itself mean the artifact is ready to resolve.

Only release dependencies that need changes. An RN-only fix can keep its existing
native SDK pins. An Android-only fix can keep its existing ECP pin. If RN also
needs a new Swift API, publish that SDK to CocoaPods before updating the iOS pin;
an Android change does not require a new Swift release.

This ordering lets each package test the published dependencies its consumers
will resolve. Missing native API becomes a build failure before RN ships, and
each dependency update is explicit and reviewable. ECP remains a normal transitive
dependency, so RN needs no separate ECP pin or bundled copy of the protocol.
The tradeoff is waiting for upstream releases and rerunning downstream CI.

## Prepare the RN release

1. After the required native artifacts are published, update the relevant
   `checkoutKit.nativeSdkVersions.android` and/or `.ios` entry in
   `modules/@shopify/checkout-kit-react-native/package.json`. These are dependency
   versions; they do not have to match the RN package version.
2. Make the wrapper changes, bump the manifest's own `version`, and update the
   public API report with `dev rn api dump` if the API changed.
3. Run normal checks against published dependencies, including `dev rn test android`.
   Require the [RN Android test workflow](https://github.com/Shopify/checkout-kit/actions/workflows/rn-test-android.yml)
   and [Android sample build](https://github.com/Shopify/checkout-kit/actions/workflows/rn-build-android.yml),
   along with the other required RN CI checks, to pass before merging. Run these
   without `--local` or `USE_LOCAL_SDK=1`.
4. Merge the release PR to `main`, then run the
   [Release package workflow](https://github.com/Shopify/checkout-kit/actions/workflows/release.yml)
   with `React Native` selected.

Supported release versions are:

- Stable: `X.Y.Z`
- Prerelease: `X.Y.Z-{alpha|beta|rc}.N`

The release workflow reads the version from
`modules/@shopify/checkout-kit-react-native/package.json`, validates it, and
creates the correctly namespaced `react-native/` tag (for example,
`react-native/4.0.1`). The manually entered workflow version is only a safety
check; it must match the package version exactly.

Select `Dry run` on the first run to review the planned tag without creating a
release. Rerun with `Draft release` to create a draft GitHub Release with
generated release notes for human review; publish the draft release when ready to
start the React Native publish workflow.

The publish workflow cleans and builds the JavaScript module, inspects the npm
tarball, and publishes it. It does not build or test the Android wrapper again:
passing the native CI checks against the published SDK before release is essential.

You can follow the publish action process via
https://github.com/Shopify/checkout-kit/actions/workflows/rn-publish.yml.

## Develop ahead of a native release

Use `dev rn test android --local` or `dev rn android --local` for early integration
on an unmerged branch. These commands publish the in-repo Kit and ECP to Maven
Local. On that branch, the RN manifest's `checkoutKit.nativeSdkVersions.android`
must match `checkoutKitAndroid` in `platforms/android/gradle/libs.versions.toml`
so Gradle selects the artifact just built. Run the local command again after
changing native source.

This allows a stack of ECP, Android, and RN changes to be developed together.
Keep the downstream adoption PRs open until their required artifacts are published,
then rerun normal CI. Clear an exported `USE_LOCAL_SDK` before verifying published
dependencies. Local success does not remove the ECP → Android → RN release order.
