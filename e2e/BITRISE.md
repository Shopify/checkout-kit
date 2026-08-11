# Bitrise E2E Pipeline

Checkout Kit E2E tests run in Bitrise through the `e2e` pipeline, with this app-level setup.

## Bitrise app

The pipeline runs on the allocated Bitrise app, connected to the Checkout Kit repository:

- Bitrise app: https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76
- Repository: `Shopify/checkout-kit`

Useful Bitrise app URLs:

| Area                   | URL                                                                         |
| ---------------------- | --------------------------------------------------------------------------- |
| App overview           | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76             |
| Workflow/config editor | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/workflow    |
| Secrets/env vars       | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/secrets     |
| Code signing           | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/codesigning |
| Build triggers         | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/triggers    |
| Start build            | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/start |

If a direct URL does not resolve in the current Bitrise UI, open the app overview and navigate to the matching area from the sidebar.

## Pipeline

The `e2e` pipeline is defined in `e2e/bitrise.yml`, and the Bitrise app reads its configuration directly from that repository path:

```text
e2e/bitrise.yml
```

The pipeline defines the E2E workflow graph and the intermediate artifacts each workflow passes to the next.

Default stacks and machine types live in `e2e/bitrise.yml`; workflows run on Linux unless they require macOS-specific tooling.

Validate the configuration locally with:

```bash
bitrise validate -c e2e/bitrise.yml
```

## PR trigger

`e2e/bitrise.yml` maps pull requests to the `e2e` pipeline with `trigger_map`. The trigger uses Bitrise `changed_files.regex` as a coarse source-tree gate for Checkout Kit platform, protocol, shared filter, package, and E2E paths. Bitrise does not support the same named include/exclude filter objects as GitHub Actions, so `platforms` level filtering is enforced by `e2e/config/matrix.yml` and `e2e/scripts/e2e_matrix_to_browserstack_run_plan` after the pipeline starts (essentially fulfilling the same need that `dorny/paths-filter` holds in GitHub Actions).

Shared changed-file filter groups live in `.ci/changed-file-filters.yml` and are consumed by both GitHub Actions and Bitrise E2E. Each application in `e2e/config/matrix.yml` declares `changed_files_filters` by shared group name. The run-plan producer fetches the PR file list from GitHub, applies those groups, emits only matching application rows into the BrowserStack run plan, and shares `E2E_BUILD_*` variables that gate downstream Bitrise build workflows with `run_if`.

Markdown and `docs/` changes are excluded by the `platforms` level filters at runtime during the `e2e-produce-browserstack-run-plan` workflow. A docs-only change under a coarse Bitrise trigger path can still start the lightweight `e2e-produce-browserstack-run-plan` workflow (~15 seconds runtime), but it will produce an empty run plan and skip app build, BrowserStack execution, and reporting workflows.

For example, editing `platforms/react-native/README.md` matches the coarse `changed_files.regex` (its `platforms/react-native/` prefix), so the `e2e` pipeline triggers — but the runtime `platforms` level filter drops it as a Markdown-only change, so the run plan comes back empty and no build, BrowserStack execution, or reporting runs. This two-layer design is why the coarse regex stays deliberately broad: it only has to be a cheap first pass, and the runtime filter makes the precise per-application decision.

The GitHub checks are kept non-blocking while the suite stabilizes; they become merge-blocking only once the "Checkout Kit E2E" check is marked required in branch protection.

## Duplicate PR build cancellation

Duplicate in-progress PR pipelines are cancelled by Bitrise native Rolling builds rather than a repo-owned cancellation script. Under **Project settings > Builds > Build strategy**, **Abort builds triggered by pull requests** and **Abort running builds** are enabled, so a newer PR build cancels the older one.

## Nightly release pipelines

Nightly pipelines ship the sample apps to the stores from the same E2E test storefront the PR pipeline uses, so they need no storefront configuration of their own.

| Pipeline                              | App                          | Destination         |
| ------------------------------------- | ---------------------------- | ------------------- |
| `nightly-swift-ios-testflight`        | `CheckoutKitSwiftDemo`       | TestFlight          |
| `nightly-react-native-ios-testflight` | `CheckoutKitReactNativeDemo` | TestFlight          |
| `nightly-kotlin-android-play`         | `CheckoutKitAndroidDemo`     | Play internal track |
| `nightly-react-native-android-play`   | `CheckoutKitReactNativeDemo` | Play internal track |

