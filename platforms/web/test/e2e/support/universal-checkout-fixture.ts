import type {
  ShopifyUniversalCheckoutFailure,
  ShopifyUniversalCheckoutSnapshot as UniversalCheckout,
} from "@shopify/checkout-kit";

import { checkoutOrigin } from "./checkout-fixture";

const universalSessionId = "uc_session_test_1";

// The synthetic checkout derives one shop per index from its `shops` parameter.
export const universalShops = [
  { shopId: "gid://shopify/Shop/1", checkoutId: "checkout_shop_1", orderId: "order_shop_1" },
  { shopId: "gid://shopify/Shop/2", checkoutId: "checkout_shop_2", orderId: "order_shop_2" },
] as const;

export type UniversalShop = (typeof universalShops)[number];

export function universalCheckoutSrc(params: Record<string, string> = {}): string {
  const url = new URL("/checkouts/uc/uc_test_1", checkoutOrigin);
  url.search = new URLSearchParams(params).toString();
  return url.href;
}

// Public SDK data, kept separate from the synthetic checkout's wire payload.
export function universalStartedCheckout(shop: UniversalShop) {
  return {
    id: shop.checkoutId,
    currency: "USD",
    status: "incomplete",
    lineItems: [
      {
        id: "li_1",
        item: { id: "variant_1", title: "Test Product", price: 2000 },
        quantity: 1,
        totals: [{ type: "total", amount: 2000 }],
      },
    ],
    totals: [{ type: "total", amount: 2000 }],
    links: [],
  } satisfies UniversalCheckout;
}

export function universalContext(
  shop: UniversalShop,
  revision: number,
  status: "active" | "completed" | "ejected",
) {
  return { sessionId: universalSessionId, revision, shopId: shop.shopId, status };
}

export const universalStartedEntries = universalShops.map((shop) => ({
  context: universalContext(shop, 1, "active"),
  checkout: universalStartedCheckout(shop),
}));

// Kit reports the synthetic ejection's unrecognized `currency_mismatch` code as `unknown`.
export const universalEjectionFailure = {
  code: "unknown",
  message: "The checkout's currency doesn't match the other checkouts.",
} satisfies ShopifyUniversalCheckoutFailure;
