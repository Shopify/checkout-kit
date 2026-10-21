---
"@shopify/checkout-kit-swift": major
---

Add optional reasons to `PreloadState.idle` to distinguish the initial state from invalidation and expiry. Replace `.idle` values with `.idle()` and the former `.expired` state with `.idle(reason: .expired)`. Explicit invalidation and preloads that become inapplicable now report `.idle(reason: .invalidated)`; operational failures remain `.failed(reason:message:)`.

Invalidating an empty cache preserves its last state, including an expiry or failure reason, without notifying observers.

`IdleReason` is an extensible string-backed value with named constants. Compare known reasons or use a `default` branch so future reasons do not require source changes.
