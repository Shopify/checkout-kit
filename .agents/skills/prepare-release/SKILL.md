---
name: prepare-release
description: Prepare Checkout Kit version-bump and release PRs for Swift, Android, Kotlin protocol, React Native, or web, including coordinated native releases and published dependency checks.
---

# Prepare a Checkout Kit release

Use this workflow for the packages the user wants to release. Follow repository
`AGENTS.md` instructions and the relevant platform sections in
[CONTRIBUTING.md](../../../.github/CONTRIBUTING.md). Preparing a version-bump PR
does not itself request publication; invoke release or publish workflows only
when that is included in the user's request.

## Establish the release scope

- Fetch current main and release tags. Use GitHub's published releases to find
  each package's previous release; don't use the most recent tag across all
  platforms or treat a draft release as a published artifact.
- Compare the intended release commit with that package's previous release.
  Include shared protocol and dependency changes when deciding which packages
  need a bump. Report breaking API changes that affect the requested version.
- For Android, compare the Kotlin protocol runtime sources with the exact
  `embedded-checkout-protocol/<embeddedCheckoutProtocolAndroid>` tag pinned in
  the version catalog. Android compiles `api project(':embedded-checkout-protocol')`
  locally but publishes a separate Maven dependency. Passing local tests does
  not prove that the pinned published protocol contains those classes.
- When protocol sources differ, prepare a protocol bump as a prerequisite to
  the Android release. Follow the existing `YYYY.MM.DD.PATCH[-alpha.N]` convention
  (also supporting beta/rc), with the date aligned to the generated Kotlin
  `EmbeddedCheckoutProtocol.SPEC_VERSION`. Don't reuse a published version.

## Update the selected packages

| Package | Version declarations and accompanying references |
| --- | --- |
| Swift | Root `ShopifyCheckoutKit.podspec`, public version in `platforms/swift/Sources/ShopifyCheckoutKit/ShopifyCheckoutKit.swift`, and Swift README install snippets |
| Kotlin protocol | `embeddedCheckoutProtocolAndroid` in `platforms/android/gradle/libs.versions.toml`, and `protocol/languages/kotlin/embedded-checkout-protocol/README.md` |
| Android | `checkoutKitAndroid` in the same catalog, and Android README Gradle/Maven snippets |
| React Native | Module `package.json` version and, when native dependencies change, `checkoutKit.nativeSdkVersions.ios` / `.android` in that file |
| Web | `platforms/web/package.json` version and web README install snippets |

Update the selected packages' entries in the root README package table. Search
for their old versions to find related lockfiles, snapshots, or existing release
notes; inspect matches rather than replacing equal version strings across
unrelated packages. Don't create new version declarations or restore removed
metadata just to satisfy an outdated reference. Regenerate affected API reports
or snapshots with the existing platform commands when their checks require it.

## Respect publication dependencies

1. Publish a changed Kotlin protocol before publishing Android. The release
   workflows run `.github/scripts/check-android-protocol-release`, which requires
   the pinned protocol tag and matching runtime sources/build definitions. The
   Android publish workflow also requires its Maven POM to be available.
2. Publish the native Swift and Android versions before updating React Native's
   native pins. Swift can be released independently of Android/protocol; web
   has its own npm release flow.
3. Verify availability in the actual package registry. For Android, inspect the
   Checkout Kit POM's `com.shopify:embedded-checkout-protocol` dependency, then
   verify that exact protocol version. A GitHub release or successful local
   build alone is insufficient.
4. Run React Native checks against published dependencies, following the root
   AGENTS.md rules for `--local`. When changing iOS pins, regenerate both sample
   and integration-app CocoaPods locks using the published SDK. If artifacts
   aren't available yet, report the prerequisite and keep the dependent PR
   pending.

## Check and deliver the PR

Run `.github/scripts/validate-release-version` for the selected supported
platforms (Swift, Android, Embedded Checkout Protocol, React Native). Web uses
its own checks in `.github/workflows/web-publish.yml`. Use the repository's
shadowenv command prefix for these scripts and platform `dev` commands.

For an Android release, run `.github/scripts/check-android-protocol-release`
after fetching tags. A missing tag means the protocol release is still a
prerequisite; source differences require a new protocol version and release.
Choose further checks based on the changed files: publication metadata for
version bumps, and the relevant API/build/tests for code or dependency changes.

Open or update the requested PR with the actual package/version changes and
publication prerequisites. Follow the user's PR formatting rules and include
the complete dependency-ordered `## Stack` when working on a stack. Report what
was checked and any publication blocker to the user; don't describe artifacts
as published until registry availability has been verified.
