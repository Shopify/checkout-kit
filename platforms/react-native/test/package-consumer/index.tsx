import React from 'react';
import {
  ShopifyCheckout,
  ShopifyCheckoutProvider,
  useShopifyCheckout,
  AcceleratedCheckoutButtons,
  AcceleratedCheckoutWallet,
  CheckoutAppearanceType,
  CheckoutColorScheme,
  LogLevel,
} from '../..';
import type {
  CheckoutColors,
  Configuration,
  PresentCallbacks,
  PreloadState,
} from '../..';

const colors: CheckoutColors = {progressIndicatorColor: '#0B6E4F'};

const configuration: Configuration = {
  appearance: {
    type: CheckoutAppearanceType.app,
    colorScheme: CheckoutColorScheme.automatic,
    colors: {ios: colors, android: {...colors, dragHandleColor: null}},
  },
  telemetry: false,
  logLevel: LogLevel.warn,
};
const checkout = new ShopifyCheckout(configuration);
const callbacks: PresentCallbacks = {
  onDismiss() {},
  onFail({error}) {
    void error.code;
  },
};
checkout.present(
  'https://example.myshopify.com/checkouts/example',
  callbacks,
);
checkout.preload('https://example.myshopify.com/checkouts/example', {
  onStateChange(state: PreloadState) {
    void state.type;
  },
});
function Consumer() {
  const {present} = useShopifyCheckout();
  void present;
  return (
    <AcceleratedCheckoutButtons
      cartId="gid://shopify/Cart/example"
      wallets={[AcceleratedCheckoutWallet.shopPay]}
    />
  );
}
export const application = (
  <ShopifyCheckoutProvider configuration={configuration}>
    <Consumer />
  </ShopifyCheckoutProvider>
);
