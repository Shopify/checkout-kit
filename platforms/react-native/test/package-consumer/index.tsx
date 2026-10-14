import React from 'react';
import {
  ShopifyCheckout,
  ShopifyCheckoutProvider,
  useShopifyCheckout,
  AcceleratedCheckoutButtons,
  AcceleratedCheckoutWallet,
  ColorScheme,
  LogLevel,
} from '../..';
import type {
  Configuration,
  PresentCallbacks,
  PreloadState,
} from '../..';

const configuration: Configuration = {
  colorScheme: ColorScheme.automatic,
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
