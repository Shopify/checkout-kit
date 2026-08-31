# Checkout Kit telemetry

Checkout Kit telemetry is a metrics-only client used by the Swift, Android,
React Native, and Web SDKs — React Native reports through the embedded native
SDKs. It exports anonymous operational metrics using OTLP/HTTP JSON.

The implementations intentionally do not install a global OpenTelemetry
provider. They aggregate a small, closed set of Checkout Kit metrics and send
them directly to the configured collector with bounded in-memory buffering and
bounded exponential backoff after export failures.

## Implementations

- `languages/swift` — package-visible `CheckoutKitTelemetry` Swift target
- `platforms/android/lib` — internal Kotlin implementation
- `languages/typescript` — private `@shopify/checkout-kit-telemetry` workspace package

All implementations are Checkout Kit internals. They are not independently
published or exposed as public SDK APIs. The Swift and TypeScript targets keep
their implementation boundaries private; Android telemetry is part of the
Checkout Kit library. Its internal OTLP exporter owns batching, backoff, payload
encoding, and transport so those concerns remain isolated from integrations.

## Data rules

Telemetry must not contain checkout, cart, shop, customer, application, or
device identifiers. Raw URLs, protocol payloads, HTTP bodies, exception
messages, and stack traces are prohibited. Metric names and attributes are
defined in [`contract/metrics.md`](contract/metrics.md).

Telemetry failures are always isolated from checkout. Buffers are held only in
memory and are discarded when the process exits.

Calling `shutdown` performs a final flush by default. Integrations implementing
a runtime opt-out can request that pending measurements be discarded instead;
this also cancels an active request where the platform transport supports it.
A request already handed off to the operating system or remote endpoint may
not be retractable.

## Lifecycle integration

Create and start one enabled telemetry client for the lifetime of the SDK-owned
integration. `flush` is a best-effort operation for periodic work and terminal
page lifecycle events; it does not dispose the client. Call `shutdown` only
when the client is permanently disposed or telemetry is disabled. Use discard
shutdown for an opt-out so queued measurements are dropped and an active request
is cancelled where supported.

Android telemetry is process-scoped and must not be shut down from activity
`onPause`, `onStop`, or `onDestroy`; `Application.onTerminate` is not a
production lifecycle callback. Web integrations flush on `pagehide` and shut
down only when their SDK-owned client is disposed. Swift integrations shut down
when telemetry is disabled.

Telemetry is an SDK implementation detail. It does not add UCP/ECP methods or
send telemetry through the embedded checkout protocol.
