import { expect, test } from "../../support";

test("loads every component through its cacheable URL when nothing fails", async ({ page }) => {
  const moduleUrls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/cdn/assets/")) moduleUrls.push(request.url());
  });
  await page.goto("/cdn");

  await page.evaluate(async () => {
    const loaderUrl = "/cdn/checkout-kit.js";
    const { loadComponents } = await import(loaderUrl);
    await loadComponents(["shopify-checkout", "shopify-universal-checkout", "shop-pay"]);
  });

  // A cache-busting retry URL is only for recovering from a failed import.
  expect(moduleUrls.length).toBeGreaterThanOrEqual(3);
  expect(moduleUrls.filter((url) => url.includes("retry="))).toEqual([]);
});

test("recovers transient CDN module failures without poisoning any component", async ({ page }) => {
  const failedModules = new Set<string>();
  await page.route("**/cdn/assets/**/*.js*", async (route) => {
    const { pathname } = new URL(route.request().url());
    // Fail each module once, including any shared dependency. Query strings must
    // not turn this into repeated outages; Chromium's module cache is under test.
    if (!failedModules.has(pathname)) {
      failedModules.add(pathname);
      await route.fulfill({ status: 503, body: "Temporary module outage" });
    } else {
      await route.continue();
    }
  });
  await page.goto("/cdn");

  const [, registrations] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/cdn/assets/") && response.status() === 503,
    ),
    page.evaluate(async () => {
      const loaderUrl = "/cdn/checkout-kit.js";
      // Import in the browser realm to exercise native module loading and its failure cache.
      const { loadComponents } = await import(loaderUrl);
      await loadComponents(["shopify-checkout", "shopify-universal-checkout", "shop-pay"]);
      // The same page must remain usable after recovery, without a reload.
      await loadComponents(["shopify-checkout"]);
      await loadComponents(["shopify-universal-checkout"]);
      await loadComponents(["shop-pay"]);
      return {
        standard: typeof customElements.get("shopify-checkout")?.prototype.open,
        universal: typeof customElements.get("shopify-universal-checkout")?.prototype.open,
        shopPay: typeof customElements.get("shop-pay")?.prototype.open,
      };
    }),
  ]);

  expect(registrations).toEqual({
    standard: "function",
    universal: "function",
    shopPay: "function",
  });
});
