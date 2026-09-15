# Protocol revision compatibility

The vendored schemas and service definition mirror the UCP revision pinned in
`source-lock.json`. Run `dev protocol update-upstream --ref <tag>` to refresh them
and `dev protocol check-upstream` to verify their provenance. Naming and decoder
compatibility adjustments belong in the temporary schema preparation in
`scripts/generate_models.mjs`, never in the vendored schemas.

The current SDK handshake requests `2026-08-25`. The model tests also retain
`2026-04-08` checkout and error messages to cover older wire payloads. April dates
in those fixtures are intentional, not current-version defaults or package
release coordinates.

The compatibility fixtures exercise `ucp.map_order`, custom fulfillment method
strings (`drone_delivery`), destinations with and without the August `type`
discriminator, and unknown checkout, fulfillment-method, and signals fields.
SwiftPM bundles fixtures within its test target; JVM tests use classpath
resources. Each language therefore keeps identical JSON copies in its native
test-resource directory, and the TypeScript compatibility suite checks that all
three copies remain byte-for-byte equal.

The native models preserve unknown properties on their existing open model
surfaces (including checkout and fulfillment methods) and arbitrary signals.
Unknown UCP metadata is accepted and ignored by the native models; TypeScript
preserves it. `map_order` is a known, typed member in all three languages.

The generated destination model includes both postal-address and business-location
fields. Its discriminator is optional to decode April destinations; this does not
relax the requirement for businesses emitting August responses to include `type`.

Wire compatibility does not imply source or binary compatibility. Open fulfillment
strings replace the old closed method enums, and generated constructors and
structured fields change. Review the public API reports before a native release.

The fixtures cover representative April messages, not every historical shape.
Fulfillment-option descriptions now require structured `Description` objects
(no legacy string alternative), and payment-instrument constraints use the closed
`ConstraintsElement` model. Unknown legacy constraint keys are not promised
native round-trip preservation.
