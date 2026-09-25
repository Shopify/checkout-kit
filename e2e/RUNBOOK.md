# Checkout Kit E2E Runbook

## Rollout behaviour

Each application owns an E2E pipeline and a `ci/bitrise/e2e-<application>/pr`
status. These pipeline statuses are the merge gates, including for unrelated
changes which run only the planner and succeed. The application-specific
`Checkout Kit E2E / <application>` Check Run supplies detailed results when tests
are selected. It is supplementary and should not be required, because it does
not appear for unrelated changes. See [the required-check migration](README.md#matrix)
when replacing the original `ci/bitrise/e2e/pr` gate.

The runner saves `result.json` and exits nonzero on test or infrastructure
failure. Bitrise can therefore identify the failed test workflow for a partial
retry. Artifact upload always runs after it; the report workflow has
`should_always_run: workflow` and publishes the diagnostics even after a failure.
Each application owns a separate sticky comment so concurrent finishes cannot
replace another application's result. Tophat links include only artifacts for
the application that produced the report.

Failures land in `result.json` in one of two shapes:

- **Assertion / suite failures** — a BrowserStack build that reports failed test
  cases or a non-passing terminal status. Recorded by `normalize_result` with
  `status` set to the build's terminal status (e.g. `"failed"`) and the failing
  cases under `failed_tests`; there is no `error`/`error_class`.
- **Runner exceptions** — malformed run plan, out-of-range run index, device
  resolution, artifact upload, build start, polling, and timeouts. Caught and
  recorded with `status: "error"`, `error`, and `error_class`, with the class,
  message, and full backtrace logged to the failing step's stderr.

Setup failures that happen before a run plan row is read have no run metadata
(suite, target), so they appear in the Check Run summary and the PR comment
with an `error` status but reduced detail. This is separate from the Bitrise
step's own required-env guards: a missing config variable
(e.g. `E2E_TESTS_ZIP`) is validated by the step and fails fast before
the runner starts.

The report also enforces a **completeness check**: it compares the number of
`result.json` files against `E2E_BROWSERSTACK_RUN_PLAN_COUNT` (the run plan row
count, shared across the pipeline). If a run never reports — for example a whole
execute workflow that failed to upload — the application’s check and pipeline fail
and the PR comment notes the shortfall, so a missing run can never silently
pass. Planned row IDs are also checked, so duplicate results cannot stand in for
a missing OS run. If the expected count is unavailable, the reporter still checks
any available run plan and refuses an entirely empty report.

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

Wait for the affected application's pipeline to finish, then choose **Rebuild
unsuccessful Workflows** or **Rebuild from here** on its failed test workflow.
Other application pipelines can keep running. The retry reuses the successful
app build and test archive through Bitrise pipeline intermediate files, then
refreshes that application's report. Bitrise retains partial-rerun support for
30 days; a full rebuild starts the app build again.

The test workflow has no dynamic `parallel` copies, so the graph stays eligible
for partial rebuilds. If additional OS rows are configured, they run sequentially
within this workflow and a retry reruns all rows for that application.

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
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand --application <application-id> --index <index>
ruby e2e/scripts/e2e_matrix_to_browserstack_run_plan expand --application <application-id> > /tmp/browserstack-run-plan.json
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

Each application report keeps one sticky PR comment, identified by its own hidden
marker, and updates it in place on subsequent runs. Passing runs still publish
their Tophat links; a build which never produced results has no install table.

## The iOS check failed or never posted

`Checkout Kit iOS` comes from the `ci-ios` pipeline, described in `BITRISE.md`. Three
layers can break, and the symptom tells you which one. Work down the list in order.

**The check never appears.** The pipeline did not start. Its target-based pull request
trigger has no file filter, so the usual cause is the branch head: Bitrise reads the
pipeline trigger from the pull request's own commit, and a branch older than the trigger
never starts it. Rebase on `main` and push. The trigger also sets `draft_enabled: false`,
so a draft posts nothing until it is marked ready.

**The check is red but every job says skipped.** `ci-ios-plan` failed, and the reporter
refuses to call an empty selection green. Open that workflow's log. It fetches the changed
file list from GitHub and reads `e2e/config/ios_ci.yml`, so the usual causes are an expired
build token or a malformed config file.

**The check is red and names a job.** That macOS workflow failed or never finished. The
reporter lists a selected job that produced no result as a failure, so a timeout and a
compile error look different in the summary: a timeout shows as missing, a compile error
shows as failed. Both link back to the Bitrise pipeline.

**The check is green and every job says skipped.** Expected on a change that touches no
iOS input — documentation, Android, or web. `ci-ios-plan` and `ci-ios-report` still run,
which costs about a minute on Linux. To confirm the selection is right rather than empty by
accident, run the plan locally against the same file list:

```bash
ruby e2e/scripts/ios_ci_run_plan selected-jobs --changed-file <path>
```

It prints a comma-separated job list, or nothing when no macOS job is needed.