These pipelines are deliberately absent from `trigger_map`, so nothing starts them on a pull request. Create a daily **scheduled build** under **Project settings > Scheduled builds**, targeting `main` and selecting the pipeline. The schedule is the one part of this design that Bitrise keeps outside the repository.

### Commit age gate

Every nightly pipeline starts with `nightly-decide-should-build`, which runs on the default Linux stack and publishes `NIGHTLY_SHOULD_BUILD`. The release workflow is gated on it with `run_if`, so a night with no new commits never boots a build machine and never consumes a store build number.

The gate asks whether HEAD was committed inside `NIGHTLY_COMMIT_WINDOW`, which defaults to `24 hours`. **Keep this window equal to the schedule interval.** A window shorter than the interval skips commits, and a longer one re-uploads work that already shipped.

### Build numbers

Every nightly build numbers itself from `$BITRISE_BUILD_NUMBER`, injected at build time. No committed file changes value, so nothing has to be bumped by hand and no two uploads can collide.

On iOS the value arrives as an `xcodebuild` build-setting override. This only works because each sample binds `CFBundleVersion` to `$(CURRENT_PROJECT_VERSION)` rather than to a literal. `CheckoutKitSwiftDemo` binds it in its XcodeGen spec, and `CheckoutKitReactNativeDemo` binds it in its committed `Info.plist`. Without that binding the literal wins, the override is silently discarded, and App Store Connect rejects every upload after the first. Both build scripts call `e2e_assert_archived_build_number`, which re-reads the archived plist and fails the build if the number did not land.

On Android the value arrives as the Gradle property `-PcheckoutKitVersionCode`, which each `app/build.gradle` reads for its `versionCode`. `CheckoutKitAndroidDemo` also derives its `versionName` from that number; `CheckoutKitReactNativeDemo` keeps the literal `versionName` it already had. Both committed defaults are unchanged, so PR builds and local development are unaffected. Each build script then calls `e2e_assert_android_version_code`, which re-reads the merged manifest and fails the build if the number did not land.

### iOS signing and upload

The nightly iOS build passes its signing arguments explicitly and calls `e2e_reject_ios_signing_overrides` first, because each `E2E_IOS_*` variable in the Code signing table below wins over the matching argument. Do not expose any of them to a nightly workflow; a release build would silently fall back to development signing.

Each nightly iOS workflow names its profile in `NIGHTLY_IOS_PROVISIONING_PROFILE_SPECIFIER`, under that workflow's `envs` in `e2e/bitrise.yml`. The build script has no default and exits if the variable is missing, so a renamed profile fails the build immediately instead of signing with the wrong identity. The variable is workflow-scoped rather than an `app.envs` entry, because each app needs its own profile.

| App                          | Profile                                              | Export method       |
| ---------------------------- | ---------------------------------------------------- | ------------------- |
| `CheckoutKitSwiftDemo`       | `PP-Bitrise-com.shopify.checkoutkit.swiftdemo`       | `app-store-connect` |
| `CheckoutKitReactNativeDemo` | `PP-Bitrise-com.shopify.checkoutkit.reactnativedemo` | `app-store-connect` |

Required Bitrise code signing assets, beyond the E2E development assets:

| Asset                             | Requirement                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Certificate                       | An **Apple Distribution** certificate for team `A7XGC83MZE`. A development certificate cannot sign a store build.           |
| Provisioning profile              | An **App Store** profile for the app's bundle identifier. Development and Ad Hoc profiles both fail at `-exportArchive`.     |
| Profile capabilities              | The profile must carry every entitlement the XcodeGen spec declares, currently Apple Pay and Associated Domains.            |
| App Store Connect connection      | An App Store Connect API key connection on the Bitrise app, so the upload step needs `connection: automatic` and no secret.  |
| App Store Connect app record      | An app record for the bundle identifier. The upload cannot create one.                                                      |

Both iOS samples declare `ITSAppUsesNonExemptEncryption` as `false`, so TestFlight accepts each build without asking for an export compliance answer. Both apps reach the network only through the system HTTPS stack, which is exempt. Remove the key if either app ever adds its own encryption.

### Android signing and upload

Signing stays out of Gradle for both Android apps. Each nightly builds an unsigned bundle, and `sign-apk@2` signs it afterwards. That step reads the keystore already configured on the Bitrise app, so no secret name appears in `e2e/bitrise.yml` and neither sample gains a release signing surface.

The two apps reach that unsigned bundle by different routes, because their `release` build types differ.

