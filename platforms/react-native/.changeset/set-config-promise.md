---
"@shopify/checkout-kit-react-native": major
---

**Breaking:** `setConfig` now returns `Promise<Configuration>`, on `ShopifyCheckout` and on `useShopifyCheckout()`. The Promise resolves after the native SDK applies the configuration, with the configuration that the native SDK reports right after it applies this call. Overlapping calls each resolve with their own configuration. If you call `getConfig()` before the Promise resolves, it can return the earlier values.

```tsx
const applied = await shopifyCheckout.setConfig({title: 'Checkout'});
applied; // {title: 'Checkout', ...}
```

Calls apply and resolve in call order. Input that the SDK ignores, such as an unknown `logLevel`, still resolves, and the resolved configuration keeps the current value. The Promise rejects only when the native module cannot read the configuration, for example when a value has the wrong type. A rejected call changes nothing. The `ShopifyCheckout` constructor and the `ShopifyCheckoutProvider` `configuration` prop log such a rejection with `console.error`.
