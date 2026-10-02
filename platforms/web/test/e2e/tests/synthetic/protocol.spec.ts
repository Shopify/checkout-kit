import { checkoutId, checkoutOrigin, expect, orderId, startedCheckout, test } from "../../support";

test.describe("embedded checkout protocol", () => {
  test.describe("completion flow", () => {
    test("handshakes, starts, completes, and leaves closing to the host", async ({ host }) => {
      const popup = await host.startCheckout();
      await expect(host.overlay).toBeVisible();
      await popup.waitForReadyResponse();
      expect(await host.receivedEvents()).toEqual([]);

      await popup.start();

      await expect
        .poll(() => host.receivedEvents())
        .toEqual([{ type: "start", detail: { checkout: startedCheckout } }]);
      expect(await host.checkout()).toEqual(startedCheckout);

      await popup.complete();

      await expect.poll(() => host.eventTypes()).toEqual(["start", "complete"]);
      const complete = await host.eventDetail("complete");
      expect(complete?.checkout).toMatchObject({
        id: checkoutId,
        status: "completed",
        order: {
          id: orderId,
          permalinkUrl: `${checkoutOrigin}/orders/${orderId}`,
        },
      });
      expect(complete?.checkout).not.toHaveProperty("ucp");
      expect(await host.checkout()).toEqual(complete?.checkout);
      expect(popup.isClosed()).toBe(false);
      await expect(host.overlay).toBeVisible();

      await host.close();

      await expect.poll(() => popup.isClosed()).toBe(true);
      await expect(host.overlay).not.toBeVisible();
      await expect.poll(() => host.eventTypes()).toEqual(["start", "complete", "close"]);
    });
  });

  test.describe("change notifications", () => {
    test("ec.line_items.change updates line items and dispatches update", async ({ host }) => {
      const popup = await host.startCheckout();
      await popup.waitForReadyResponse();
      await popup.start();
      await host.expectEvent("start");

      await popup.lineItemsChange();

      await expect.poll(() => host.eventTypes()).toEqual(["start", "update"]);
      const update = await host.eventDetail("update");
      expect(update?.checkout).toMatchObject({
        id: checkoutId,
        lineItems: [{ id: "li_1", quantity: 2, totals: [{ type: "total", amount: 4000 }] }],
        totals: [{ type: "total", amount: 4000 }],
      });
      expect(update?.checkout).not.toHaveProperty("ucp");
      expect(await host.checkout()).toEqual(update?.checkout);
    });

    test("ec.totals.change updates totals and dispatches update", async ({ host }) => {
      const popup = await host.startCheckout();
      await popup.waitForReadyResponse();
      await popup.start();
      await host.expectEvent("start");

      await popup.totalsChange();

      await expect.poll(() => host.eventTypes()).toEqual(["start", "update"]);
      const update = await host.eventDetail("update");
      expect(update?.checkout).toMatchObject({
        id: checkoutId,
        totals: [{ type: "total", amount: 2500 }],
      });
      expect(await host.checkout()).toEqual(update?.checkout);
    });

    test("ec.messages.change updates messages and dispatches update", async ({ host }) => {
      const popup = await host.startCheckout();
      await popup.waitForReadyResponse();
      await popup.start();
      await host.expectEvent("start");

      await popup.messagesChange();

      await expect.poll(() => host.eventTypes()).toEqual(["start", "update"]);
      const update = await host.eventDetail("update");
      expect(update?.checkout).toMatchObject({
        id: checkoutId,
        messages: [{ code: "inventory_updated", content: "Inventory changed." }],
      });
      expect(await host.checkout()).toEqual(update?.checkout);
    });
  });

  test.describe("window delegation", () => {
    test("opens the URL from ec.window.open_request in a new window", async ({ host, context }) => {
      const requestedUrl = "https://return.example.test/return?source=protocol-event";
      await context.route(requestedUrl, (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Return target</title>",
        }),
      );
      const popup = await host.startCheckout();
      await popup.waitForReadyResponse();

      // The SDK uses noopener, so the delegated window belongs to the context
      // without being exposed as a popup of the host page.
      const [delegatedWindow] = await Promise.all([
        context.waitForEvent("page"),
        popup.openRequest(requestedUrl),
      ]);

      await expect(delegatedWindow).toHaveURL(requestedUrl);
      expect(popup.isClosed()).toBe(false);
    });
  });

  test.describe("error flow", () => {
    test("terminal ec.error populates error and closes the popup", async ({ host }) => {
      const popup = await host.startCheckout();
      await popup.waitForReadyResponse();

      await popup.error();

      await expect.poll(() => host.eventTypes()).toEqual(["error", "close"]);
      const error = { code: "invalid_cart", message: "The cart is no longer valid." };
      expect(await host.error()).toEqual(error);
      expect(await host.eventDetail("error")).toEqual({ error });
      await expect.poll(() => popup.isClosed()).toBe(true);
      await expect(host.overlay).not.toBeVisible();
    });
  });
});
