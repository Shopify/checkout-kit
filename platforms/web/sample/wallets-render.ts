import type { ShopifyAcceleratedCheckoutButtons } from "@shopify/checkout-kit/wallets";

import type { WalletsRefs } from "./wallets-dom";
import type { WalletsAppState } from "./wallets-state";
import { renderCart } from "./views/cart";
import { renderProducts } from "./views/products";
import { renderWalletsElement } from "./views/wallets-element";
import { renderWalletsLog } from "./views/wallets-log";
import { renderWalletsSettings } from "./views/wallets-settings";

export function renderWalletsApp(
  refs: WalletsRefs,
  state: WalletsAppState,
  element: ShopifyAcceleratedCheckoutButtons,
): void {
  renderWalletsSettings(refs, state, element);

  if (state.purchaseSource === "cart") {
    renderProducts(refs, state);
    renderCart(refs, state);
  } else {
    renderProducts(refs, state, "select", { selectedVariantId: state.variantId });
  }

  renderWalletsElement(refs, state, element);
  renderWalletsLog(refs, state);
}
