import { ShopifyCheckout } from "./checkout";

declare global {
  interface HTMLElementTagNameMap {
    "shopify-checkout": ShopifyCheckout;
  }
}

customElements.define("shopify-checkout", ShopifyCheckout);
