/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import { ShopifyAcceleratedCheckoutButtons as LocalShopifyAcceleratedCheckoutButtons } from "./wallets";

declare global {
  interface HTMLElementTagNameMap {
    "shopify-accelerated-checkout-buttons": LocalShopifyAcceleratedCheckoutButtons;
  }
}

const tagName = "shopify-accelerated-checkout-buttons";
const registeredConstructor = globalThis.customElements?.get(tagName);

export type ShopifyAcceleratedCheckoutButtons = LocalShopifyAcceleratedCheckoutButtons;
export const ShopifyAcceleratedCheckoutButtons: typeof LocalShopifyAcceleratedCheckoutButtons =
  (registeredConstructor as typeof LocalShopifyAcceleratedCheckoutButtons | undefined) ??
  LocalShopifyAcceleratedCheckoutButtons;

if (globalThis.customElements && !registeredConstructor) {
  globalThis.customElements.define(tagName, ShopifyAcceleratedCheckoutButtons);
}
