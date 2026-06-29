# Checkout Kit E2E Runbook

## Rollout behaviour

The E2E pipeline always runs and always reports; it never blocks PR merges on its
own. Merge-blocking is controlled solely by whether the single **"Checkout Kit E2E"**
GitHub Check Run is marked **required** in branch protection. Keep it non-required
until the suite is stable, then make it required — no code change is needed to gate
or un-gate. This single umbrella check stays stable across matrix changes, so
requiring it never churns as applications, OS versions, or suites are added.

The runner never hard-fails on test or infrastructure problems: every run writes a
`result.json` and exits `0`, so the report workflow always has data to publish. The
report posts one **"Checkout Kit E2E"** Check Run and a sticky PR failure comment; it
does not post per-suite commit statuses. Failures are therefore loud (one red check
and a failure comment) but non-blocking.

Failures land in `result.json` in one of two shapes:

- **Assertion / suite failures** — a BrowserStack build that reports failed test
  cases or a non-passing terminal status. Recorded by `normalize_result` with
  `status` set to the build's terminal status (e.g. `"failed"`) and the failing
  cases under `failed_tests`; there is no `error`/`error_class`.
- **Runner exceptions** — malformed run plan, out-of-range parallel index, device
  resolution, artifact upload, build start, polling, and timeouts. Caught and
  recorded with `status: "error"`, `error`, and `error_class`, with the class,
  message, and full backtrace logged to the failing step's stderr.

Setup failures that happen before a run plan row is read have no run metadata
(suite, target), so they appear in the Check Run summary and the failure comment
with an `error` status but reduced detail. This is separate from the Bitrise
step's own required-env guards: a missing config variable
(e.g. `BROWSERSTACK_ACCESS_KEY`) is validated by the step and fails fast before
the runner starts.

The report also enforces a **completeness check**: it compares the number of
`result.json` files against `E2E_BROWSERSTACK_RUN_PLAN_COUNT` (the run plan row
count, shared across the pipeline). If a run never reports — for example a whole
execute workflow that failed to upload — the "Checkout Kit E2E" check is forced red
and the failure comment notes the shortfall, so a missing run can never silently
pass. When the expected count is unavailable the completeness check is skipped
rather than reporting a false failure.

## Retry behavior

BrowserStack API calls retry transient infrastructure responses once by default:

```bash
E2E_BROWSERSTACK_API_RETRIES=1
```

Retry applies to HTTP 429 and 5xx responses **and to transient network exceptions** (connection timeouts, resets, TLS/socket errors), and only to idempotent read/poll (GET) requests — build-creation and upload requests fail fast to avoid duplicate builds. Connections use a 10s open timeout and a 120s read timeout. Test assertion failures are not auto-retried by default so first-failure evidence is preserved.

## Timeouts

BrowserStack polling uses these defaults:

```bash
E2E_BROWSERSTACK_TIMEOUT_SECONDS=1800
E2E_BROWSERSTACK_POLL_SECONDS=30
```

If polling times out, the runner attempts to stop the BrowserStack build before recording the failure.

## Local rerun notes

Use the BrowserStack run plan row from a failure report to identify the app target, platform, OS version tag, and suite:

```bash
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand --index <index>
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand > /tmp/browserstack-run-plan.json
```

Use the reported resolved device to pin a rerun:

```bash
E2E_DEVICE_OVERRIDE="<resolved BrowserStack device>" \
e2e/scripts/execute_browserstack_run --index <index> --run-plan /tmp/browserstack-run-plan.json --tests-zip <e2e-tests.zip> --output-dir <results-dir>
```

The app artifact environment variable for the run plan row must point at the `.apk` or `.ipa` artifact before rerunning.

## Failure triage

Use the GitHub Check Run or sticky PR failure comment first. Failure summaries should include Markdown links to:

- BrowserStack build
- failed testcase
- video
- screenshot
- Maestro command log
- Maestro log
- device log
- network log when enabled

BrowserStack artifact links require BrowserStack App Automate access. Sign in to [BrowserStack App Automate](https://app-automate.browserstack.com/dashboard/v2/builds) before opening evidence links.

Avoid posting additional PR comments for green runs.
