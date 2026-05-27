# React Native

Use the current React Native package names. Preload/invalidate APIs may vary while the alpha line settles, so confirm the installed package exposes the exact methods before copying this sample.

```tsx
import {useEffect, useRef} from 'react';
import {
  ShopifyCheckoutProvider,
  useShopifyCheckout,
} from '@shopify/checkout-kit-react-native';
import {useDebounce} from './useDebounce';

function AppWithCheckoutProvider() {
  return (
    <ShopifyCheckoutProvider configuration={{}}>
      <CartScreen />
    </ShopifyCheckoutProvider>
  );
}

function CartScreen({
  checkoutUrl,
  buyerLikelyToCheckoutSoon,
  cartOrBuyerChanged,
  shopId,
  customerId,
  currencyCode,
}) {
  const shopifyCheckout = useShopifyCheckout();
  const preloadedCheckoutUrlRef = useRef<string | null>(null);

  useDebounce(
    () => {
      if (checkoutUrl && buyerLikelyToCheckoutSoon) {
        shopifyCheckout.preload(checkoutUrl);
        preloadedCheckoutUrlRef.current = checkoutUrl;
      }
    },
    [checkoutUrl, buyerLikelyToCheckoutSoon, shopifyCheckout],
    300,
  );

  const onCheckoutTapped = () => {
    if (!checkoutUrl) return;
    shopifyCheckout.present(checkoutUrl);
  };

  useEffect(() => {
    const preloadedCheckoutIsStale =
      preloadedCheckoutUrlRef.current != null &&
      preloadedCheckoutUrlRef.current !== checkoutUrl;

    if (cartOrBuyerChanged && preloadedCheckoutIsStale) {
      shopifyCheckout.invalidate();
      preloadedCheckoutUrlRef.current = null;
    }
  }, [cartOrBuyerChanged, checkoutUrl, shopifyCheckout]);

  useEffect(() => {
    return () => {
      shopifyCheckout.invalidate();
      preloadedCheckoutUrlRef.current = null;
    };
  }, [shopId, customerId, currencyCode, shopifyCheckout]);
}
```

Treat preload as a hint. When the buyer taps checkout, call `present(checkoutUrl)` with the latest checkout URL; do not wait for or require preload.
