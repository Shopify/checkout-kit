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

## Direct Maestro Swift workflow

The `e2e-maestro-swift-ios` workflow builds the Swift sample for the
Bitrise iOS simulator and runs every flow enabled for `swift-ios` in
`e2e/config/matrix.yml` using the pinned Maestro CLI and existing local E2E
runner. This covers launch, checkout presentation and dismissal, guest checkout,
buyer identity checkout, and native preload reuse.

It uses the existing encrypted E2E storefront configuration and requires the
`EJSON_PRIVATE_KEY` Bitrise secret. Signing and BrowserStack credentials are not
needed. The checkout flows submit test orders using the E2E store's test gateway.

The workflow sets `E2E_JUNIT_REPORT` to generate a JUnit report, exports its
results to Bitrise's **Tests** tab, and uploads the Maestro output directory as
a compressed artifact. It sets `E2E_MAESTRO_TEST_RETRIES=2` to rerun only failed
flows up to twice (three attempts total). Tests that recover are named
`(passed on retry 1)` or `(passed on retry 2)` in the Tests tab; the artifact retains each attempt's JUnit
report and Maestro diagnostics. The workflow installs pinned REXML 3.4.4 for
report merging. Local runs still default to no whole-flow retries.

Select this workflow and the PR branch in Bitrise's **Start build** screen.
The required `e2e` pipeline also runs it when the matrix selects Swift.

The pinned Maestro distribution is cached by OS, architecture, and the checksum
of `e2e/.maestro-version`. Each run verifies the restored CLI version before
using it and installs the pin if the cache is absent or invalid.

## Direct Maestro Android workflow

The `e2e-maestro-kotlin-android` workflow builds the Kotlin sample and runs
all five enabled flows on a Linux worker with a Pixel 7 x86_64 emulator running
Android API 35. It shares Maestro installation, two failed-flow retries, JUnit
export, and diagnostic artifacts with the Swift workflow. The existing
`EJSON_PRIVATE_KEY` secret configures the test storefront.

`run_bitrise_maestro` installs the built app on the workflow's selected device.
It calls `run_local_e2e --skip-build` to keep matrix selection in one place and
avoid rebuilding the app or starting Metro for a packaged React Native app.

## Direct Maestro React Native Android workflow

The `e2e-maestro-react-native-android` workflow uses the same Android API
35 emulator and reporting as Kotlin, running the four shared checkout/launch
flows enabled for React Native. It builds `assembleE2e` with bundled JavaScript
and x86_64 native libraries, so no Metro server is needed. Published native SDKs
remain the default. Physical-device APK builds still default to arm64-v8a.

## Direct Maestro React Native iOS workflow

The `e2e-maestro-react-native-ios` workflow runs all four enabled React
Native flows on the same iOS simulator as Swift. It reuses the Node, Ruby, and
CocoaPods caches and builds the Release simulator app with bundled JavaScript.
`E2E_IOS_SIMULATOR_ONLY=1` skips the device IPA archive and signing; existing
BrowserStack and distribution builds retain their device build behavior.

## Pipeline

The `e2e` pipeline is defined in `e2e/bitrise.yml`, and the Bitrise app reads its configuration directly from that repository path:

```text
e2e/bitrise.yml
```

The pipeline runs `e2e-plan`, the selected `e2e-maestro-*` workflows in parallel, and an always-run `e2e-report`. Each target builds, installs, runs Maestro, and exports its JUnit results on the same host.

Default stacks and machine types live in `e2e/bitrise.yml`; workflows run on Linux unless they require macOS-specific tooling.

Validate the configuration locally with:

```bash
bitrise validate -c e2e/bitrise.yml
```

## PR and manual runs

The `e2e` pipeline defines a target-based pull request trigger in `e2e/bitrise.yml` with no `changed_files` filter. The `ci/bitrise/e2e/pr` pipeline check is required for merging, so every non-draft pull request must start the pipeline and receive a result, including changes limited to docs or GitHub workflows. Target-based triggers are defined on each pipeline so one pull request can start both `e2e` and `ci-ios`; the legacy project-level `trigger_map` starts only its first match and must not be restored.

Shared changed-file filter groups live in `.ci/changed-file-filters.yml` and are consumed by both GitHub Actions and Bitrise E2E. Each application in `e2e/config/matrix.yml` declares `changed_files_filters` by shared group name. The run-plan producer fetches the PR file list from GitHub, applies those groups, publishes selected application IDs, and shares `E2E_RUN_*` variables that gate the direct Maestro workflows with `run_if`. The plan checks that every selected workflow exists in the branch pipeline before publishing its readiness flag.

