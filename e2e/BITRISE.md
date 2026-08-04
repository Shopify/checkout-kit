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

Every storefront value lives encrypted in this repository under `config/secrets`, so Bitrise holds one secret instead of a list that drifts from what the suite actually reads.

| Secret               | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `EJSON_PRIVATE_KEY`  | Decrypts `config/secrets/demo.ejson` and `config/secrets/e2e.ejson`. |

The secret is created with both **Expose for pull requests** and **Protected** enabled.

The `e2e` pipeline triggers only on pull requests, so without exposure the key never arrives and no run reaches a store. Bitrise offers no middle setting: a secret is available to every pull request build or to none, including builds from forks.

Protected hides the value and blocks edits, so rotation means deleting the secret and creating it again. Set both flags at creation time. Exposure cannot be enabled later on a protected secret.

Because exposure reaches fork builds too, the control that keeps the key away from outside contributors is **Project settings > Builds > Manual approval**, not the exposure flag. A fork pull request waits for a Shopify admin before any step runs. Keep that toggle on.

`e2e/scripts/bitrise_ci_helpers` installs a pinned `ejson2env`, writes the key into a keydir, and runs `scripts/generate_env_files`. That produces `.env` for the sample app builds and `e2e/.env` for the Maestro suite. Both are gitignored, and neither the key nor any decrypted value ever enters an argument list or the build log.

To change a value, run `dev secrets edit e2e` (or `demo`) and commit the file. Rotating the key means updating this secret and the GCP secret named after the public key. Both `.ejson` files must stay encrypted against the same keypair, because one Bitrise secret cannot hold two private keys; `bitrise_ci_helpers` fails with that message rather than a bare decrypt error.

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
- `E2E_CONTROL_LINK`

Do not pass storefront tokens or customer data through BrowserStack Maestro environment variables without explicit review, because those values are visible in BrowserStack dashboards.

## Account journey values

The account journey signs a test customer in, so it needs three more values. All three come out of `config/secrets/e2e.ejson`, not the Bitrise secrets list.

| Variable                     | Where it is used                 | Purpose                                                               |
| ---------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `E2E_CUSTOMER_ACCOUNT_EMAIL` | Maestro environment              | Address the sign-in flow types on the hosted login page.              |
| `E2E_CUSTOMER_ACCOUNT_CODE`  | Maestro environment              | Verification code the sign-in flow types.                             |
| `CUSTOM_USER_AGENT`          | Sample app build, through `.env` | Marks the login web view as a test client. The code fails without it. |

The first two are a reviewed exception to the rule above, because the BrowserStack dashboard is private to this organization. `e2e_export_e2e_credentials` puts them into the environment `e2e/scripts/execute_browserstack_run` reads; `e2e/scripts/run_maestro` reads them from `e2e/.env` for a local run.

A run with these values blank skips the account tests instead of failing, so the rest of the suite still runs. A run with no key at all is a different case: `generate_env_files` writes no `.env`, so the store-backed cart and checkout tests fail rather than skip.

## GitHub reporting

The `e2e-report` workflow creates commit statuses, Check Runs, and sticky PR comments using the short-lived token generated by the Bitrise GitHub App.

The Bitrise project has **Project settings > Repository > Extend GitHub App permissions to builds** enabled. Bitrise exposes the build-scoped GitHub App token as `GIT_HTTP_PASSWORD`; the report workflow maps it to `GITHUB_TOKEN` before running `e2e/scripts/report_e2e_results`.

Every run maintains a single sticky PR comment (create-or-update via a marker). The comment always includes an "Install with Tophat" link per SDK target and the E2E results table; failing runs add direct BrowserStack evidence links. The install links and Quick Launch entries are driven by `scripts/tophat/targets.json`; see the Tophat section in `.github/CONTRIBUTING.md`.

## Caching

React Native Android E2E builds use the released native Maven artifact versions declared by the React Native sample and module configuration. Do not pass the React Native `--local` flag or set local native SDK override environment variables for these builds.

The pipeline uses Bitrise cache steps for key-based pnpm/CocoaPods/Gradle cache paths.

Do not add `activate-build-cache-for-xcode` or `activate-build-cache-for-gradle`; the Bitrise Build Cache add-on is disabled for Shopify Bitrise apps.

Ruby and Node versions are pinned in `e2e/bitrise.yml` via the Bitrise `tools:` configuration (`ruby: 3.3.6`, `nodejs: 22.14.0`), which Bitrise installs before each workflow runs. Pin exact versions that the target stacks preinstall so setup stays fast and reproducible; a version the stack does not ship is installed on demand and is slower. pnpm is pinned separately through Corepack via the `packageManager` field in `platforms/react-native/package.json`.
