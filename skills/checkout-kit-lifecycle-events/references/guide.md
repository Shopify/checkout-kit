# Lifecycle Events Guide

## Core Model

Lifecycle handling should connect checkout state changes to app-owned side effects: navigation, confirmation screens, loading UI, cart refreshes, external URL handling, and error UI.

Prefer protocol notifications where the platform exposes them. Keep legacy callbacks only when the platform still requires them or when the protocol does not expose the event needed by the app.

## Protocol Events

Use protocol events as the source of truth when available:

- `ec.ready`: handshake and delegated capability discovery.
- `ec.start`: checkout is visible and interactive enough for host UI transitions.
- `ec.complete`: checkout completed; navigate or refresh order state.
- `ec.messages.change`: checkout warnings, errors, and informational messages changed.
- `ec.line_items.change`: line items changed.
- `ec.buyer.change`: buyer details changed.
- `ec.payment.change`: payment state changed.
- `ec.window.open_request`: checkout requests that the host open an external URL.

Do not assume every legacy callback has a one-to-one replacement. If a callback mixed several concerns, split it into protocol handlers and app-owned state transitions.

## Platform Samples

Read the platform file for the target app:

- `references/swift.md`
- `references/android.md`
- `references/react-native.md`

## Review Checklist

- Completion handling navigates or refreshes state exactly once.
- Cancellation and failure paths restore the host UI and preserve cart state.
- External links are handled intentionally.
- Protocol handlers update app state without duplicating legacy callback side effects.
- Web pixel events are not relayed to the native layer.
- Event payload handling does not assume personally identifiable information is present.
