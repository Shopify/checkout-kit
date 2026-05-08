# Present, Preload, and Invalidate Guide

## Core Model

`present` is the required buyer-facing action. `preload` is an optimization hint. `invalidate` clears preloaded checkout state when the app knows that cached checkout is stale or should no longer be reused.

Checkout presentation must still work when preload was skipped, ignored, rejected, interrupted, or not finished.

## When to Preload

Preload only when there is a strong signal that the buyer is likely to check out soon, such as:

- Cart screen appears with a valid checkout URL.
- Buyer taps or focuses near a checkout call to action.
- Cart totals, buyer identity, or delivery/payment context have settled after a change.

Avoid preloading on every add-to-cart event. That can waste device resources, create stale checkout state, and put unnecessary load on Shopify systems.

Do not call preload after the buyer has already pressed checkout as a step before presenting. At that point, present checkout directly. A late preload can consume extra resources without improving buyer experience, and during flash sales it may be discarded before it can be used.

## When to Preload Again

Call preload again when the checkout URL or checkout-affecting context changes:

- Cart line item, quantity, discount, buyer identity, delivery preference, or selling plan changes.
- Checkout configuration changes, such as theme, title, locale, or feature flags.
- The app regenerated the cart or checkout URL.

Prefer debounce/coalescing around rapid cart edits so only the settled state is preloaded.

## When to Invalidate

Invalidate when the app should stop reusing the current preloaded checkout:

- The preloaded checkout URL no longer represents the current cart.
- Buyer changes carts, accounts, shops, region, or currency.
- Cart contents are cleared or replaced.
- Checkout configuration changes and immediate re-preload is not appropriate.
- The app returns from checkout and wants the next checkout attempt to start from fresh cart state.
- The buyer signs out or privacy-sensitive state should be cleared.

Do not rely on checkout dismissal alone to clear preloaded state unless the platform README explicitly says it does.

## Platform Samples

Read the platform file for the target app:

- `references/swift.md`
- `references/android.md`
- `references/react-native.md`

## Review Checklist

- Presentation obtains or validates the latest checkout URL before opening checkout.
- Preload is triggered from buyer intent or settled cart state, not every low-level cart mutation.
- Preload is repeated after checkout-affecting changes.
- Invalidate is called on session/cart boundaries and stale-state risks.
- UI and navigation do not assume preload completed.
- Errors, queueing, cancellation, and completion paths remain correct without preload.
