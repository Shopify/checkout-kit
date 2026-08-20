# Checkout Kit End-to-End Tests

This directory contains Maestro end-to-end flows and configuration for Checkout
Kit sample apps. Two complementary setups live here:

- **Local** runs, one command per target, that build the sample app, install it on
  the booted device, and run the tests in `tests/`. Tags select which tests run.
- A **CI matrix** that expands applications and OS version tags into BrowserStack
  Maestro run rows. Every row runs the whole `tests/` folder and tags select what
  runs inside it.

Local runs call `scripts/run_local_e2e`, which builds and installs the target
before delegating the Maestro invocation to `scripts/run_maestro`. CI applies the
same environment contract through the BrowserStack run plan.

## Run locally

Run `dev up` first to provision the local toolchain, including the pinned Maestro
version. The runners resolve that version through `scripts/maestro_bin`, so a
separate Maestro installation is not needed.

### One command per target

Boot a simulator or emulator first, because Maestro drives the device the app runs
on. Then run the matching command from the repo root.

| Target | Command |
|---|---|
| Swift iOS | `dev swift e2e` |
| Kotlin Android | `dev android e2e` |
| React Native iOS | `dev rn e2e ios` |
| React Native Android | `dev rn e2e android` |

Each command runs the tests in `tests/shared/` and its target namespace under
`tests/`. Narrow a run with `--tags`:

```bash
dev swift e2e --tags checkout
dev rn e2e ios --tags checkout
dev android e2e --tags launch,checkout
```

Both options match **any** listed tag, because that is how Maestro filters.
`--tags launch,checkout` runs the launch tests and the checkout tests.
`--exclude-tags` skips tests carrying any listed tag. `config.yaml` quarantines
`flaky` and `wip` for every run, so those need no command line option.

### Tags

Every test declares tags from this taxonomy. `e2e/test/maestro_test_tags_test.rb`
enforces it.

| Group | Tags | Rule |
|---|---|---|
| Journey | `launch`, `cart`, `checkout`, `account` | Exactly one per test |
| Cost tier | `smoke`, `full` | Exactly one per test |
| Quarantine | `flaky`, `wip` | Excluded by default, in `config.yaml` |
| Platform capability | `ios-only`, `android-only` | Needs a `# Platform capability:` comment |

A platform tag marks a capability only one platform has, such as Apple Pay. It
must never mark a test that is merely not ported yet.

Every command calls `scripts/run_local_e2e`, which selects the device, builds
and installs the target, and then calls `scripts/run_maestro`. React Native targets
also start Metro if needed. All four need the standard storefront `.env` setup,
but the flows seed their own carts through the control link, so no manual cart
setup is required.

React Native E2E runs should use the released native SDK artifacts declared by
the React Native sample configuration, not local in-repo native SDK overrides.

### The control link

The samples share one command channel: a deep link on the app's own scheme.

```
<app_id>://e2e/<command>?<parameters>
```

The scheme equals the app id on all four targets, so `scripts/run_maestro` derives
`E2E_CONTROL_LINK` rather than taking it as an argument. Commands are `reset`,
`cart` and `signIn`. Each sample parses the link in its own E2E folder and runs the
command through one `E2EController`, so sample code that merchants read holds a
single hook.

The link goes to an app that already runs. A stopped app would need a second entry
point on every platform, because iOS delivers a cold-start URL through the scene
connection options and Android through the launch intent.

## Matrix

CI runs are described by `config/matrix.yml`. The matrix expands applications and
OS version tags into a BrowserStack run plan. Because Bitrise has no built-in
matrix support, `e2e/lib/e2e_matrix_to_browserstack_run_plan.rb` transforms the
matrix into a BrowserStack run plan and the pipeline parallelizes over the
resulting rows.

Current applications:

- React Native iOS sample app
- React Native Android sample app
- Kotlin Android sample app
- Swift iOS sample app

Current OS version tag:

- `latest`

