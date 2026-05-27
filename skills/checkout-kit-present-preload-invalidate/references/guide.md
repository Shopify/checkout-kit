# Present, Preload, and Invalidate Guide

## Model

- `present` is the buyer-facing action. Do not wait for or require preload before presenting checkout.
- `preload` is an optimization hint.
- `invalidate` clears cached/preloaded checkout state when the app knows it is stale or should not be reused.

## Preload

Preload only from strong checkout intent or settled state:

- cart screen appears with a valid checkout URL
- buyer taps/focuses near checkout CTA
- cart totals, buyer identity, delivery, or payment context settles after a change

Avoid preloading on every add-to-cart or as a required step before `present`. If the buyer already tapped checkout, call `present` directly with the latest checkout URL.

Preload again after checkout-affecting changes:

- line item, quantity, discount, selling plan, buyer identity, delivery, or payment preference
- checkout configuration such as theme, title, locale, or feature flags
- regenerated cart or checkout URL

Debounce rapid cart edits so only settled state is preloaded.

## Invalidate

Invalidate when the current preloaded checkout should not be reused:

- checkout URL no longer represents the current cart
- buyer changes account, cart, shop, region, or currency
- cart is cleared or replaced
- checkout configuration changes and immediate re-preload is not appropriate
- app returns from checkout and wants the next attempt to start fresh
- buyer signs out or privacy-sensitive state should be cleared

Do not rely on dismissal alone to clear preloaded state unless the platform README says so.

## Platform samples

- `references/swift.md`
- `references/android.md`
- `references/react-native.md`

## Review checklist

- Presentation validates the latest checkout URL before opening checkout.
- Checkout CTA does not wait for preload; it presents the latest checkout URL immediately.
- Preload is tied to buyer intent or settled state, not low-level mutations.
- Preload is repeated after checkout-affecting changes.
- Invalidate covers stale checkout and cart/session boundaries.
- Error, cancellation, completion, and retry paths work without preload.
