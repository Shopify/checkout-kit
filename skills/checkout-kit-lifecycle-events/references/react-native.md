# React Native

Use this as the intended wrapper shape. Check the installed React Native package before copying names directly.

```tsx
import {Linking} from 'react-native';
import {
  createCheckoutProtocolClient,
  useShopifyCheckoutSheet,
} from '@shopify/checkout-kit';

const shopifyCheckout = useShopifyCheckoutSheet();

const checkoutClient = createCheckoutProtocolClient()
  .on('ec.ready', ({delegate}) => {
    recordDelegations(delegate);
  })
  .on('ec.start', ({checkout}) => {
    hideLoadingShell(checkout);
  })
  .on('ec.complete', ({checkout}) => {
    navigateToConfirmation(checkout);
  })
  .on('ec.messages.change', ({checkout}) => {
    renderCheckoutMessages(checkout.messages);
  })
  .on('ec.line_items.change', ({checkout}) => {
    syncCartSummary(checkout.line_items);
  })
  .on('ec.buyer.change', ({checkout}) => {
    syncBuyerState(checkout.buyer);
  })
  .on('ec.payment.change', ({checkout}) => {
    syncPaymentState(checkout.payment);
  })
  .onOpenExternalUrl((url) => {
    Linking.openURL(url);
    return true;
  });

shopifyCheckout.present(checkoutUrl, {
  protocolClient: checkoutClient,
});
```
