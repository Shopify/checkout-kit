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
attributes. Metric attributes are closed, low-cardinality values. For the
metrics in this catalog, callers cannot attach arbitrary attributes. On Web, a
component can also record its own metrics through the shared client. Those
follow the same rule by convention: the component wraps them in typed functions
that take closed values.

Clients carry a default `product` and may override it per measurement, so one
client instance can serve several products. Swift uses the override because it
hosts multiple entry points; Kotlin and TypeScript host a single product each
and keep the constructor-fixed default for their own metrics. A Web component
that records its own metrics sets `product` on each one.

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

### `checkout_kit_confirmation_reached`

Monotonic delta counter recorded once when a checkout presentation ends after a
valid `ec.complete`, or while its main frame is on the order confirmation
(`thank-you`) page. `ec.complete` can arrive before the confirmation page
loads, so a presentation dismissed on completion still counts. Android and
Swift only; web cannot observe navigation inside the cross-origin checkout
frame.

Attributes:

- `completion_received`: `true` when a valid `ec.complete` was delivered to the
  integration during that presentation, otherwise `false`

Swift counts each checkout view once. Without `ec.complete`, a preloaded view
on the confirmation page stays cached and can be presented again; presenting it
again does not record another measurement.

A presentation that never ends, such as when the app is terminated, is not
recorded. `completion_received=false` does not prove the order completed, and it
is an upper bound on missing completion messages: it also counts buyers who
left the confirmation page before `ec.complete` was sent.

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

### `checkout_kit_ready_duration_ms`

Delta histogram measuring the time from the first navigation start until
checkout sends its first `ec.ready` message. The start is kept across the
automatic retry and, on Swift, a cancelled navigation that starts again.

On native, navigation duration ends when the page finishes loading, so a load
that finishes but never becomes ready is only visible here. On web, navigation
duration ends at `ec.start`, which follows `ec.ready`, and a close records
nothing; this metric records that close as `not_ready`. On web, only
`<shopify-checkout>` records it.

Attributes:

- `result`: `ready` or `not_ready`. `not_ready` is recorded once, with the
  time elapsed at that point, wherever navigation duration records
  `result=failure`, and when a presented checkout is closed before `ec.ready`.
  Evicting or expiring a preload that was never presented records nothing.
- `preloaded`: `true` or `false`. Web always reports `false`.

## Error mappings

A lost background preload keep-alive is recorded as
`category=navigation`, `stage=load`, `code=connection_lost`,
`retryable=false`, and `is_retry=false`.

A terminal `ec.error` protocol message is recorded as `category=protocol`,
`stage=message`, `code=terminal_error`, and `retryable=false`. A malformed terminal
payload additionally records `checkout_kit_protocol_decode_error` with
`method=ec.error`.

A checkout window the browser blocks on web is recorded as
`category=navigation`, `stage=presentation`, `code=blocked`,
`retryable=true`, and `is_retry=false`. A block that happens while the blocked
overlay is already showing, such as a retry from its Open checkout button, is
recorded with `is_retry=true`.

## Prohibited data

- Checkout, cart, order, shop, customer, or payment identifiers
- App bundle/package identifiers or stable device identifiers
- URLs, origins, query parameters, HTTP bodies, or headers
- Raw UCP/ECP messages or decoded payload content
- Exception text, error descriptions, or stack traces