Every run executes the whole `tests/` folder. The top-level `tags:` block sets the
default include and exclude lists, and an application may override either one to
adopt a test before the others carry it. Adding a test adds no rows here.

The run plan derives `E2E_CONTROL_LINK` as `<app_id>://e2e`, because the deep link
scheme equals the app id on all four targets. Each run also supplies `E2E_APP_ID`
and `E2E_READY_MARKER`, and the local runners supply the same three names.

Validate the matrix:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan validate
```

Expand the BrowserStack run plan:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand
```

Expand a single BrowserStack run plan row by index:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand --index 0
```

Count BrowserStack run plan rows:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan count
```

## BrowserStack executors

The Bitrise run stage defaults to the checksum-verified `maestro-runner` pin in
`.maestro-runner-version`. It runs on the Bitrise worker and connects to BrowserStack
real devices through the Appium hub. Set `E2E_BROWSERSTACK_EXECUTOR=hosted-maestro`
to run the previous BrowserStack-hosted Maestro executor for comparison.

The Appium executor uploads only the app artifact, writes the runner's JSON, JUnit,
HTML, screenshots, hierarchy, logs, and session IDs into the run result artifact,
and preserves the normalized `result.json` contract used by GitHub reporting. It
uses a temporary copy of the E2E workspace to enable `launchApp.newSession` on
Android. On iOS it relies on BrowserStack's clean physical-device session and skips
the simulator-only `clearState` command that BrowserStack cannot execute. The
shared flows consumed by hosted Maestro remain unchanged.

## Files

- `config.yaml` configures Maestro for shared platform behavior and quarantines
  the `flaky` and `wip` tags.
- `flows/` contains reusable Maestro subflows for app setup and checkout steps.
- `tests/shared/` holds the tests every target runs through the CI matrix.
- `tests/<platform>/` holds platform-local tests. The matrix may ignore their tags.
- `tests/shared/launch-smoke.yaml` is the shared launch smoke test.
- `tests/shared/checkout-present-and-close.yaml` seeds a cart through the control
  link, presents checkout, closes it, and asserts dismissal.
- `tests/shared/checkout-hardcoded-buyer-identity.yaml` orders from a cart that
  already carries the contact and the delivery address.
- `tests/shared/checkout-guest.yaml` orders from an empty identity, so checkout
  asks for the contact and the delivery address as well as the payment.
- `scripts/run_local_e2e` builds and installs any of the four local targets.
- `scripts/run_maestro` is their single Maestro invocation. It holds the
  environment contract and target-specific test-file selection in one place.
- `config/matrix.yml`, `lib/e2e_matrix_to_browserstack_run_plan.rb`, and
  `scripts/` drive the BrowserStack run plan.

Maestro resolves the `flows:` glob in `config.yaml` relative to the path on the
command line. BrowserStack passes the workspace root because `scripts/zip_e2e_tests`
puts `config.yaml`, `tests/` and `flows/` side by side there. Local runs instead
pass the shared and target-specific test files selected by `scripts/run_maestro`.

## Shared app contract

Shared flows rely on stable cross-app identifiers. Every target app must expose
these markers:

| Marker | Appears when |
|---|---|
| `checkout-kit-sample-ready` | the app finished launching |
| `cart-checkout-ready` | the cart holds at least one line |

`cart-checkout-ready` is the assertion for the whole control link path. It appears
only after the app parsed the link, resolved a variant, created a cart, added the
line, and navigated to the cart.

`flows/app/bootstrap-cart-from-link.yaml` takes `E2E_CART_PARAMS`, the query string
for the `cart` command. A test that does not care about buyer identity omits
`buyerIdentityMode` and keeps the app's configured mode.

Future shared flows should add identifiers here before they are used across
React Native, Swift, and Android sample apps.

## Scope

These flows catch regressions in the sample app integration surface on all four
targets: cart bootstrap, buyer identity configuration, checkout presentation,
checkout completion, and return to the sample app. They are not a replacement for
checkout-web browser-based coverage.