Changes that select no applications run only the lightweight `e2e-plan` and `e2e-report` workflows. An explicit empty plan succeeds. A missing or failed planner, invalid selection, or selected workflow that did not succeed fails the report. This also applies to manual pipeline runs, which skip GitHub posting but still fail if results are incomplete.

For example, `platforms/react-native/README.md` is excluded by the Markdown filters, and `.github/workflows/rn-test.yml` does not select an E2E application. Both changes start the planner and finish successfully without allocating app build machines or test devices. The runtime filters make the per-application decision after the required pipeline starts.

A manually started pipeline has no pull request file list, so it selects every application in the E2E matrix. Choose the branch and `e2e` pipeline from the Bitrise **Start build** page to run the complete E2E suite against that branch. No push trigger is configured, so merging to `main` does not automatically start this pipeline.

## The `ci-ios` pipeline

`ci-ios` is the second pipeline in `e2e/bitrise.yml`. It runs the four macOS jobs that used to run on GitHub Actions: the Swift package tests, the Swift sample build and test, the React Native iOS sample build, and the React Native iOS tests. Bitrise reports one status per pipeline, so keeping it separate from `e2e` gives macOS CI and Maestro E2E their own results.

### Its trigger carries no `changed_files`

Like `e2e`, the `ci-ios` target-based pull request trigger has no file filter. `ci-ios` is a merge-blocking check, and a required check that never posts leaves a pull request permanently unmergeable — so the pipeline has to start on every non-draft pull request, including a docs-only one.

Selection happens inside the pipeline instead. The Linux `ci-ios-plan` workflow reads the pull request's changed files, applies the shared filter groups in `.ci/changed-file-filters.yml` through `e2e/config/ios_ci.yml`, and publishes one `CI_IOS_*` variable per job with `share-pipeline-variable`. Each macOS workflow guards on its own variable with `run_if`. A change that needs no macOS job runs the Linux plan and the report, and nothing else.

Both required pipelines start on every non-draft pull request and select their work at runtime.

A manually started `ci-ios` pipeline selects all four macOS jobs. Choose the branch and `ci-ios` pipeline from the Bitrise **Start build** page to verify the complete iOS build and test suite. Like `e2e`, `ci-ios` has no push trigger and does not run automatically after a merge to `main`.

### The check is self-posted

`ci-ios-report` runs with `should_always_run: workflow` and posts the `Checkout Kit iOS` Check Run itself, through `e2e/scripts/report_ios_ci_results`. Bitrise's own pipeline status cannot tell the two kinds of not-run apart:

- a job the plan did not select is a **pass** — there was nothing to build
- a job the plan did select but that never finished is a **failure**

The reporter also fails when `ci-ios-plan` itself fails, rather than reporting green off an empty selection. `e2e/test/ios_ci_reporter_test.rb` pins all three cases.

### Changing which files select which job

Edit `e2e/config/ios_ci.yml`, not the workflows. `e2e/test/ios_ci_run_plan_test.rb` asserts set equality between the variables the plan emits and the `run_if` expressions parsed out of `e2e/bitrise.yml`, so a job added on one side and not the other fails the Ruby tests.

## Duplicate PR build cancellation

Duplicate in-progress PR pipelines are cancelled by Bitrise native Rolling builds rather than a repo-owned cancellation script. Under **Project settings > Builds > Build strategy**, **Abort builds triggered by pull requests** and **Abort running builds** are enabled, so a newer PR build cancels the older one.

## Nightly release pipelines

Nightly pipelines distribute the sample apps from the same E2E test storefront the PR pipeline uses, so they need no storefront configuration of their own.

| Pipeline                              | App                                                     | Destination                         |
| ------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `nightly-swift-ios-testflight`        | `CheckoutKitSwiftDemo`                                  | TestFlight                          |
| `nightly-react-native-ios-testflight` | `CheckoutKitReactNativeDemo`                            | TestFlight                          |
| `nightly-android-bitrise-installs`    | `CheckoutKitAndroidDemo`, `CheckoutKitReactNativeDemo`  | Bitrise install pages sent to Slack |

These pipelines deliberately define no target-based triggers, so no code event starts them. Create a daily **scheduled build** under **Project settings > Scheduled builds**, targeting `main` and selecting the pipeline. The schedule is the one part of this design that Bitrise keeps outside the repository.

### Commit age gate

Every nightly pipeline starts with `nightly-decide-should-build`, which runs on the default Linux stack and publishes `NIGHTLY_SHOULD_BUILD`. The distribution workflows are gated on it with `run_if`, so a night with no new commits never boots an app build machine and never consumes a store build number.

