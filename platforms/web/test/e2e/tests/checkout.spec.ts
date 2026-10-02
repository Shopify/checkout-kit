import type { ShopifyCheckout } from "@shopify/checkout-kit";
import { checkoutOrigin, expect, test } from "../support/fixtures";

test("opens checkout, completes the handshake and purchase, then closes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => customElements.whenDefined("shopify-checkout"));
  await page.locator("shopify-checkout").evaluate((element, origin) => {
    const src = new URL("/checkout/checkout_test_1", origin);
    src.searchParams.set("host_origin", location.origin);
    (element as ShopifyCheckout).src = src.href;
  }, checkoutOrigin);

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  const popup = await popupPromise;

  await expect(page.locator("#overlay")).toBeVisible();
  await expect(popup.locator("#status")).toHaveText("Ready");
  await popup.getByRole("button", { name: "Start checkout" }).click();
  await expect
    .poll(() => page.evaluate(() => window.checkoutEvents))
    .toEqual([
      {
        type: "start",
        detail: {
          checkout: {
            id: "checkout_test_1",
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
          },
        },
      },
    ]);

  await popup.getByRole("button", { name: "Complete checkout" }).click();
  await expect
    .poll(() => page.evaluate(() => window.checkoutEvents.map(({ type }) => type)))
    .toEqual(["start", "complete"]);

  const complete = await page.evaluate(() =>
    window.checkoutEvents.find((event) => event.type === "complete"),
  );
  expect(complete?.detail?.checkout).toMatchObject({
    id: "checkout_test_1",
    status: "completed",
    order: {
      id: "order_test_1",
      permalinkUrl: `${checkoutOrigin}/orders/order_test_1`,
    },
  });
  expect(complete?.detail?.checkout).not.toHaveProperty("ucp");
  expect(
    await page
      .locator("shopify-checkout")
      .evaluate((element) => (element as ShopifyCheckout).checkout),
  ).toEqual(complete?.detail?.checkout);

  // Completion leaves presentation under the host's control.
  await page
    .locator("shopify-checkout")
    .evaluate((element) => (element as ShopifyCheckout).close());
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(page.locator("#overlay")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.checkoutEvents.map(({ type }) => type)))
    .toEqual(["start", "complete", "close"]);
});
