# Metrics contract

All implementations use the following OTLP resource attributes:

- `service.name`: `checkout-kit`
- `service.version`: the Checkout Kit release version
- `telemetry.sdk.language`: `java`, `swift`, or `webjs`
- `telemetry.sdk.name`: `checkout-kit-telemetry`
- `telemetry.sdk.version`: the Checkout Kit release version that includes the
  telemetry implementation

Every metric includes these closed identity attributes:

- `product`: `checkout_kit`, `accelerated_checkouts`, or `customer_auth`
- `platform`: `android`, `swift`, `web`, `react-native-android`, or
  `react-native-swift`

React Native values include the underlying native runtime so dashboards can query
one bounded dimension without joining separate platform and integration
attributes. Metric attributes are closed, low-cardinality values; callers cannot
attach arbitrary attributes.

Clients carry a default `product` and may override it per measurement, so one
client instance can serve several products. Swift uses the override because it
hosts multiple entry points; Kotlin and TypeScript host a single product each
and intentionally keep the constructor-fixed default only.

## Metrics

### `checkout_kit_error`

Monotonic delta counter for failures observed by the SDK.

Attributes:

- `category`: `http`, `navigation`, `protocol`, `render_process`, or `unknown`
- `stage`: `initialization`, `load`, `message`, or `presentation`
- `code`: a bounded platform-independent code, falling back to `unknown`
- `retryable`: `true` when the failure is of a transient class that could in
  principle be retried. It does not imply the SDK attempted a retry; actual
  attempts are reported by `checkout_kit_navigation_retry` and marked with
  `is_retry`.
- `is_retry`: `true` when the error occurred during a retry attempt, otherwise
  `false`

### `checkout_kit_protocol_decode_error`

Monotonic delta counter for ECP messages that cannot be decoded.

Attributes:

- `method`: a supported ECP method or `unknown`
- `failure_type`: `envelope`, `params`, `serialization`, or `unknown`

The raw message and decoder error are never recorded.

### `checkout_kit_navigation_retry`

Monotonic delta counter for retry decisions.

Attributes:

- `reason`: `timeout`, `connection_lost`, `cannot_connect`, `dns`, or `unknown`
- `result`: `started`, `failed`, or `not_attempted`

`started` means a retry was launched, `failed` means that launched retry later
failed, and `not_attempted` means an eligible retry could not be launched.

### `checkout_kit_navigation_duration_ms`

Delta histogram measuring the initial main-frame checkout navigation, from the
navigation start until success or terminal failure. Navigation start is when
the SDK initiates the platform navigation; engine callback granularity differs
per platform, and the window includes the single automatic retry when one
occurs. Subresource requests and subsequent WebView navigations are not
measured.

Attributes:

- `result`: `success` or `failure`
- `preloaded`: `true` or `false`

## Error mappings

A lost background preload keep-alive is recorded as
`category=navigation`, `stage=load`, `code=connection_lost`,
`retryable=false`, and `is_retry=false`.

## Prohibited data

- Checkout, cart, order, shop, customer, or payment identifiers
- App bundle/package identifiers or stable device identifiers
- URLs, origins, query parameters, HTTP bodies, or headers
- Raw UCP/ECP messages or decoded payload content
- Exception text, error descriptions, or stack traces
