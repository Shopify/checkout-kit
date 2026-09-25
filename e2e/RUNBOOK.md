# Checkout Kit E2E Runbook

## Rollout behaviour

The E2E pipeline starts for every non-draft pull request and reports through the
single required **`ci/bitrise/e2e/pr`** native Bitrise check. Test failures, runner
errors, and missing results fail this check and block merging. The reporter does
not create a separate `Checkout Kit E2E` check or per-suite commit statuses.

The runner records test and infrastructure problems in `result.json` and exits
`0`, so every parallel run can finish and upload its results. After collecting
those results, `e2e-report` prints the summary and publishes the sticky PR comment,
then exits `1` if any run failed or an expected result is missing. That exit status
fails the Bitrise pipeline and its native check without losing the failure evidence.
A complete set of passing results exits `0`.

The E2E comment includes Tophat install links for produced targets, test results,
and a pipeline build link on success and failure. Changes selecting no E2E runs
skip the build, execution, and report workflows; the native pipeline check still
passes. Manual builds evaluate results and set the pipeline outcome too, but skip
GitHub publication and do not require a GitHub token.

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
(suite, target), so they appear in the Check Run summary and the PR comment
with an `error` status but reduced detail. This is separate from the Bitrise
step's own required-env guards: a missing config variable
(e.g. `BROWSERSTACK_ACCESS_KEY`) is validated by the step and fails fast before
the runner starts.

The report also enforces a **completeness check**: it compares the number of
`result.json` files against `E2E_BROWSERSTACK_RUN_PLAN_COUNT` (the run plan row
count, shared across the pipeline). If a run never reports — for example a whole
execute workflow that failed to upload — `e2e-report` exits `1`, the native pipeline
check fails, and the PR comment notes the shortfall, so a missing run can never silently
pass. When the expected count is unavailable the completeness check is skipped
rather than reporting a false failure.

To show *why* runs are missing, the report reads the pipeline workflow roster
from `BITRISEIO_FINISHED_WORKFLOWS` and names the stages that failed or never
started. A stage that never started is only reported when the run plan expects
it, so a `run_if`-skipped build workflow is not a false failure. When no run
reports at all and a stage is blocking, the comment replaces the empty results
and install tables with a caution block that names each blocking stage, links
its build log, lists the planned runs that did not execute, and links the
pipeline build. When a partial set of runs reports, the results table stays and the blocking stages are added
below the shortfall warning. When the roster is unavailable — for example on a
local run — the report falls back to the shortfall warning alone. The
`e2e-report` step logs the raw roster, because Bitrise documents no enum for the
workflow status field.

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

Use the sticky PR comment for test diagnostics and the native GitHub check to open the Bitrise pipeline. Failure summaries should include Markdown links to:

- BrowserStack build
- failed testcase
- video
- screenshot
- Maestro command log
- Maestro log
- device log
- network log when enabled

BrowserStack artifact links require BrowserStack App Automate access. Sign in to [BrowserStack App Automate](https://app-automate.browserstack.com/dashboard/v2/builds) before opening evidence links.

The E2E report keeps a single sticky PR comment, identified by a hidden marker, and updates
it in place whenever it reports results. Green runs never add another E2E comment. Produced
targets retain their Tophat install links even when a test fails. The iOS CI report uses a
separate marker and comment, so the two pipelines cannot overwrite each other's summaries.

## The iOS check failed or never posted

`ci/bitrise/ci-ios/pr` comes from the `ci-ios` pipeline, described in `BITRISE.md`.
`ci-ios-report` publishes the detailed `Checkout Kit iOS` sticky comment, then exits
according to its selection-aware evaluation. It does not create another check.
Three layers can break, and the symptom tells you which one. Work down the list in order.

**The check never appears.** The pipeline did not start. Its target-based pull request
trigger has no file filter, so the usual cause is the branch head: Bitrise reads the
pipeline trigger from the pull request's own commit, and a branch older than the trigger
never starts it. Rebase on `main` and push. The trigger also sets `draft_enabled: false`,
so a draft posts nothing until it is marked ready.

**The check is red but every job says skipped.** `ci-ios-plan` failed, and the reporter
refuses to call an empty selection green. Open that workflow's log. It fetches the changed
file list from GitHub and reads `e2e/config/ios_ci.yml`, so the usual causes are an expired
build token or a malformed config file.

**The check is red and the comment names a job.** That macOS workflow failed or never
finished. The reporter treats a selected job that did not run as a failure, while a job
the plan deliberately left unselected is harmless. The comment distinguishes failed jobs
from jobs that did not run and links back to the Bitrise pipeline.

**The check is green and every job says skipped.** Expected on a change that touches no
iOS input — documentation, Android, or web. `ci-ios-plan` and `ci-ios-report` still run,
which costs about a minute on Linux. To confirm the selection is right rather than empty by
accident, run the plan locally against the same file list:

```bash
ruby e2e/scripts/ios_ci_run_plan selected-jobs --changed-file <path>
```

It prints a comma-separated job list, or nothing when no macOS job is needed.
