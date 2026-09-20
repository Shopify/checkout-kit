import type { ShopifyAcceleratedCheckoutButtons } from "@shopify/checkout-kit/wallets";

import { cartLineTotalQuantity } from "../cart";
import type { WalletsRefs } from "../wallets-dom";
import type { WalletsAppState } from "../wallets-state";

export function renderWalletsSettings(
  refs: WalletsRefs,
  state: WalletsAppState,
  element: ShopifyAcceleratedCheckoutButtons,
): void {
  const isBuynow = state.purchaseSource === "buynow";

  // Settings panel source fields
  refs.cartSourceFields.hidden = isBuynow;
  refs.buynowSourceFields.hidden = !isBuynow;

  // Cart banner: visible only in cart mode
  refs.cartBanner.hidden = isBuynow;

  // Create-cart button: enabled when there are items, a domain, and an access token.
  refs.createCartButton.disabled =
    cartLineTotalQuantity(state.cartLines) === 0 ||
    !state.storefrontDomain ||
    !state.storefrontAccessToken;

  refs.layout.classList.toggle("settings-collapsed", state.settingsCollapsed);
  refs.settingsToggle.setAttribute("aria-expanded", String(!state.settingsCollapsed));
  refs.settingsToggle.setAttribute(
    "aria-label",
    state.settingsCollapsed ? "Show settings panel" : "Hide settings panel",
  );

  element.storeDomain = state.storefrontDomain || undefined;
  element.country = state.country || undefined;
  element.language = state.language || undefined;
  element.walletCount = state.walletCount;
  element.layout = state.layout || undefined;

  if (isBuynow) {
    element.variantId = state.variantId || undefined;
    element.sellingPlanId = state.sellingPlanId || undefined;
  } else {
    // Cart mode: the element resolves the cart internally.
    // Clear product-flow attributes.
    element.variantId = undefined;
    element.sellingPlanId = undefined;
  }
}