| App                          | Task            | Why                                                                                                                                     |
| ---------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CheckoutKitAndroidDemo`     | `bundleRelease` | `buildTypes.release` already declares no `signingConfig` and sets `minifyEnabled false`.                                                 |
| `CheckoutKitReactNativeDemo` | `bundleNightly` | Its `release` type points at `signingConfigs.release` and enables minify, so the nightly needs a build type of its own. See below.        |

The React Native sample declares a `nightly` build type in `platforms/react-native/sample/android/app/build.gradle`. It takes `initWith release`, then sets `signingConfig = null` and `minifyEnabled false`. The explicit `null` matters: `initWith` copies `signingConfigs.release`, which is silently empty unless the four `CHECKOUT_KIT_UPLOAD_*` properties exist, so leaving it in place would make the output depend on properties that CI does not set. `matchingFallbacks = ['release']` keeps dependency resolution on the release variant, the same shape the existing `e2e` build type uses.

The React Native nightly passes `-PreactNativeArchitectures=arm64-v8a` and so ships one architecture. This never changes what a tester downloads, because Play splits the bundle per device; it only shortens the build. The New Architecture compiles its C++ codegen output once per architecture, and every test device is arm64. Add `x86_64` to that list if you need to install a nightly onto an emulator from the Play track. Do not remove `arm64-v8a`; Play requires 64-bit support.

`google-play-deploy@3` then uploads to the `internal` track with `status: completed`. It is passed an empty `mapping_file`, because both builds set `minifyEnabled false` and R8 writes no mapping file; the step default points at one and fails when it is absent.

The internal track is the only track that reaches testers with no manual step. Managed publishing does not cover it, and updates to it are not reviewed, so `status: completed` publishes to the tester list within minutes. The closed track is reviewed on every release, which no daily schedule can absorb.

Two one-time exceptions apply. The app's **first** release is reviewed even on the internal track, and for up to 48 hours it shows a temporary name until that review completes. A release that follows a **rejection** is also reviewed. Every other nightly publishes automatically.

Access is invite-only. A tester needs the opt-in link and a Google account on the tester list, and the app stays out of Play search. The internal track caps at 100 testers.

Both Android samples target API 36. Play requires that level for new apps and for updates from 31 August 2026, and internal testing is not exempt; only permanently private, organisation-restricted apps are. Do not lower either `targetSdkVersion` below 36.

| Asset                    | Requirement                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Keystore                 | A release keystore under **Code signing**. `sign-apk@2` reads the Bitrise keystore variables by default.           |
| Service account key      | The Play service-account JSON in **Generic file storage**, with env key exactly `SERVICE_ACCOUNT_JSON_KEY`.         |
| Service account grant    | The *Release to testing tracks* permission in the Play Console.                                                    |
| Play app record          | One app per package name, each with its **first release uploaded by hand**. The API cannot create a first release. |
| Tester list              | An internal testing tester list, or the upload succeeds and nobody can install it.                                |

`dry_run: "true"` on `google-play-deploy@3` validates the credentials and the app record without publishing. It is optional here, because every run takes a fresh `$BITRISE_BUILD_NUMBER` and no two `versionCode` values can collide.

## Required app environment variables

The non-secret E2E defaults live in `e2e/bitrise.yml` under `app.envs`. Change them in this repository rather than in the Bitrise Workflow Editor.

| Variable                           | Value  | Purpose                                           |
| ---------------------------------- | ------ | ------------------------------------------------- |
| `E2E_BROWSERSTACK_API_RETRIES`     | `1`    | Retries for transient BrowserStack API responses. |
| `E2E_BROWSERSTACK_TIMEOUT_SECONDS` | `1800` | BrowserStack build timeout.                       |
| `E2E_BROWSERSTACK_POLL_SECONDS`    | `30`   | BrowserStack status polling interval.             |

Each workflow's main `script` step sets its own wall-clock budget with the Bitrise `timeout` and `no_output_timeout` step properties instead of wrapping individual commands.

The `e2e-execute-browserstack-run` workflow fans out one parallel copy per BrowserStack run plan row. The `e2e-produce-browserstack-run-plan` workflow derives this count with `ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan count` and publishes it as `E2E_BROWSERSTACK_RUN_PLAN_COUNT`, which the `e2e-execute-browserstack-run` `parallel` field reads, so it never needs manual alignment.

## Storefront secrets

These secrets are configured in Bitrise.io; they cannot live in the repository. `scripts/setup_storefront_env` reads them to configure the sample app before builds.

| Secret                    | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `STOREFRONT_DOMAIN`       | Storefront domain for sample app builds.       |
| `STOREFRONT_ACCESS_TOKEN` | Storefront access token for sample app builds. |

## BrowserStack secrets

The `e2e-execute-browserstack-run` workflow authenticates with BrowserStack using these secrets, configured in Bitrise.io:

| Secret                    | Purpose                      |
| ------------------------- | ---------------------------- |
| `BROWSERSTACK_USERNAME`   | BrowserStack API username.   |
| `BROWSERSTACK_ACCESS_KEY` | BrowserStack API access key. |

BrowserStack artifact links in GitHub reports require access to BrowserStack App Automate. Sign in to [BrowserStack App Automate](https://app-automate.browserstack.com/dashboard/v2/builds) before opening build, video, screenshot, or log links.

## Code signing

React Native iOS IPA generation uses Bitrise's certificate and profile installer before running `xcodebuild archive` and `xcodebuild -exportArchive`.

Upload the signing certificate and provisioning profile for the React Native sample app to the Bitrise app; the iOS artifact workflow installs them before archiving. The iOS build reads the following signing values with the defaults shown, and each can be overridden with a matching Bitrise environment variable:

| Variable                                 | Default                                   | Purpose                                                                                                                                             |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E2E_IOS_EXPORT_METHOD`                  | `development`                             | Export method for the React Native iOS IPA.                                                                                                         |
| `E2E_IOS_BUNDLE_ID`                      | `com.shopify.checkoutkit.reactnativedemo` | Bundle identifier used for iOS archive and export signing.                                                                                          |
| `E2E_IOS_DEVELOPMENT_TEAM`               | `A7XGC83MZE`                              | Apple development team used for iOS archive signing.                                                                                                |
| `E2E_IOS_CODE_SIGN_IDENTITY`             | `Apple Development`                       | Code signing identity used for iOS archive and export signing.                                                                                      |
| `E2E_IOS_PROVISIONING_PROFILE_SPECIFIER` | `bitrise-checkout-kit-e2e`                | Provisioning profile specifier installed by Bitrise and passed to `xcodebuild`; override it if the Bitrise-installed profile uses a different name. |

