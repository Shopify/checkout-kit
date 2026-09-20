/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import { ShopifyAcceleratedCheckoutButtons } from "./wallets";

declare global {
  interface HTMLElementTagNameMap {
    "shopify-accelerated-checkout-buttons": ShopifyAcceleratedCheckoutButtons;
  }
}

// Idempotent: guard against double-registration when loaded from
// multiple sources (Vite dev + direct module URL, HMR reload, etc.).
if (!customElements.get("shopify-accelerated-checkout-buttons")) {
  customElements.define("shopify-accelerated-checkout-buttons", ShopifyAcceleratedCheckoutButtons);
}
