/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import { ShopifyAcceleratedCheckoutButtons } from "./wallets";

declare global {
  interface HTMLElementTagNameMap {
    "shopify-accelerated-checkout-buttons": ShopifyAcceleratedCheckoutButtons;
  }
}

customElements.define("shopify-accelerated-checkout-buttons", ShopifyAcceleratedCheckoutButtons);
