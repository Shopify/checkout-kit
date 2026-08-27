# React Native iOS sccache performance workdoc

This workdoc tracks the Bitrise performance investigation for [PR #638](https://github.com/Shopify/checkout-kit/pull/638). Every measurement links to the Bitrise run that produced it.

## Method

- Build step duration and compiler statistics come from the linked run's Bitrise log.
- Full workflow duration is the interval from `started_on_worker_at` to `finished_at` returned by the Bitrise API for the linked run.
- Cold and warm runs use separate Bitrise macOS workers.
- A warm result is accepted only when the log confirms that the compiler cache was restored and reports the resulting cache statistics.

## Historical successful warm runs

| Workflow and run | Full workflow | Build or test step | Compiler result |
|---|---:|---:|---:|
| [Sample build](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/d317c07b-ee08-44e6-81de-04e9421acb96) | 3m 17s | 44.79s | 100% hits, 0 misses, 0 compilations |
| [Integration tests](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/c0a1ea80-f128-4392-a3b1-4cbc7f292c05) | 2m 36s | 51.75s | 729/729 hits, 0 misses, 0 compilations |

## Post-rebase baseline

| Workflow and run | Cache state | Full workflow | Build or test step | Compiler result |
|---|---|---:|---:|---:|
| [Sample build, first run](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/7d40efa2-3a59-4764-a93d-284827dbf694) | Cold | 5m 55s | 3.5m | 0/1,194 hits, 1,194 compilations |
| [Sample build, exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/cb9b79e6-4954-4b05-82ce-190ef2ffbae7) | Warm | 5m 41s | 3.1m | 0/1,194 hits, 1,194 compilations |
| [Integration tests, first run](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/5f01649e-1599-4acd-b824-98fca2f3187f) | Cold | 4m 6s | 2.6m | 0/729 hits, 729 compilations |
| [Integration tests, exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/1f7b10c4-a20a-43a9-b89a-9551da5562a0) | Warm | 2m 24s | 48.60s | 729/729 hits, 0 compilations |

The [warm sample run](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/cb9b79e6-4954-4b05-82ce-190ef2ffbae7) spent 17.11s restoring DerivedData and 16.84s saving it, then compiled all 1,194 requests despite restoring the exact sccache archive. The same run spent another 10.24s restoring sccache and 18.41s saving it.

The [warm integration-test run](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/1f7b10c4-a20a-43a9-b89a-9551da5562a0) did not restore DerivedData and reused all 729 compiler results across workers.

## Current experiment

Remove the sample workflow's DerivedData restore and save steps. The sample will retain sccache as its compilation cache. This tests whether restored Xcode intermediates and regenerated React Native inputs are making the sample's compiler keys unstable across workers.

### Acceptance criteria

- Both affected workflows pass.
- The second sample run restores sccache and reports compiler hits across workers.
- The second sample run is faster than the linked post-rebase sample baseline.
- The integration-test warm behavior does not regress.

## Experiment results

Pending live Bitrise runs.
