# Telemetry shrinking regression

This standalone consumer build exercises the SDK's shipped consumer rules with
R8 enabled. `includedRelease` uses the default build gate; `excludedRelease`
applies the documented opt-out and uses R8 `-checkdiscard` assertions to require
removal of the telemetry implementation. Both resolve the published protocol.

From `platforms/android`:

```sh
./gradlew -p test/telemetry -PuseLocalProtocol=false assembleIncludedRelease assembleExcludedRelease
./gradlew -p test/telemetry -PuseLocalProtocol=false connectedIncludedReleaseAndroidTest connectedExcludedReleaseAndroidTest
```

The device tests exercise serialization, XML view inflation, and a real WebView
`ec.ready` exchange against a local HTML page. They also check the optimized gate
in both variants, including runtime attempts to enable telemetry in the excluded
variant. No real storefront or telemetry upload is needed. APKs use debug signing
solely to install these optimized test builds.
