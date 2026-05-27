# Lifecycle Events Guide

## Event sources

Checkout Kit has two lifecycle event sources:

1. **Native presentation callbacks** are native/ambient SDK events. They cover sheet/dialog presentation outcomes such as cancellation, close/dismissal, native SDK failure, network/webview failures, or host platform requests. They are not messages from checkout and are not part of Checkout Protocol communication.
2. **Checkout Protocol events** flow through `CheckoutProtocol.Client`, the UCP-backed bidirectional communication layer between the checkout web instance and the native host. Use protocol handlers for checkout-originated notifications and request/response delegations.

Do not treat root SDK callbacks and protocol events as interchangeable. Use native callbacks for presentation outcomes; use Checkout Protocol handlers when the checkout web instance communicates with the host app.

Check the target platform README/source before suggesting a handler; not every protocol method is public on every platform.

## Public checkout protocol events

Common public Checkout Protocol notifications:

- `ec.start`: checkout web instance has started. Usually no host action is needed unless the app has its own pre-checkout loading shell.
- `ec.complete`: checkout completed in the web instance. Common host action: clear or refresh app cart state. Do not navigate to a confirmation screen unless the app owns that flow; checkout normally handles confirmation inside the web instance.
- `ec.messages.change`: checkout messages changed. Listen only when the app has a concrete need outside checkout UI.
- `ec.line_items.change`: line items changed. Listen only when app state outside checkout must react.
- `ec.totals.change`: totals changed. Listen only when app state outside checkout must react.
- `ec.error`: checkout-originated protocol error. Log/report it or show app-owned fallback UI when appropriate.

The generated protocol model may include more events, such as buyer or payment changes. Suggest them only when the target SDK publicly exposes them.

## Window open delegation

`ec.window.open_request` is a Checkout Protocol request/response delegation for external URLs. Swift and Android expose it as `CheckoutProtocol.windowOpen`; the current React Native wrapper does not expose it in public `ProtocolHandlers` for `present(...)`.

Checkout Kit has a smart default: when the app does **not** register a `windowOpen` handler, the SDK attempts to open the URL with the platform default mechanism, which may resolve a deep link, another app, or the browser.

If the app registers a `windowOpen` handler, that smart default does not run for that request. The app developer becomes responsible for opening the URL with the desired platform mechanism or returning a rejection. Do not register `windowOpen` just to observe URLs.

## Platform wiring

- `references/swift.md`: native `CheckoutDelegate`/SwiftUI callbacks plus `CheckoutProtocol.Client`.
- `references/android.md`: native presentation builder callbacks plus `CheckoutProtocol.Client`.
- `references/react-native.md`: native callbacks as the second `present()` argument, protocol handlers as the third argument.

## Review checklist

- Native callbacks and Checkout Protocol handlers are not duplicated.
- Completion handling clears or refreshes app cart state at most once.
- Cancellation/failure restores host UI and preserves cart state where appropriate.
- External links are handled intentionally; custom `windowOpen` handlers open the URL or reject the request.
- Protocol handlers are registered only for app-owned side effects.
- Web pixel events are not relayed to native code; remove mobile-app forwarding and rely on checkout/web pixel relay to analytics partners.
- Payload handling accounts for PII being gated behind authentication.