The gate asks whether HEAD was committed inside `NIGHTLY_COMMIT_WINDOW`, which defaults to `24 hours`. **Keep this window equal to the schedule interval.** A window shorter than the interval skips commits, and a longer one re-uploads work that already shipped.

### Build numbers

The iOS build number is `$BITRISE_BUILD_NUMBER`, injected as an `xcodebuild` build-setting override. No committed file changes value, so nothing has to be bumped by hand and no two uploads can collide.

This only works because each sample binds `CFBundleVersion` to `$(CURRENT_PROJECT_VERSION)` rather than to a literal. `CheckoutKitSwiftDemo` binds it in its XcodeGen spec, and `CheckoutKitReactNativeDemo` binds it in its committed `Info.plist`. Without that binding the literal wins, the override is silently discarded, and App Store Connect rejects every upload after the first. Both build scripts call `e2e_assert_archived_build_number`, which re-reads the archived plist and fails the build if the number did not land.

### iOS signing

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

### Android Bitrise installs and Slack

`nightly-android-bitrise-installs` builds the existing Kotlin debug and React Native E2E APKs in parallel. Both variants are already signed for internal testing. `deploy-to-bitrise-io@2` uploads each APK with its public page disabled, creating an SSO-protected installable-artifact page whose Install action presents the Bitrise QR code.

After each upload, `slack@4.3.0` posts an Install button to channel `C069N25R7EH`. It authenticates as Bitrise Bot with `$SLACK_AUTH_TOKEN`, a protected workspace-shared Bitrise secret available to Shopify projects. Do not add a Slack token or webhook to this repository or to app-level environment variables.

## Required app environment variables

Direct workflows share `E2E_MAESTRO_TEST_RETRIES=2` and `E2E_JUNIT_REPORT` in `e2e/bitrise.yml`. The following BrowserStack defaults remain under `app.envs` for the optional real-device pipeline; they do not configure the direct workflows.

| Variable                           | Value  | Purpose                                           |
| ---------------------------------- | ------ | ------------------------------------------------- |
| `E2E_BROWSERSTACK_API_RETRIES`     | `1`    | Retries for transient BrowserStack API responses. |
| `E2E_BROWSERSTACK_TEST_RETRIES`    | `1`    | Retries per failed Maestro flow (0 disables, maximum 5). |
| `E2E_BROWSERSTACK_TIMEOUT_SECONDS` | `1800` | BrowserStack build timeout.                       |
| `E2E_BROWSERSTACK_POLL_SECONDS`    | `30`   | BrowserStack status polling interval.             |

Each workflow's main `script` step sets its own wall-clock budget with the Bitrise `timeout` and `no_output_timeout` step properties instead of wrapping individual commands.

BrowserStack remains a supported, optional real-device path after the cutover.
The `e2e-browserstack` pipeline reuses the signed artifact builds and BrowserStack
credentials. It has no automatic triggers and is separate from the required
`e2e` pipeline.

## Encrypted storefront configuration

Storefront values live encrypted in this repository under `config/secrets`, so
Bitrise holds one secret instead of a list that can drift from what the build
reads.

| Secret | Purpose |
| --- | --- |
| `EJSON_PRIVATE_KEY` | Decrypts `config/secrets/demo.ejson` and `config/secrets/e2e.ejson`. |

Create the secret with both **Expose for pull requests** and **Protected** enabled.
Because exposure also reaches fork builds, keep **Project settings > Builds >
Manual approval** enabled so a Shopify admin must approve an outside contribution
before any step can access the key.

`e2e/scripts/bitrise_ci_helpers` requires the pinned `ejson2env` version. It
warns and installs the pin if another version is present, verifies the archive
against a checksum committed in the helper, writes the key into `EJSON_KEYDIR`,
and runs `scripts/generate_env_files`. That generates `.env` and `e2e/.env`;
neither the key nor decrypted values enter an argument list or build log.

Both committed EJSON files must use the same keypair because one Bitrise secret
cannot hold two private keys. To change a value, run `dev secrets edit demo` or
`dev secrets edit e2e` and commit the encrypted file.

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

## Optional BrowserStack real-device pipeline

In Bitrise, choose **Start build**, select the branch, and choose the
`e2e-browserstack` pipeline. A manual branch run selects all applications in the
existing matrix, builds device artifacts, runs Maestro on BrowserStack, and
collects the results. No revert or change to the default pipeline is needed.

The always-run `e2e-browserstack-report` workflow saves `browserstack-summary.md`
as a Bitrise artifact and fails when expected results are missing or failed.
It does not publish a GitHub Check Run or update the direct pipeline's sticky PR
comment, even when the manual run is associated with a PR. Its pipeline status
uses the separate `ci/bitrise/e2e-browserstack/<event_type>` name.

