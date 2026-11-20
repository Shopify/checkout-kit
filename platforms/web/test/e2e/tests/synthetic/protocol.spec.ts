import type { Page, Request } from "@playwright/test";

import { checkoutId, checkoutOrigin, expect, orderId, startedCheckout, test } from "../../support";

// Playwright has no frame for a navigation that starts a new window, because
// the request is issued before the frame exists.
function issuingPage(request: Request): Page | undefined {
  try {
    return request.frame().page();
  } catch {
    return undefined;
  }
}

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
      const [delegatedWindow, status] = await Promise.all([
        context.waitForEvent("page"),
        popup.openRequest(requestedUrl),
      ]);

      expect(status).toBe("success");
      await expect(delegatedWindow).toHaveURL(requestedUrl);
      expect(popup.isClosed()).toBe(false);
    });

    for (const url of ["mailto:help@example.com?subject=Order", "tel:+15555550123"]) {
      const scheme = new URL(url).protocol;

      test(`hands a ${scheme} URL to the browser from a new window`, async ({ host, context }) => {
        const popup = await host.startCheckout();
        await popup.waitForReadyResponse();
        const hostUrl = host.page.url();

        // The browser passes the URL to the mail or phone app, so no page stays
        // open. The navigation request shows which window opened it.
        const navigations: Request[] = [];
        context.on("request", (request) => {
          if (request.url() === url && request.isNavigationRequest()) navigations.push(request);
        });

        expect(await popup.openRequest(url)).toBe("success");
        await expect.poll(() => navigations.length).toBe(1);
        const [navigation] = navigations;
        const opener = issuingPage(navigation);
        expect(opener, "the host page must not navigate").not.toBe(host.page);
        expect(opener, "checkout must not navigate").not.toBe(popup.page);
        expect(host.page.url()).toBe(hostUrl);
        expect(popup.isClosed()).toBe(false);
      });
    }

    test("rejects ec.window.open_request URLs with other schemes", async ({ host, context }) => {
      const popup = await host.startCheckout({ logLevel: "error" });
      await popup.waitForReadyResponse();
      const rejectedUrls = [
        "http://return.example.test/return",
        "javascript:alert(1)",
        "data:text/html,checkout",
        "sms:+15555550123",
      ];
      const requested: string[] = [];
      context.on("request", (request) => requested.push(request.url()));

      for (const url of rejectedUrls) {
        expect(await popup.openRequest(url), url).toBe("error");
      }

      expect(requested.filter((url) => rejectedUrls.includes(url))).toEqual([]);
      expect(context.pages()).toEqual([host.page, popup.page]);
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
