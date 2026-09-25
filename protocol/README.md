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