Keep this path for hardware-dependent coverage and future Apple Pay work. Apple
Pay is not enabled by this pipeline: BrowserStack documents Apple Pay automation
for [Appium](https://www.browserstack.com/docs/app-automate/appium/apple-pay),
including signing requirements. Confirm Maestro-specific support and device
provisioning before adding those tests. The default Bitrise jobs use simulators
and emulators; Bitrise's separate
[Firebase integration](https://docs.bitrise.io/en/bitrise-ci/testing/device-testing-with-firebase/device-testing-for-ios)
runs XCTest on physical iOS devices.


The `e2e-execute-browserstack-run` workflow resolves the Bitrise parallel index into a BrowserStack run plan row, resolves a BrowserStack device dynamically, uploads the app artifact and E2E tests zip, executes the selected flow, and stores raw plus normalized result JSON as artifacts.

Failed flows retry once by default on both Android and iOS using BrowserStack's
[automatic reruns](https://www.browserstack.com/docs/app-automate/maestro/set-up-test-env/auto-rerun-failures).
Retries run within the same BrowserStack build and share its timeout. BrowserStack
marks flows that pass on retry as flaky and retains every attempt's logs in its
dashboard. Set `E2E_BROWSERSTACK_TEST_RETRIES=0` to disable test retries.

The launch smoke suite sends only non-sensitive Maestro environment values to BrowserStack:

- `E2E_APP_ID`
- `E2E_READY_MARKER`

Do not pass storefront tokens or customer data through BrowserStack Maestro environment variables without explicit review, because those values are visible in BrowserStack dashboards.

## GitHub reporting

For pull request builds, the `e2e-report` workflow creates the `Checkout Kit E2E` Check Run and sticky PR comments using the short-lived token generated by the Bitrise GitHub App. Manual branch builds have no pull request to update, so both E2E and iOS reporting workflows skip GitHub reporting without requiring a token.

The Bitrise project has **Project settings > Repository > Extend GitHub App permissions to builds** enabled. Bitrise exposes the build-scoped GitHub App token as `GIT_HTTP_PASSWORD`. GitHub API scripts prefer an explicit `OVERRIDE_GITHUB_TOKEN` for local runs and otherwise use `GIT_HTTP_PASSWORD`; they intentionally ignore the shared `GITHUB_TOKEN` because it is not authenticated as the GitHub App required to create Check Runs.

The sticky PR comment ends with a **Bitrise** footer linking to the
`e2e` and `ci-ios` pipelines. The E2E link comes from the reporting pipeline's
`BITRISEIO_PIPELINE_BUILD_URL`; other links are read from native Bitrise GitHub
checks on the reported commit. Queued and running builds can be linked without
waiting for them to finish. If a check has not appeared or the lookup fails, the
comment still publishes with the available links.

Every run maintains a single sticky PR comment (create-or-update via a marker).
The comment starts with the overall result and the number of selected targets
that passed, followed by one table with readable target names, outcomes, **Tests**
and build links, and platform-specific Tophat links under **Install from branch**.
Failed or missing selected workflows appear before passing and skipped targets.
An empty selection is reported as **E2E not needed**; invalid selection metadata
is reported as a failure without install links. The commit SHA is not displayed.

The existing `e2e-build-*` workflows remain available for Tophat to build signed
device artifacts on demand; direct simulator runs do not produce signed IPAs.
Install links resolve the branch rather than a fixed tested build. iOS rows
offer both device and simulator recipes, while Android rows offer only Android
recipes. The install links and Quick Launch entries are driven by
`scripts/tophat/targets.json`; see the Tophat section in `.github/CONTRIBUTING.md`.

## Caching

React Native Android E2E builds use the released native Maven artifact versions declared by the React Native sample and module configuration. Do not pass the React Native `--local` flag or set local native SDK override environment variables for these builds.

The pipeline uses Bitrise cache steps for key-based pnpm/CocoaPods/Gradle cache paths.

Do not add `activate-build-cache-for-xcode` or `activate-build-cache-for-gradle`; the Bitrise Build Cache add-on is disabled for Shopify Bitrise apps.

Ruby and Node versions are pinned in `e2e/bitrise.yml` via the Bitrise `tools:` configuration (`ruby: "3.4:installed"`, `nodejs: 22.14.0`), which Bitrise installs before each workflow runs. The `:installed` suffix tells each stack to use its own preinstalled 3.4.x rather than compiling one from source. Pin exact versions that the target stacks preinstall so setup stays fast and reproducible; a version the stack does not ship is installed on demand and is slower. pnpm is pinned separately through Corepack via the `packageManager` field in `platforms/react-native/package.json`.
