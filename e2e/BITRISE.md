# Bitrise E2E Pipeline

Checkout Kit E2E tests run in Bitrise through the `e2e` pipeline, with this app-level setup.

## Bitrise app

The pipeline runs on the allocated Bitrise app, connected to the Checkout Kit repository:

- Bitrise app: https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76
- Repository: `Shopify/checkout-kit`

Useful Bitrise app URLs:

| Area | URL |
|---|---|
| App overview | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76 |
| Workflow/config editor | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/workflow |
| Secrets/env vars | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/secrets |
| Code signing | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/codesigning |
| Build triggers | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/triggers |
| Start build | https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/start |

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

## Required app environment variables

The non-secret E2E defaults live in `e2e/bitrise.yml` under `app.envs`. Change them in this repository rather than in the Bitrise Workflow Editor.

| Variable | Value | Purpose |
|---|---|---|
| `E2E_STRICT` | `false` | Soft/hard failure switch for BrowserStack Maestro runs. |
| `E2E_BROWSERSTACK_API_RETRIES` | `1` | Retries for transient BrowserStack API responses. |
| `E2E_BROWSERSTACK_TIMEOUT_SECONDS` | `1800` | BrowserStack build timeout. |
| `E2E_BROWSERSTACK_POLL_SECONDS` | `30` | BrowserStack status polling interval. |

Each workflow's main `script` step sets its own wall-clock budget with the Bitrise `timeout` and `no_output_timeout` step properties instead of wrapping individual commands.

The `e2e-execute-browserstack-run` workflow fans out one parallel copy per BrowserStack run plan row. The `e2e-produce-browserstack-run-plan` workflow derives this count with `ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan count` and publishes it as `E2E_BROWSERSTACK_RUN_PLAN_COUNT`, which the `e2e-execute-browserstack-run` `parallel` field reads, so it never needs manual alignment.

## Storefront secrets

These secrets are configured in Bitrise.io; they cannot live in the repository. `scripts/setup_storefront_env` reads them to configure the sample app before builds.

| Secret | Purpose |
|---|---|
| `STOREFRONT_DOMAIN` | Storefront domain for sample app builds. |
| `STOREFRONT_ACCESS_TOKEN` | Storefront access token for sample app builds. |

## Code signing

React Native iOS IPA generation uses Bitrise's certificate and profile installer before running `xcodebuild archive` and `xcodebuild -exportArchive`.

The React Native iOS artifact workflow overrides the default Linux stack and runs on `osx-xcode-26.2.x` with `g2.mac.4large`, because it requires Xcode and iOS signing. Its cache keys are prefixed with `rn-ios-macos-` so macOS caches cannot restore Linux-built dependencies.

Upload the signing certificate and provisioning profile for the React Native sample app to the Bitrise app; the iOS artifact workflow installs them before archiving. The iOS build reads the following signing values with the defaults shown, and each can be overridden with a matching Bitrise environment variable:

| Variable | Default | Purpose |
|---|---|---|
| `E2E_IOS_EXPORT_METHOD` | `development` | Export method for the React Native iOS IPA. |
| `E2E_IOS_BUNDLE_ID` | `com.shopify.checkoutkit.reactnativedemo` | Bundle identifier used for iOS archive and export signing. |
| `E2E_IOS_DEVELOPMENT_TEAM` | `A7XGC83MZE` | Apple development team used for iOS archive signing. |
| `E2E_IOS_CODE_SIGN_IDENTITY` | `Apple Development` | Code signing identity used for iOS archive and export signing. |
| `E2E_IOS_PROVISIONING_PROFILE_SPECIFIER` | `bitrise-checkout-kit-e2e` | Provisioning profile specifier installed by Bitrise and passed to `xcodebuild`; override it if the Bitrise-installed profile uses a different name. |

## Caching

React Native Android E2E builds use the released native Maven artifact versions declared by the React Native sample and module configuration. Do not pass the React Native `--local` flag or set local native SDK override environment variables for these builds.

The pipeline uses Bitrise cache steps for key-based pnpm/CocoaPods/Gradle cache paths.

Do not add `activate-build-cache-for-xcode` or `activate-build-cache-for-gradle`; the Bitrise Build Cache add-on is disabled for Shopify Bitrise apps.

Ruby and Node versions are pinned in `e2e/bitrise.yml` via the Bitrise `tools:` configuration (`ruby: 3.3.6`, `nodejs: 22.14.0`), which Bitrise installs before each workflow runs. Pin exact versions that the target stacks preinstall so setup stays fast and reproducible; a version the stack does not ship is installed on demand and is slower. pnpm is pinned separately through Corepack via the `packageManager` field in `platforms/react-native/package.json`.
