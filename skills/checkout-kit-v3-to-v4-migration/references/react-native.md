# React Native

## Rename

```tsx
// LEGACY v3 Checkout Sheet Kit
// import {
//   ShopifyCheckoutSheetProvider,
//   useShopifyCheckoutSheet,
// } from '@shopify/checkout-sheet-kit';

// v4 Checkout Kit
import {
  ShopifyCheckoutProvider,
  useShopifyCheckout,
} from '@shopify/checkout-kit-react-native';
```

Update `package.json`:

```json
{
  "dependencies": {
    "@shopify/checkout-kit-react-native": "<checkout-kit-version>"
  }
}
```

## Then check

- `platforms/react-native/README.md` for current React Native package setup and presentation API.
- `../checkout-kit-lifecycle-events/SKILL.md` before changing completion, close, fail, external-link, or Checkout Protocol handling.
- `../checkout-kit-present-preload-invalidate/SKILL.md` before changing preload or invalidate behavior.
