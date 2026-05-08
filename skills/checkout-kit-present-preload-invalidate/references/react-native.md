# React Native

Use this as the intended wrapper shape. Check the installed React Native package before copying names directly.

```tsx
import { useEffect, useRef } from "react";
import {
  ShopifyCheckoutSheetProvider,
  useShopifyCheckoutSheet,
} from "@shopify/checkout-kit";
import { useDebounce } from "./useDebounce";

function AppWithCheckoutProvider() {
  return (
    <ShopifyCheckoutSheetProvider config={{}}>
      <CartScreen />
    </ShopifyCheckoutSheetProvider>
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
  const shopifyCheckout = useShopifyCheckoutSheet();
  const preloadedCheckoutUrlRef = useRef<string | null>(null);

  useDebounce(
    () => {
      if (checkoutUrl && buyerLikelyToCheckoutSoon) {
        shopifyCheckout.preload(checkoutUrl);
        preloadedCheckoutUrlRef.current = checkoutUrl;
      }
    },
    [checkoutUrl, buyerLikelyToCheckoutSoon],
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
