import {
  checkoutOrigin,
  expect,
  test,
  universalContext,
  universalEjectionFailure,
  universalShops,
  universalStartedCheckout,
  universalStartedEntries,
  type UniversalShop,
} from "../../support";

test.use({ checkoutStub: "universal" });

const [firstShop, secondShop] = universalShops;

function readyCheckout(shop: UniversalShop) {
  return { ...universalStartedCheckout(shop), status: "ready_for_complete" };
}

function completedCheckout(shop: UniversalShop) {
  return {
    ...universalStartedCheckout(shop),
    status: "completed",
    order: { id: shop.orderId, permalinkUrl: `${checkoutOrigin}/orders/${shop.orderId}` },
  };
}

test.describe("universal checkout protocol", () => {
  test.describe("completion flow", () => {
    test("handshakes every shop, starts, completes each shop, and leaves closing to the host", async ({
      universalHost,
    }) => {
      const popup = await universalHost.startCheckout();
      await expect(universalHost.overlay).toBeVisible();
      await popup.waitForReadyResponse();
      expect(await universalHost.receivedEvents()).toEqual([]);

      await popup.start();

      await expect
        .poll(() => universalHost.receivedEvents())
        .toEqual([{ type: "start", detail: universalStartedEntries }]);

      await popup.complete(firstShop);

      await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "complete"]);
      expect(await universalHost.eventDetails("complete")).toEqual([
        [
          {
            context: universalContext(firstShop, 2, "completed"),
            checkout: completedCheckout(firstShop),
          },
        ],
      ]);
      expect(popup.isClosed()).toBe(false);

      await popup.complete(secondShop);

      await expect
        .poll(() => universalHost.eventTypes())
        .toEqual(["start", "complete", "complete"]);
      expect(await universalHost.eventDetails("complete")).toEqual([
        [
          {
            context: universalContext(firstShop, 2, "completed"),
            checkout: completedCheckout(firstShop),
          },
        ],
        [
          {
            context: universalContext(secondShop, 3, "completed"),
            checkout: completedCheckout(secondShop),
          },
        ],
      ]);
      expect(popup.isClosed()).toBe(false);
      await expect(universalHost.overlay).toBeVisible();

      await universalHost.close();

      await expect.poll(() => popup.isClosed()).toBe(true);
      await expect(universalHost.overlay).not.toBeVisible();
      await expect
        .poll(() => universalHost.eventTypes())
        .toEqual(["start", "complete", "complete", "close"]);
    });
  });

  test.describe("change notifications", () => {
    test("ec.update dispatches update with the changed shop's snapshot", async ({
      universalHost,
    }) => {
      const popup = await universalHost.startCheckout();
      await popup.waitForReadyResponse();
      await popup.start();
      await expect.poll(() => universalHost.eventTypes()).toEqual(["start"]);

      await popup.update(secondShop);

      await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "update"]);
      expect(await universalHost.eventDetails("update")).toEqual([
        [
          {
            context: universalContext(secondShop, 2, "active"),
            checkout: readyCheckout(secondShop),
          },
        ],
      ]);
    });
  });

  test.describe("error flow", () => {
    test("reports an ejected shop, completes the other, and leaves closing to the host", async ({
      universalHost,
    }) => {
      const popup = await universalHost.startCheckout();
      await popup.waitForReadyResponse();
      await popup.start();
      await expect.poll(() => universalHost.eventTypes()).toEqual(["start"]);

      await popup.eject(firstShop);

      await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "error"]);
      expect(await universalHost.eventDetails("error")).toEqual([
        [
          {
            context: universalContext(firstShop, 2, "ejected"),
            checkout: universalStartedCheckout(firstShop),
            error: universalEjectionFailure,
          },
        ],
      ]);
      expect(popup.isClosed()).toBe(false);

      await popup.complete(secondShop);

      await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "error", "complete"]);
      expect(await universalHost.eventDetails("complete")).toEqual([
        [
          {
            context: universalContext(secondShop, 3, "completed"),
            checkout: completedCheckout(secondShop),
          },
        ],
      ]);
      expect(popup.isClosed()).toBe(false);
      await expect(universalHost.overlay).toBeVisible();

      await universalHost.close();

      await expect.poll(() => popup.isClosed()).toBe(true);
      await expect(universalHost.overlay).not.toBeVisible();
      await expect
        .poll(() => universalHost.eventTypes())
        .toEqual(["start", "error", "complete", "close"]);
    });
  });
});
