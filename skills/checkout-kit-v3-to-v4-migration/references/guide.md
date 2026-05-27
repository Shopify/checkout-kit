# Migration Guide

## Version model

Checkout Kit is the renamed successor to Checkout Sheet Kit:

- Legacy Checkout Sheet Kit packages end on the v3 stable line.
- Checkout Kit packages start on the renamed v4 line, currently `4.0.0-alpha.X`.
- Use versions from `README.md` and the target platform README. Do not carry legacy coordinates forward.

## Checklist

1. Identify current Checkout Sheet Kit usage:
   - package dependency entry
   - import statements
   - checkout presentation call path
   - preload and invalidate usage
   - completion, cancel, fail, external-link, and protocol/lifecycle handlers
   - app-owned analytics or cart-refresh side effects
2. Update the package dependency from Checkout Sheet Kit v3 to Checkout Kit v4, including the package rename that drops `Sheet` from the name.
3. Update imports to the new Checkout Kit module/package name.
4. Verify checkout still opens from the same app flow with the new Checkout Kit package before changing event-handling code.
5. Replace existing checkout event handling with Checkout Protocol where supported. Read `../checkout-kit-lifecycle-events/SKILL.md` before changing completion, cancel, fail, external-link, or protocol handlers.
6. Keep app-owned side effects that still apply: analytics, cart refreshes, error UI, and external URL handling. Do not add confirmation navigation unless the app already owns that flow.
7. Re-test checkout open, completion, cancellation, failure, external links, checkout-affecting cart changes, and buyer/session boundaries.

## Feature changes

- Checkout Kit uses the UCP-backed Embedded Checkout Protocol instead of `MobileCheckoutSdkProtocol`.
- Native/mobile web pixel relay was removed. Rely on checkout/web pixel relay to analytics partners; remove mobile-app forwarding of web pixel events.
- PII is gated behind authenticated checkout capabilities. Do not build lifecycle handling that requires buyer PII unless authenticated checkout access explicitly provides it.
- Authenticated checkout capabilities require documented access scopes where supported.
- Universal checkout and web iframe support are separate capabilities; do not assume legacy mobile SDK behavior applies.

## Related skills

- `../checkout-kit-lifecycle-events/SKILL.md` for callback-to-protocol migration.
- `../checkout-kit-present-preload-invalidate/SKILL.md` for preload, present, and invalidate behavior.

## Guardrails

- For implementation, prefer the target platform's generated Swift, Kotlin, or TypeScript types over raw protocol schemas.
- Keep legacy handlers only for platform compatibility or behavior not covered by protocol notifications.
- Keep preload/invalidate changes separate unless the user asked for them.
- Keep references to Checkout Sheet Kit package names only when documenting legacy state.
