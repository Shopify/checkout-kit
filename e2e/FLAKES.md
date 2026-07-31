# E2E flake register

A flake is a test that gives a different result from the same code. Each entry below
records one, with the evidence that proves it. Clear every open entry before release.

Add an entry when a run fails and a re-run of the same commit passes. Record the target,
the symptom, the date, and the artifact directory. Delete the entry when the fix lands.

## Open flakes

| # | Target | Symptom | Seen | Suspected cause |
|---|---|---|---|---|
| F1 | React Native iOS | `launch-smoke` fails within 10 seconds. The driver answers `viewHierarchy` with HTTP 500 and `kAXErrorInvalidUIElement`, or Maestro reports `App crashed or stopped`. The screenshot shows the splash screen and the crash log directory holds no report. | 2026-07-31, 2 runs of 3 | Maestro reads the accessibility tree while the app still builds it. `extendedWaitUntil` retries a missing element, but it does not retry a driver error. |
| F2 | React Native Android | The first `cart-checkout-ready` assert in `bootstrap-cart-from-link.yaml` fails after 53 seconds. The retry in that flow then passes. | 2026-07-31, 1 run of 2 | Metro builds the bundle on request, so the first cart create starts late. |
| F3 | React Native Android on BrowserStack | `checkout-hardcoded-buyer-identity` fails on one commit and passes on the next, with no change to the test or the sample. PR #561 build `0f61b12e` fails after 152 seconds. PR #562 build `0f61b12e` passes. | 2026-07-31, 1 run of 2 | Unknown. Read the Maestro log for both sessions before you treat it as a flake, because [B2](#browserstack-only-failures) may explain both. |

## BrowserStack-only failures

These fail on every BrowserStack run and pass on every local run, so they are not flakes.
They block the whole matrix. Remove this section when the matrix reports green.

| # | Target | Symptom | Suspected cause |
|---|---|---|---|
| B1 | Swift iOS and React Native iOS | Every test that opens the control link ends 1 second after launch. `launch-smoke` passes in 7 seconds, so the app starts and the ready marker appears. The whole six-test suite finishes in 44 seconds against 10m 29s locally. Both iOS targets show the same timings, and PR #561 shows them too, so no sample change causes it. | Unproven. `openLink` is the first command after launch in every failing test, and the only command `launch-smoke` does not run. |
| B2 | Kotlin Android and React Native Android | Every test that completes an order fails 2 to 6 minutes in. `launch-smoke`, `cart-from-control-link` and `checkout-present-and-close` all pass, so the control link and the cart work. | Unproven. Two candidates: the shop, because `CARD_NUMBER: "1"` needs the Bogus Gateway and the customer account must exist on that shop; and the buyer address, because `scripts/setup_storefront_env` falls back to `CA`/`ON`/`Toronto` when Bitrise supplies no address values, and the tests assert `ZIP code` and `State`. |

## Runner limits, not product faults

| # | Symptom | Cause |
|---|---|---|
| R1 | A second Maestro run fails with `Connection refused: localhost:7001`. | The iOS driver and the Android driver both bind port 7001. Run one target at a time. |

## Traps that give a false result

These produce a wrong verdict rather than an unstable one. The flows already avoid them.
Keep them out of new flows.

- `visibilityPercentage` under 100 rounds down to zero. `scrollUntilVisible` then stops
  before it moves, and the tap that follows lands on whatever already sat there. Use
  `centerElement: true`.
- Android `hideKeyboard` sends a Back press when no keyboard is open, which closes the
  checkout sheet. Only run `dismiss-active-field.yaml` after an `inputText`.
- Maestro reports a tap that changes nothing as `COMPLETED`. The log line reads
  `Nothing changed in the UI`. Assert the result of a tap, never the tap itself.
- A runner that does not set `E2E_DEVICE_ID` lets Maestro pick the device. It can pick the
  other platform, and the run then reports the wrong target.
- An unsigned iOS build carries no `application-identifier`, so every keychain write returns
  `-34018` and the sample drops the customer from the cart. Checkout then opens as a guest
  and the account test fails far from the cause. Build the sample with `CODE_SIGN_IDENTITY=-`.

## Evidence

Maestro writes one directory per run to `~/.maestro/tests/<timestamp>/`. It holds
`maestro.log`, the failure screenshot, and one commands file per test. Read `maestro.log`,
because the commands file carries no order and no status.
