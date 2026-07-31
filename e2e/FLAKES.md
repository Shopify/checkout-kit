# E2E flake register

A flake is a test that gives a different result from the same code. Each entry below
records one, with the evidence that proves it. Clear every open entry before release.

Add an entry when a run fails and a re-run of the same commit passes. Record the target,
the symptom, the date, and the artifact directory. Delete the entry when the fix lands.

## Open flakes

| # | Target | Symptom | Seen | Suspected cause |
|---|---|---|---|---|
| F1 | React Native iOS | `launch-smoke` fails after 2 seconds. The driver answers `viewHierarchy` with HTTP 500 and `kAXErrorInvalidUIElement`. | 2026-07-31, 1 run of 2 | Maestro reads the accessibility tree while the app still builds it. `extendedWaitUntil` retries a missing element, but it does not retry a driver error. |
| F2 | React Native Android | The first `cart-checkout-ready` assert in `bootstrap-cart-from-link.yaml` fails after 53 seconds. The retry in that flow then passes. | 2026-07-31, 1 run of 2 | Metro builds the bundle on request, so the first cart create starts late. |

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

## Evidence

Maestro writes one directory per run to `~/.maestro/tests/<timestamp>/`. It holds
`maestro.log`, the failure screenshot, and one commands file per test. Read `maestro.log`,
because the commands file carries no order and no status.
