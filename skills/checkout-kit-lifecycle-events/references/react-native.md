# React Native

Pass native/ambient presentation callbacks as the second `present()` argument. Pass Checkout Protocol handlers as the third argument for events from the checkout web instance.

Register only protocol handlers exposed by the installed package and needed by the app.

```tsx
import {
  CheckoutProtocol,
  type ProtocolHandlers,
  useShopifyCheckout,
} from '@shopify/checkout-kit-react-native';

const shopifyCheckout = useShopifyCheckout();

const protocolHandlers: ProtocolHandlers = {
  [CheckoutProtocol.complete]: checkout => {
    // Checkout completed in the web instance.
    // Clear or refresh app cart state if needed.
  },
  [CheckoutProtocol.error]: error => {
    // Checkout-originated protocol error.
    // Log/report or show app-owned fallback UI if needed.
  },
};

shopifyCheckout.present(
  checkoutUrl,
  {
    onClose: () => {
      // Native presentation outcome: checkout closed/dismissed.
    },
    onFail: error => {
      // Native/ambient failure: SDK, network, or presentation failure.
    },
    onGeolocationRequest: event => {
      // Host platform request; not a Checkout Protocol event.
      requestAndroidLocationPermission().then(allow => event.respond(allow));
    },
  },
  protocolHandlers,
);
```

Use `CheckoutProtocol` constants rather than hard-coded strings. Payloads are decoded to the public TypeScript shape, so use camelCase fields such as `checkout.lineItems`.

The current React Native wrapper does not expose `windowOpen` in public `ProtocolHandlers` for `present(...)`. Do not add `windowOpen` to React Native examples unless the installed package exports it; rely on the native SDK default URL-opening behavior.
