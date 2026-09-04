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

| Workflow and run | Cache state | Full workflow | Build or test step | Compiler result |
|---|---|---:|---:|---:|
| [Sample build, branch fallback restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/45022046-086a-41cf-b369-5d4284d81314) | Warm | 3m 3s | 56.85s | 1,194/1,194 hits, 0 compilations |
| [Sample build, exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/39ac4c5a-84cd-474f-a4fd-6ad609394795) | Warm | 3m 2s | 52.45s | 1,194/1,194 hits, 0 compilations |
| [Integration tests, branch fallback restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/d3ae8ff6-c470-4fae-82a8-0aac98996f7a) | Warm | 2m 9s | 42.77s | 729/729 hits, 0 compilations |
| [Integration tests, exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/4855009e-05d6-4fb7-afaa-e2ffb3d1193f) | Warm | 2m 6s | 40.16s | 729/729 hits, 0 compilations |

Both sample runs reused every compiler result on separate Bitrise workers after the DerivedData cache was removed. This confirms that combining restored DerivedData with regenerated React Native inputs caused the post-rebase sample cache instability.

## Comparison

| Workflow and linked runs | Full workflow change | Build or test step change |
|---|---:|---:|
| Sample: [post-rebase exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/cb9b79e6-4954-4b05-82ce-190ef2ffbae7) → [experiment exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/39ac4c5a-84cd-474f-a4fd-6ad609394795) | 5m 41s → 3m 2s, 46.6% faster | 3.1m → 52.45s, 71.8% faster |
| Sample: [historical successful warm run](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/d317c07b-ee08-44e6-81de-04e9421acb96) → [experiment exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/39ac4c5a-84cd-474f-a4fd-6ad609394795) | 3m 17s → 3m 2s, 7.6% faster | 44.79s → 52.45s, 17.1% slower |
| Integration tests: [post-rebase exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/1f7b10c4-a20a-43a9-b89a-9551da5562a0) → [experiment exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/4855009e-05d6-4fb7-afaa-e2ffb3d1193f) | 2m 24s → 2m 6s, 12.5% faster | 48.60s → 40.16s, 17.4% faster |
| Integration tests: [historical successful warm run](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/c0a1ea80-f128-4392-a3b1-4cbc7f292c05) → [experiment exact restore](https://app.bitrise.io/app/f51f9054-053e-40f1-81e9-ae727567ae76/build/4855009e-05d6-4fb7-afaa-e2ffb3d1193f) | 2m 36s → 2m 6s, 19.2% faster | 51.75s → 40.16s, 22.4% faster |

The sample's exact-restore build step remains 7.66s slower than the linked historical build step, while its complete workflow is 15s faster. The integration workflow was unchanged by this experiment; its lower durations are normal run-to-run variation rather than an effect attributed to removing the sample's DerivedData cache.

## Conclusion

- The sample and integration workflows passed on both experiment runs.
- The sample reused all compiler results across workers on both a branch fallback and an exact cache restore.
- Removing the redundant sample DerivedData cache made the complete sample workflow faster than both linked post-rebase and historical warm runs.
- Integration-test cache behavior remained stable and its experiment runs were faster than both linked baselines.
