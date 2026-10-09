# Checkout Kit E2E Runbook

## Pipeline and reporting

The required `ci/bitrise/e2e/pr` pipeline starts on every non-draft PR.
`e2e-plan` selects applications using `e2e/config/matrix.yml` and the shared
changed-file filters. Each selected `e2e-maestro-*` workflow builds its app and
runs the enabled Maestro flows directly on a Bitrise simulator or emulator.

`e2e-report` always runs and publishes the `Checkout Kit E2E` Check Run and a
sticky PR comment. It requires a successful planner, valid selection metadata,
and a successful workflow for every selected target. A missing, failed, aborted,
or unfinished selected workflow fails the report. An explicit empty selection
runs only the planner and reporter, which publishes a successful check stating
that no E2E application was selected. Manual pipelines select all targets and
enforce the same result checks, but do not post to GitHub.

Each target exports JUnit into its **Tests** tab, including on test failure, and
uploads a compressed Maestro diagnostics artifact. Export failures also fail the
workflow. The sticky comment links these test results and the workflow logs.
Tophat install links use the retained `e2e-build-*` workflows, which can produce
signed device artifacts on demand.

## Retry behavior

Direct workflows set `E2E_MAESTRO_TEST_RETRIES=2`: one initial attempt and up to two
retries of only the failed flows. A recovered flow is labeled `(passed on retry 1)`
or `(passed on retry 2)` in the final JUnit report. The artifact retains each
attempt's report and diagnostics, so a green result does not hide an earlier
failure. Missing or malformed JUnit reports fail the runner.

Local runs default to zero retries. For a local retry-enabled run, set both
`E2E_MAESTRO_TEST_RETRIES` and `E2E_JUNIT_REPORT`. Retry attempts share the workflow
step's timeout; retries do not extend its wall-clock budget.

## Failure triage

1. Open the failing target's **Tests** tab from the PR comment or pipeline.
2. If no tests were exported, inspect the build log for setup, build, install,
   or runner errors.
3. Download `tests.zip` from **Artifacts**. Raw attempts are under
   `maestro-attempts-*/attempt-*`; Maestro's screenshots, command JSON, and logs
   are in hidden `.maestro/tests/` directories within each attempt.
4. Inspect the screenshot and command hierarchy before changing a selector or
   adding retries. A successful tap can leave another input focused if the
   keyboard covers the intended field.

A failed planner can skip every target. Check its log for changed-file retrieval,
matrix validation, or missing branch workflows. Rebase a stale branch when its
pipeline lacks a target selected by the merged matrix. The report intentionally
fails when the planner or its metadata is missing.

## Reruns

Choose the PR branch and the specific `e2e-maestro-*` workflow in Bitrise's
**Start build** screen to rerun one target, or choose `e2e` to run all four.

For local reproduction, provision with `dev up`, boot a simulator or emulator,
and run the matching target with the failed YAML file, for example:

```bash
dev rn e2e android tests/shared/checkout-guest.yaml
```

Use the published native SDKs for React Native. Direct CI pins Android API 35 and
the iOS runtime provided by the Xcode stack in `e2e/bitrise.yml`; it does not use
BrowserStack's dynamic device selectors.

## BrowserStack real-device runs

BrowserStack remains available alongside the default Bitrise simulator/emulator
pipeline. In Bitrise, choose **Start build**, select the branch, and select
`e2e-browserstack`. It has no automatic triggers and uses the existing signed
artifact builds, matrix, and credentials. The reporter saves
`browserstack-summary.md` to Bitrise and fails on missing or failed results,
without replacing the required direct E2E check or PR comment.

Keep this path for hardware-dependent tests and future Apple Pay coverage. Apple
Pay support for Maestro and the required device/signing setup still need to be
confirmed before adding those flows. BrowserStack-specific retry, polling, and
signing settings are documented in [BITRISE.md](BITRISE.md).

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
