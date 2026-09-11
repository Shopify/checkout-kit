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

## PR and manual runs

The `e2e` pipeline defines an unfiltered target-based pull request trigger in `e2e/bitrise.yml`. It starts on every non-draft pull request so the required `ci/bitrise/e2e/pr` status is always reported. Target-based triggers remain defined independently on `e2e` and `ci-ios`; the legacy project-level `trigger_map` starts only its first match and must not be restored.

Selection happens inside the pipeline. Shared changed-file filter groups live in `.ci/changed-file-filters.yml` and are consumed by both GitHub Actions and Bitrise E2E. Each application in `e2e/config/matrix.yml` declares `changed_files_filters` by shared group name. The Linux `e2e-produce-browserstack-run-plan` workflow fetches the pull request file list, applies those groups, emits only matching application rows, and shares `E2E_BUILD_*` variables that gate downstream app-build workflows.

When no application matches, every app build and BrowserStack workflow is skipped. `e2e-report` still runs and posts a successful **No E2E tests to run** result, so an intentionally empty run plan is distinct from a pipeline that never reported. When tests are selected, any failed or missing result makes both the diagnostic `Checkout Kit E2E` Check Run and the required Bitrise pipeline status fail.

A manually started pipeline has no pull request file list, so it selects every application in the E2E matrix. Choose the branch and `e2e` pipeline from the Bitrise **Start build** page to run the complete E2E suite against that branch. No push trigger is configured, so merging to `main` does not automatically start this pipeline.

## The `ci-ios` pipeline

`ci-ios` is the second pipeline in `e2e/bitrise.yml`. It runs the four macOS jobs that used to run on GitHub Actions: the Swift package tests, the Swift sample build and test, the React Native iOS sample build, and the React Native iOS tests. It is separate from `e2e` rather than a set of extra workflows inside it so each required pipeline reports independently and applies its own changed-file selection.

### Its trigger carries no `changed_files`

Unlike `e2e`, the `ci-ios` target-based pull request trigger has no file filter. `ci-ios` is a merge-blocking check, and a required check that never posts leaves a pull request permanently unmergeable — so the pipeline has to start on every pull request, including a docs-only one.

Selection happens inside the pipeline instead. The Linux `ci-ios-plan` workflow reads the pull request's changed files, applies the shared filter groups in `.ci/changed-file-filters.yml` through `e2e/config/ios_ci.yml`, and publishes one `CI_IOS_*` variable per job with `share-pipeline-variable`. Each macOS workflow guards on its own variable with `run_if`. A change that needs no macOS job runs the Linux plan and the report, and nothing else.

This is the same two-layer idea as `e2e` — a cheap first pass, then a precise runtime decision — with the first layer set to "always".

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

The non-secret E2E defaults live in `e2e/bitrise.yml` under `app.envs`. Change them in this repository rather than in the Bitrise Workflow Editor.

| Variable                           | Value  | Purpose                                           |
| ---------------------------------- | ------ | ------------------------------------------------- |
| `E2E_BROWSERSTACK_API_RETRIES`     | `1`    | Retries for transient BrowserStack API responses. |
| `E2E_BROWSERSTACK_TIMEOUT_SECONDS` | `1800` | BrowserStack build timeout.                       |
| `E2E_BROWSERSTACK_POLL_SECONDS`    | `30`   | BrowserStack status polling interval.             |

Each workflow's main `script` step sets its own wall-clock budget with the Bitrise `timeout` and `no_output_timeout` step properties instead of wrapping individual commands.

The `e2e-execute-browserstack-run` workflow fans out one parallel copy per BrowserStack run plan row. The `e2e-produce-browserstack-run-plan` workflow derives this count with `ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan count` and publishes it as `E2E_BROWSERSTACK_RUN_PLAN_COUNT`, which the `e2e-execute-browserstack-run` `parallel` field reads, so it never needs manual alignment.

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

## BrowserStack execution

The `e2e-execute-browserstack-run` workflow resolves the Bitrise parallel index into a BrowserStack run plan row, resolves a BrowserStack device dynamically, uploads the app artifact and E2E tests zip, executes the selected flow, and stores raw plus normalized result JSON as artifacts.

The launch smoke suite sends only non-sensitive Maestro environment values to BrowserStack:

- `E2E_APP_ID`
- `E2E_READY_MARKER`

Do not pass storefront tokens or customer data through BrowserStack Maestro environment variables without explicit review, because those values are visible in BrowserStack dashboards.

## GitHub reporting

For pull request builds, Bitrise reports the required `ci/bitrise/e2e/pr` pipeline status, while `e2e-report` creates the diagnostic `Checkout Kit E2E` Check Run and sticky PR comment using the short-lived token generated by the Bitrise GitHub App. A failed diagnostic report exits nonzero after publishing, keeping the required pipeline status aligned with the reported E2E result. Manual branch builds have no pull request to update, so both E2E and iOS reporting workflows skip GitHub reporting without requiring a token.

The Bitrise project has **Project settings > Repository > Extend GitHub App permissions to builds** enabled. Bitrise exposes the build-scoped GitHub App token as `GIT_HTTP_PASSWORD`. GitHub API scripts prefer an explicit `OVERRIDE_GITHUB_TOKEN` for local runs and otherwise use `GIT_HTTP_PASSWORD`; they intentionally ignore the shared `GITHUB_TOKEN` because it is not authenticated as the GitHub App required to create Check Runs.

Every run maintains a single sticky PR comment (create-or-update via a marker). An empty run plan reports that no E2E tests were needed. Selected runs include an "Install with Tophat" link per produced SDK target and the E2E results table; failing runs add direct BrowserStack evidence links. The install links and Quick Launch entries are driven by `scripts/tophat/targets.json`; see the Tophat section in `.github/CONTRIBUTING.md`.

## Caching

React Native Android E2E builds use the released native Maven artifact versions declared by the React Native sample and module configuration. Do not pass the React Native `--local` flag or set local native SDK override environment variables for these builds.

The pipeline uses Bitrise cache steps for key-based pnpm/CocoaPods/Gradle cache paths.

Do not add `activate-build-cache-for-xcode` or `activate-build-cache-for-gradle`; the Bitrise Build Cache add-on is disabled for Shopify Bitrise apps.

Ruby and Node versions are pinned in `e2e/bitrise.yml` via the Bitrise `tools:` configuration (`ruby: "3.4:installed"`, `nodejs: 22.14.0`), which Bitrise installs before each workflow runs. The `:installed` suffix tells each stack to use its own preinstalled 3.4.x rather than compiling one from source. Pin exact versions that the target stacks preinstall so setup stays fast and reproducible; a version the stack does not ship is installed on demand and is slower. pnpm is pinned separately through Corepack via the `packageManager` field in `platforms/react-native/package.json`.
