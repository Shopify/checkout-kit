/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import { ShopifyCheckout } from "./checkout";

declare global {
  interface HTMLElementTagNameMap {
    "shopify-checkout": ShopifyCheckout;
  }
}

customElements.define("shopify-checkout", ShopifyCheckout);
