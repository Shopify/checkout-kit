# Checkout Kit E2E Runbook

## Merge gate behavior

The E2E pipeline starts on every non-draft pull request so the required
`ci/bitrise/e2e/pr` status always reports. Its Linux run-plan workflow applies the
changed-file filters after the pipeline starts. When no application matches, app builds,
BrowserStack execution, and `e2e-report` are skipped. No `Checkout Kit E2E` Check Run or
sticky PR comment is published; Bitrise's successful pipeline status satisfies the
required check.

Each BrowserStack runner writes a `result.json` and exits `0` even for test or
infrastructure failures, ensuring the report workflow has evidence to publish. When runs
are planned, the report posts one diagnostic **Checkout Kit E2E** Check Run and one sticky
PR comment carrying the Tophat install links and run summary; it does not post per-suite
commit statuses. After publishing, a failed or incomplete report exits nonzero so the
required Bitrise pipeline status also fails and blocks merging. The required gate is
Bitrise's pipeline status, not the diagnostic Check Run.

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
execute workflow that failed to upload — both the diagnostic "Checkout Kit E2E" check
and the required pipeline status fail, and the PR comment notes the shortfall. When the
expected count is unavailable the completeness check is skipped, but if no result files
exist either, the report exits nonzero without publishing.

To show *why* runs are missing, the report reads the pipeline workflow roster
from `BITRISEIO_FINISHED_WORKFLOWS` and names the stages that failed or never
started. A stage that never started is only reported when the run plan expects
it, so a `run_if`-skipped build workflow is not a false failure. When no run
reports at all and a stage is blocking, the comment replaces the empty results
and install tables with a caution block that names each blocking stage, links
its build log, lists the planned runs that did not execute, and links the
pipeline build; the check run title becomes `Blocked by <stage>`. When a partial
set of runs reports, the results table stays and the blocking stages are added
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

Use the GitHub Check Run or sticky PR comment first. Failure summaries should include Markdown links to:

- BrowserStack build
- failed testcase
- video
- screenshot
- Maestro command log
- Maestro log
- device log
- network log when enabled

BrowserStack artifact links require BrowserStack App Automate access. Sign in to [BrowserStack App Automate](https://app-automate.browserstack.com/dashboard/v2/builds) before opening evidence links.

The report keeps a single sticky PR comment, identified by a hidden marker, and updates it
in place on each pull request build with planned E2E runs, including fully green runs.
Produced SDK targets have Tophat install links, so a passing build stays installable from
the PR. An empty run plan creates no Check Run and leaves any existing sticky comment
untouched.

## The iOS check failed or never posted

Bitrise posts the required `ci/bitrise/ci-ios/pr` pipeline status. `Checkout Kit iOS` is a
diagnostic Check Run from `ci-ios-report`, described in `BITRISE.md`. Check the required
pipeline status before treating an absent diagnostic as a failure.

**The required pipeline status never appears.** The pipeline did not start. Its target-based pull request
trigger has no file filter, so the usual cause is the branch head: Bitrise reads the
pipeline trigger from the pull request's own commit, and a branch older than the trigger
never starts it. Rebase on `main` and push. The trigger also sets `draft_enabled: false`,
so a draft posts nothing until it is marked ready.

**The diagnostic check is red but every job says skipped.** `ci-ios-plan` failed or never
ran, and the reporter refuses to call an empty selection green. Inspect the pipeline and
that workflow's log, if it started. It fetches the changed file list from GitHub and reads
`e2e/config/ios_ci.yml`, so the usual causes are an expired build token or a malformed
config file.

**The diagnostic check is red and names a job.** That macOS workflow failed or never
finished. A selected job that never ran is still a failure, rather than an intentional
skip. Follow the pipeline link to inspect the failed or missing workflow.

**The required pipeline is green and no diagnostic check was posted.** Expected on a
change that touches no iOS input — documentation, Android, or web. `ci-ios-plan` and
`ci-ios-report` still run on Linux, but a successful plan with no selected job posts
nothing. To confirm the selection is right rather than empty by accident, run the plan
locally against the same file list:

```bash
ruby e2e/scripts/ios_ci_run_plan selected-jobs --changed-file <path>
```

It prints a comma-separated job list, or nothing when no macOS job is needed.
