# Pinned protocol models and tests

The vendored schemas and service definition mirror the UCP revision pinned in
`source-lock.json`. Run `dev protocol update-upstream --ref <tag>` to refresh them
and `dev protocol check-upstream` to verify their provenance. Model naming and
decoder adjustments belong in the temporary schema preparation in
`scripts/generate_models.mjs`, never in the vendored schemas.

Tests use the generated protocol version constants. The metadata tests verify
that the TypeScript, Swift, and Kotlin constants match `source-lock.json`, so a
pin change requires regenerating the models without editing version literals
throughout the test suite.

The shared payload fixtures cover shipping and custom fulfillment methods,
plain and rich-text descriptions, shipping-address and business-location
destinations, payment constraints, `ucp.map_order`, errors, and unknown extension
fields. All cases exercise the pinned schema. Fixtures use `{{SPEC_VERSION}}`,
which each test loader replaces with its generated version constant.

SwiftPM bundles fixtures within its test target; JVM tests use classpath
resources. Each language therefore keeps identical JSON copies in its native
test-resource directory, and the TypeScript payload suite checks that all three
copies remain byte-for-byte equal.

The native models preserve unknown properties on their existing open model
surfaces (including checkout and fulfillment methods) and arbitrary signals.
Unknown UCP metadata is accepted and ignored by the native models; TypeScript
preserves it. `map_order` is a known, typed member in all three languages.

Wire support does not imply source or binary compatibility. Changes to generated
constructors, field types, and enums can affect consuming applications. Review
the public API reports before a native release.

## Unknown string values

Swift, Kotlin, and TypeScript preserve unfamiliar enum strings when decoding and
encoding protocol models. For example, a checkout with `"status": "on_hold"`
round-trips with the same status even when the SDK has no named constant for it.
TypeScript's `Convert` helpers follow the same rule as its open string unions.
Missing required fields and non-string values still fail decoding.

New protocol versions can introduce values this SDK doesn't recognize. Handle
unfamiliar values safely in a `default` or `else` branch when interpreting them.
When forwarding or echoing a value back to checkout, preserve the original value
rather than replacing it with a known fallback.

Swift exposes the original string as `rawValue`, and Kotlin as `value`. Swift's
`init(rawValue:)` preserves any string, so a decoded value can always be
reconstructed from its `rawValue`. The initializer keeps its failable signature
for source compatibility, but never returns `nil`; use `isKnown` to check whether
this protocol version defines a named constant for the value.

## Copying Kotlin models

Use `toBuilder()` to change a model while preserving its other fields:

```kotlin
val updated = original.toBuilder().apply {
    parentID = "bundle-1"
    quantity = 2
}.build()
```

Java callers can use the fluent setters:

```java
LineItem updated = original.toBuilder().parentID("bundle-1").quantity(2L).build();
```

The builder starts with every field from the original, including optional fields
added in later SDK versions and captured extension properties. Required fields
remain mandatory when constructing a fresh builder. Copying is shallow: nested
models and collections are shared, and setting builder properties does not change
the original model.

## Covered types

`COVERED_TYPES.md` and `covered-types.json` list the protocol types inside Checkout Kit's compatibility promise: the types Checkout Kit's public API baselines expose, directly or through model fields. Regenerate them with `node scripts/generate_coverage_inventory.mjs` after regenerating models or updating Checkout Kit's API baselines; a test fails if they're out of date.

