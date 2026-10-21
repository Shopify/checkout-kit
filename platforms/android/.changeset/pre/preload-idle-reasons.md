---
"@shopify/checkout-kit-android": major
---

Add optional reasons to `PreloadState.Idle` to distinguish the initial state from invalidation and expiry. Replace `PreloadState.Idle` values with `PreloadState.Idle()` and the former `PreloadState.Expired` state with `PreloadState.Idle(PreloadState.IdleReason.Expired)`. Match idle states with `is PreloadState.Idle`. Java callers replace `PreloadState.Idle.INSTANCE` with `new PreloadState.Idle()` and inspect `getReason()`.

`IdleReason` is an extensible string-backed value with `Invalidated` and `Expired` constants. Compare known reasons or use an `else` branch so future reasons do not require source changes. Invalidating an empty cache preserves its last state and reason without notifying observers. Operational failures remain `Failed(reason, message)`.