## BrowserStack execution

The `e2e-execute-browserstack-run` workflow resolves the Bitrise parallel index into a BrowserStack run plan row, resolves a BrowserStack device dynamically, uploads the app artifact and E2E tests zip, executes the selected flow, and stores raw plus normalized result JSON as artifacts.

The launch smoke suite sends only non-sensitive Maestro environment values to BrowserStack:

- `E2E_APP_ID`
- `E2E_READY_MARKER`

Do not pass storefront tokens or customer data through BrowserStack Maestro environment variables without explicit review, because those values are visible in BrowserStack dashboards.

## GitHub reporting

The `e2e-report` workflow creates commit statuses, Check Runs, and sticky PR comments using the short-lived token generated by the Bitrise GitHub App.

The Bitrise project has **Project settings > Repository > Extend GitHub App permissions to builds** enabled. Bitrise exposes the build-scoped GitHub App token as `GIT_HTTP_PASSWORD`; the report workflow maps it to `GITHUB_TOKEN` before running `e2e/scripts/report_e2e_results`.

Every run maintains a single sticky PR comment (create-or-update via a marker). The comment always includes an "Install with Tophat" link per SDK target and the E2E results table; failing runs add direct BrowserStack evidence links. The install links and Quick Launch entries are driven by `scripts/tophat/targets.json`; see the Tophat section in `.github/CONTRIBUTING.md`.

## Caching

React Native Android E2E builds use the released native Maven artifact versions declared by the React Native sample and module configuration. Do not pass the React Native `--local` flag or set local native SDK override environment variables for these builds.

The pipeline uses Bitrise cache steps for key-based pnpm/CocoaPods/Gradle cache paths.

Do not add `activate-build-cache-for-xcode` or `activate-build-cache-for-gradle`; the Bitrise Build Cache add-on is disabled for Shopify Bitrise apps.

Ruby and Node versions are pinned in `e2e/bitrise.yml` via the Bitrise `tools:` configuration (`ruby: 3.3.6`, `nodejs: 22.14.0`), which Bitrise installs before each workflow runs. Pin exact versions that the target stacks preinstall so setup stays fast and reproducible; a version the stack does not ship is installed on demand and is slower. pnpm is pinned separately through Corepack via the `packageManager` field in `platforms/react-native/package.json`.
