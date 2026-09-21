/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import { ShopifyAcceleratedCheckoutButtons } from "./wallets";

declare global {
  interface HTMLElementTagNameMap {
    "shopify-accelerated-checkout-buttons": ShopifyAcceleratedCheckoutButtons;
  }
}

const tagName = "shopify-accelerated-checkout-buttons";

if (!customElements.get(tagName)) {
  customElements.define(tagName, ShopifyAcceleratedCheckoutButtons);
}
