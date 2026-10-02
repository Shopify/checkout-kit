import { test as base, expect } from "@playwright/test";
import { CheckoutHostPage } from "./checkout-host-page";
import { stubEmbeddedCheckout, type CheckoutStubMode } from "./embedded-checkout-stub";

export const test = base.extend<{
  checkoutStub: CheckoutStubMode;
  host: CheckoutHostPage;
  networkGuard: void;
}>({
  checkoutStub: ["handshake", { option: true }],
  host: async ({ page }, use) => {
    await use(new CheckoutHostPage(page));
  },
  networkGuard: [
    async ({ context, baseURL, checkoutStub }, use) => {
      const unexpectedRequests: string[] = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === baseURL) return route.continue();
        unexpectedRequests.push(url.origin);
        await route.abort();
      });

      // Playwright tries the most recently registered route first. Checkout
      // requests use the stub; everything else still passes through the guard.
      await stubEmbeddedCheckout(context, checkoutStub);

      await use();
      expect(unexpectedRequests, "All requests should stay within the local fixtures").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
