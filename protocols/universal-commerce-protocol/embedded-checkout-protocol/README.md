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

## Property-based testing

The TypeScript tests use `fast-check` alongside Vitest. Each property runs 200
generated cases by default, with a fresh seed on each run. They run in the normal
protocol test suite; `fast-check` is a development dependency of protocol tooling.

From the repository root, run the property tests:

```bash
dev protocol test typescript .property.test.ts
```

The properties check these contracts:

- URL decoration is idempotent, and the latest options replace earlier protocol
  options, including removal of omitted optional parameters.
- Unrelated query parameters retain their original bytes and order, including
  duplicates, flags, plus signs, and malformed percent escapes. Protocol
  parameters have the requested decoded values and no stale duplicates; the
  base URL and fragment survive unchanged.
- The handwritten codec runtime preserves nested extension data, arbitrary
  payment-handler dictionary keys, and future status strings without mutating
  its input. Explicit decoded-field assertions also check renaming independently
  of round-trip equality.
- Structured-clone and JSON delivery agree when optional model properties are
  `undefined`; reserved camel-case aliases are rejected, and malformed required
  strings produce validation errors without payload values.
- Generated `Convert` helpers preserve nested extensions, arbitrary handler keys,
  and future status strings across JSON round trips.

The generated-model property exposed a key-preservation bug: an own `__proto__`
payment-handler key changed the decoded map's prototype and disappeared on
re-encoding. The generator now emits own data-property definitions, preserving
the key and the ordinary object prototype. A minimized counterexample is kept
in `languages/typescript/test/extension-preservation.test.ts` alongside the
broader property.

Generators construct small wire payloads independently of the generated rename
map. Extension values are bounded, nested JSON. URL strings use Unicode scalar
values, excluding lone surrogates that `encodeURIComponent` cannot encode.
The wire dictionary generator uses ordinary objects, as produced by JSON.parse;
preserving an input object's prototype is not part of the wire contract. Node's
deep comparison treats an own `constructor` key as ordinary data, avoiding
Vitest strict equality's interpretation of that key as type information.
The optional-field delivery comparison starts from JSON-canonical values so it
does not conflate omission of `undefined` with JSON's conversion of `-0` to `0`.

Handler-key generators also include identifiers outside the schema's
reverse-domain naming rule. The converters accept these strings, so the
properties check that handling them preserves data and object prototypes.

### Replaying a failure

`fast-check` reports the seed, shrink path, counterexample, and underlying
assertion. Select the exact failing test and supply its reported seed and path
through `FC_SEED` and `FC_PATH`. For example, replacing these illustrative values
with the failure report:

```bash
FC_SEED=12345 FC_PATH='0:1:0' dev protocol test typescript url.property.test.ts \
  -t 'decoration is idempotent'
```

`FC_NUM_RUNS` overrides the case count for a local exploration:

```bash
FC_NUM_RUNS=2000 dev protocol test typescript .property.test.ts
```

Keep the same lockfile and generator definitions when replaying a seed/path.
After identifying a defect, retain the smallest useful counterexample as an
ordinary regression test as well as keeping the broader property. Avoid fixing
the default seed or disabling shrinking: varied runs explore more inputs, while
the reported seed and path make failures reproducible.

