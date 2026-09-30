import { fileURLToPath } from "node:url";
import { test as base, expect } from "@playwright/test";
import type { ShopifyCheckoutEventMap } from "@shopify/checkout-kit";

type CheckoutEventRecord = {
  [K in keyof ShopifyCheckoutEventMap]: {
    type: K;
    detail: ShopifyCheckoutEventMap[K]["detail"] | null;
  };
}[keyof ShopifyCheckoutEventMap];

declare global {
  interface Window {
    checkoutEvents: CheckoutEventRecord[];
  }
}

export const checkoutOrigin = "https://checkout.example.test";
const syntheticCheckout = fileURLToPath(
  new URL("../fixtures/synthetic-checkout.html", import.meta.url),
);

export const test = base.extend<{ networkGuard: void }>({
  networkGuard: [
    async ({ context, baseURL }, use) => {
      const unexpectedRequests: string[] = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === baseURL) return route.continue();
        if (url.origin === checkoutOrigin) {
          return route.fulfill({ path: syntheticCheckout, contentType: "text/html" });
        }
        unexpectedRequests.push(url.origin);
        await route.abort();
      });

      await use();
      expect(unexpectedRequests, "All requests should stay within the local fixtures").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
