import type { ShopifyAcceleratedCheckoutButtons } from "@shopify/checkout-kit/wallets";

import { formatValue } from "../dom";
import type { WalletsRefs } from "../wallets-dom";
import type { WalletsAppState } from "../wallets-state";

function dumpAttributes(element: ShopifyAcceleratedCheckoutButtons): string {
  const attrs = [
    ["store-domain", element.getAttribute("store-domain")],
    ["country", element.getAttribute("country")],
    ["language", element.getAttribute("language")],
    ["cart-id", element.getAttribute("cart-id")],
    ["variant-id", element.getAttribute("variant-id")],
    ["selling-plan-id", element.getAttribute("selling-plan-id")],
    ["wallet-count", element.getAttribute("wallet-count")],
    ["layout", element.getAttribute("layout")],
  ] as const;

  return attrs
    .map(([name, value]) => `${name}=${value === null ? "undefined" : JSON.stringify(value)}`)
    .join("\n");
}

export function renderWalletsElement(
  refs: WalletsRefs,
  state: WalletsAppState,
  element: ShopifyAcceleratedCheckoutButtons,
): void {
  refs.elementAttrs.textContent = dumpAttributes(element);

  refs.stateStoreDomain.textContent = formatValue(state.storefrontDomain);
  refs.stateCountry.textContent = formatValue(state.country);
  refs.stateLanguage.textContent = formatValue(state.language);
  refs.stateCartId.textContent = formatValue(
    state.purchaseSource === "cart" ? state.cartId : undefined,
  );
  refs.stateVariantId.textContent = formatValue(
    state.purchaseSource === "buynow" ? state.variantId : undefined,
  );
  refs.stateSellingPlanId.textContent = formatValue(
    state.purchaseSource === "buynow" ? state.sellingPlanId : undefined,
  );
  refs.stateWalletCount.textContent = String(state.walletCount);
  refs.stateLayout.textContent = formatValue(state.layout);
}
