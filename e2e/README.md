# Checkout Kit End-to-End Tests

This directory contains Maestro end-to-end flows and configuration for Checkout
Kit sample apps. Two complementary setups live here:

- **Local** runs, one command per target, that build the sample app, install it on
  the booted device, and run the tests in `tests/`. Tags select which tests run.
- A **CI matrix** that expands applications and OS version tags into BrowserStack
  Maestro run rows. Every row runs the whole `tests/` folder and tags select what
  runs inside it.

Both paths call `scripts/run_maestro`, so they share one environment contract.

## Secrets

The suite reads its own file, `e2e/.env`, so a run cannot pick up whichever store you
happen to have configured for the sample apps in the repo-root `.env`.

`dev up` generates `e2e/.env` from `config/secrets/e2e.ejson`, which is committed
encrypted. It is generated, so an edit to it is lost on the next `dev up`. To change
a value:

```bash
dev secrets edit e2e
./scripts/ejson_lint
```

Then commit `config/secrets/e2e.ejson`. `ejson_lint` needs no key and fails if any
value landed as plaintext, so run it before committing.

To point a local run at your own store instead, put the keys in `e2e/.env.local`.
Nothing writes that file, it overrides `e2e/.env` key by key, and `run_maestro` names
the keys it found there.

A blank `E2E_CUSTOMER_ACCOUNT_EMAIL` or `E2E_CUSTOMER_ACCOUNT_CODE` excludes the
`account` tag instead of failing, so the rest of the suite still runs.

## Run locally

Run `dev up` first to provision the local toolchain. Install Maestro separately
and make sure `maestro --version` succeeds before running these flows.

### One command per target

Boot a simulator or emulator first, because Maestro drives the device the app runs
on. Then run the matching command from the repo root.

| Target | Command |
|---|---|
| Swift iOS | `dev swift e2e` |
| Kotlin Android | `dev android e2e` |
| React Native iOS | `dev rn e2e ios` |
| React Native Android | `dev rn e2e android` |

Each command runs every test in `tests/`. Narrow a run with `--tags`:

```bash
dev swift e2e --tags cart
dev rn e2e ios --tags checkout
dev android e2e --tags cart,checkout
```

Both options match **any** listed tag, because that is how Maestro filters.
`--tags cart,checkout` runs the cart tests and the checkout tests. `--exclude-tags`
skips tests carrying any listed tag. `config.yaml` quarantines `flaky` and `wip`
for every run, so those need no command line option.

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

Every command builds the sample app, installs it, and then calls
`scripts/run_maestro`. The React Native commands also start Metro if needed. All
four need the storefront configuration described in [Secrets](#secrets), but the
flows seed their own carts through the control link, so no manual cart setup is
required.

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

Current OS version tags:

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

## Files

- `config.yaml` configures Maestro for shared platform behavior and quarantines
  the `flaky` and `wip` tags.
- `flows/` contains reusable Maestro subflows for app setup and checkout steps.
- `tests/shared/` holds the tests every target runs through the CI matrix.
- `tests/<platform>/` holds platform-local tests. The matrix may ignore their tags.
- `tests/shared/launch-smoke.yaml` is the shared launch smoke test.
- `tests/shared/cart-from-control-link.yaml` seeds a cart through the control link
  and waits for the cart marker.
- `tests/shared/checkout-present-and-close.yaml` opens checkout and closes it.
- `tests/shared/checkout-hardcoded-buyer-identity.yaml` orders from a cart that
  already carries the contact and the delivery address.
- `tests/shared/checkout-guest.yaml` orders from an empty identity, so checkout
  asks for the contact and the delivery address as well as the payment.
- `tests/shared/checkout-customer-account.yaml` signs a customer in, then orders.
  Checkout reads the contact and the delivery address from the account.
- `FLAKES.md` records every unstable test and every trap that gives a false result.
- `scripts/run_maestro` is the single Maestro invocation every local runner calls.
  It holds the environment contract and the workspace root rule in one place.
- `scripts/test_run_maestro` puts a fake `maestro` on `PATH` and asserts the argv, so
  the environment contract has tests that need no device.
- `config/matrix.yml`, `lib/e2e_matrix_to_browserstack_run_plan.rb`, and
  `scripts/` drive the BrowserStack run plan.

Maestro resolves the `flows:` glob in `config.yaml` relative to the path on the
command line, so both paths pass the workspace root. `scripts/zip_e2e_tests` puts
`config.yaml`, `tests/` and `flows/` side by side, which makes the zip root that
same workspace root.

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
