import { expect, test } from "@playwright/test";

import {
  CheckoutFixture,
  CheckoutHostPage,
  EmbeddedCheckoutStub,
  ShopifyCheckoutPopup,
} from "../../support";

test.beforeEach(async ({ context }) => {
  await EmbeddedCheckoutStub.handshake(context);
});

test.describe("embedded checkout protocol", () => {
  test.describe("completion flow", () => {
    test("ec.ready handshake drives ec.start then ec.complete", async ({ page }) => {
      const host = new CheckoutHostPage(page);
      const popup = await host.startCheckout({ src: CheckoutFixture.src(), target: "popup" });
      const syntheticCheckout = new ShopifyCheckoutPopup(popup);
      await syntheticCheckout.waitForReadyResponse();
      await syntheticCheckout.start();
      await syntheticCheckout.complete();

      await host.expectEvent("ec.complete");

      const types = (await host.receivedEvents()).map((event) => event.type);
      expect(types).not.toContain("ec.ready");
      expect(types.indexOf("ec.start")).toBeGreaterThanOrEqual(0);
      expect(types.indexOf("ec.start")).toBeLessThan(types.indexOf("ec.complete"));

      const checkout = await host.checkout();
      expect(checkout?.id).toBe(CheckoutFixture.CHECKOUT_ID);

      const complete = await host.eventDetail<{ order?: { id?: string } }>("ec.complete");
      expect(complete?.order?.id).toBe(CheckoutFixture.ORDER_ID);
    });
  });

  test.describe("change notifications", () => {
    test("updates checkout and dispatches line item, total, and message changes", async ({
      page,
    }) => {
      const host = new CheckoutHostPage(page);
      const popup = await host.startCheckout({ src: CheckoutFixture.src(), target: "popup" });
      const syntheticCheckout = new ShopifyCheckoutPopup(popup);
      await syntheticCheckout.waitForReadyResponse();
      await syntheticCheckout.start();
      await syntheticCheckout.lineItemsChange();
      await syntheticCheckout.totalsChange();
      await syntheticCheckout.messagesChange();

      await host.expectEvent("ec.messages.change");

      const events = await host.receivedEvents();
      const types = events.map((event) => event.type);
      expect(types).toEqual([
        "ec.start",
        "ec.line_items.change",
        "ec.totals.change",
        "ec.messages.change",
      ]);

      const lineItemsChange = await host.eventDetail<{
        lineItems?: Array<{ id?: string }>;
        checkout?: { id?: string };
      }>("ec.line_items.change");
      expect(lineItemsChange?.lineItems?.[0]?.id).toBe("li_1");
      expect(lineItemsChange?.checkout?.id).toBe(CheckoutFixture.CHECKOUT_ID);

      const totalsChange = await host.eventDetail<{
        totals?: Array<{ type?: string; amount?: number }>;
      }>("ec.totals.change");
      expect(totalsChange?.totals?.find((total) => total.type === "total")?.amount).toBe(2000);

      const messagesChange = await host.eventDetail<{
        messages?: Array<{ code?: string }>;
      }>("ec.messages.change");
      expect(messagesChange?.messages?.[0]?.code).toBe("inventory_updated");
    });
  });

  test.describe("window delegation", () => {
    test("opens the URL from ec.window.open_request in a new window", async ({
      context,
      page,
    }) => {
      const requestedUrl = "https://return.example.test/return?source=protocol-event";

      await context.route("https://return.example.test/**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: "<!doctype html><title>Return target</title>",
        }),
      );

      const host = new CheckoutHostPage(page);
      const popup = await host.startCheckout({ src: CheckoutFixture.src(), target: "popup" });
      const syntheticCheckout = new ShopifyCheckoutPopup(popup);
      await syntheticCheckout.waitForReadyResponse();
      await syntheticCheckout.openRequest(requestedUrl);

      const delegatedWindow = await page.waitForEvent("popup");
      await expect(delegatedWindow).toHaveURL(requestedUrl);
    });
  });

  test.describe("error flow", () => {
    test("unrecoverable ec.error populates error and auto-closes", async ({ page }) => {
      const host = new CheckoutHostPage(page);
      const popup = await host.startCheckout({ src: CheckoutFixture.src(), target: "popup" });
      const syntheticCheckout = new ShopifyCheckoutPopup(popup);
      await syntheticCheckout.waitForReadyResponse();
      await syntheticCheckout.error();

      await host.expectEvent("ec.error");

      const error = await host.error();
      expect(error?.messages[0]?.code).toBe(CheckoutFixture.ERROR_CODE);

      await host.expectEvent("ec.close");
      await expect.poll(() => popup.isClosed()).toBe(true);
    });
  });
});
