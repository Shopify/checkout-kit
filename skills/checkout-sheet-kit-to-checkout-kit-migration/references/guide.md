# Migration Guide

## Version Line

Checkout Kit is the current home for the SDKs that were previously published as Checkout Sheet Kit. The package names remove `Sheet`, and current alpha releases use the shared `4.0.0-alpha.X` Checkout Kit version format while the new package line settles:

- Checkout Kit for Swift starts at `4.0.0-alpha.1`.
- Checkout Kit for Android starts at `4.0.0-alpha.1`.
- Checkout Kit for React Native starts at `4.0.0-alpha.1` and requires the React Native New Architecture.

The legacy Checkout Sheet Kit packages stop on their existing major-version lines:

- Checkout Sheet Kit for Swift ends at `v3`.
- Checkout Sheet Kit for Android ends at `v3`.
- Checkout Sheet Kit for React Native ends at `v4`, the New Architecture release line.

Use the current Checkout Kit package versions from `README.md` and the platform README. Do not assume legacy Checkout Sheet Kit versions roll forward into the renamed Checkout Kit package coordinates.

## Migration Workflow

1. Identify the current integration:
   - Package coordinate or module import.
   - Checkout presentation path.
   - Preload and invalidate usage.
   - Event handlers for completion, lifecycle, external links, buyer/payment/line-item changes, and app-owned analytics.
2. Rename legacy dependencies and imports to Checkout Kit package names.
3. Keep presentation behavior functionally equivalent before changing lifecycle handling.
4. Use the `checkout-kit-lifecycle-events` skill to replace broad event-handler logic with protocol notification handlers where the new protocol exposes a typed equivalent.
5. Preserve app-owned side effects: navigation, confirmation screens, app-owned analytics, error UI, external URL handling, and cart refreshes.
6. Re-test checkout completion, cancellation, external links, buyer identity, payment changes, and cart changes.

## Feature Changes

- Checkout Kit moves from `MobileCheckoutSdkProtocol` to the UCP-backed Embedded Checkout Protocol.
- Web pixel events are no longer relayed to the native layer.
- Event payloads should not expose personally identifiable information.
- Authenticated checkout capabilities require the documented access scope where supported.
- Universal checkout and web iframe support are separate capabilities; do not assume they are available from the legacy mobile SDK behavior.

## Related Skills

- `../checkout-kit-lifecycle-events/SKILL.md` for lifecycle event and protocol notification handling.
- `../checkout-kit-present-preload-invalidate/SKILL.md` for preload, present, and invalidate behavior.

## Guardrails

- Treat the protocol schema as the contract and generated platform types as convenience wrappers.
- Keep old event handlers only when the platform still requires them for compatibility or for behavior not yet covered by protocol notifications.
- Do not keep references to Checkout Sheet Kit package names unless documenting legacy support.
- Do not migrate web pixel or analytics event collection to native lifecycle events. Web pixel relay to the native layer was removed.
- Do not preserve assumptions that event payloads contain PII.
- Keep preload/invalidate changes separate from callback-to-protocol migration unless the user asked for both.
