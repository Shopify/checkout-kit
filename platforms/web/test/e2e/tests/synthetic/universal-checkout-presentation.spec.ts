import packageJson from "@shopify/checkout-kit/package.json" with { type: "json" };
import {
  checkoutOrigin,
  expect,
  test,
  universalCheckoutSrc,
  universalShops,
  universalStartedEntries,
} from "../../support";

test.use({ checkoutStub: "universal" });

test.describe("src reflection and popup URL", () => {
  test("reflects src and adds negotiation parameters to the popup URL", async ({
    universalHost,
  }) => {
    const src = universalCheckoutSrc({
      shops: String(universalShops.length),
      source: "browser-test",
    });
    const popup = await universalHost.startCheckout({ src });

    await expect(universalHost.component).toHaveAttribute("src", src);
    await expect(popup.page).toHaveURL(
      (url) => url.origin === checkoutOrigin && url.searchParams.get("ec_version") !== null,
    );
    const url = new URL(popup.page.url());
    expect(url.pathname).toBe(new URL(src).pathname);
    expect(url.searchParams.get("source")).toBe("browser-test");
    expect(url.searchParams.get("ec_version")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(url.searchParams.get("ec_delegate")).toBe("window.open");
    expect(url.searchParams.get("ck_version")).toBe(packageJson.version);
  });
});

test.describe("open()", () => {
  test("dispatches blocked and opens checkout from the overlay's retry button without dispatching close", async ({
    universalHost,
    page,
    context,
  }) => {
    // Make the first window.open() return null, as a popup blocker does.
    await page.addInitScript(() => {
      const open = window.open.bind(window);
      let blocked = false;
      window.open = (...args: Parameters<typeof window.open>) => {
        if (blocked) return open(...args);
        blocked = true;
        return null;
      };
    });
    await universalHost.prepareCheckout();

    await universalHost.clickBuy();

    await expect
      .poll(() => universalHost.receivedEvents())
      .toEqual([{ type: "blocked", detail: { code: "popup_blocked" } }]);
    await expect(universalHost.overlayRetryButton).toBeVisible();
    expect(context.pages()).toHaveLength(1);

    const popup = await universalHost.retryFromOverlay();

    await expect(universalHost.overlay).toBeVisible();
    await expect(universalHost.overlayRetryButton).not.toBeVisible();
    await popup.waitForReadyResponse();
    await popup.start();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["blocked", "start"]);
    expect(await universalHost.eventDetails("start")).toEqual([universalStartedEntries]);
  });

  for (const { name, src } of [
    { name: "empty", src: "" },
    { name: "non-HTTPS", src: "http://checkout.example.test/checkout" },
    { name: "malformed", src: "not-a-url" },
  ]) {
    test(`warns and opens no popup when src is ${name}`, async ({
      universalHost,
      page,
      context,
    }) => {
      await universalHost.goto();
      await universalHost.configure({ src, logLevel: "warn" });

      const [warning] = await Promise.all([
        page.waitForEvent(
          "console",
          (message) =>
            message.type() === "warning" &&
            message.text().includes("src property is empty or invalid"),
        ),
        universalHost.clickBuy(),
      ]);

      expect(warning.text()).toContain("src property is empty or invalid");
      await expect
        .poll(() => universalHost.receivedEvents())
        .toEqual([
          {
            type: "error",
            detail: [{ error: { code: "sdk_error", message: "Checkout URL is invalid." } }],
          },
        ]);
      expect(context.pages()).toHaveLength(1);
      await expect(universalHost.overlay).not.toBeVisible();
    });
  }

  test("opens checkout and completes the handshake with the default auto target", async ({
    universalHost,
    page,
  }) => {
    await universalHost.prepareCheckout();
    await universalHost.component.evaluate((checkout) => checkout.removeAttribute("target"));

    const popup = await universalHost.openPopup();

    expect(await universalHost.target()).toBe("auto");
    // Unlike the popup target, auto doesn't size the window, so it opens at the host's width.
    expect(await popup.page.evaluate(() => window.outerWidth)).toBe(
      await page.evaluate(() => window.outerWidth),
    );
    await expect(universalHost.overlay).toBeVisible();
    await popup.waitForReadyResponse();
    await popup.start();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["start"]);
    expect(await universalHost.eventDetails("start")).toEqual([universalStartedEntries]);

    await universalHost.close();

    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(universalHost.overlay).not.toBeVisible();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "close"]);
  });
});

test.describe("closing checkout", () => {
  test("dispatches close when the host regains focus after the buyer closes the checkout window", async ({
    universalHost,
  }) => {
    const popup = await universalHost.startCheckout();
    await popup.waitForReadyResponse();
    await popup.start();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["start"]);

    await popup.close();
    // The element only notices a closed window when the host window regains focus.
    await universalHost.focus();

    await expect(universalHost.overlay).not.toBeVisible();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "close"]);
  });

  test("pressing Escape dismisses the overlay, closes checkout, and dispatches close", async ({
    universalHost,
    page,
  }) => {
    const popup = await universalHost.startCheckout();
    await popup.waitForReadyResponse();
    await popup.start();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["start"]);
    await expect(universalHost.overlay).toBeVisible();

    await page.keyboard.press("Escape");

    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(universalHost.overlay).not.toBeVisible();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["start", "close"]);
  });

  test("reopens checkout when the buyer buys again after closing during Shop sign-in", async ({
    universalHost,
  }) => {
    const signInPopup = await universalHost.startCheckout({ signedOut: true });
    await expect(universalHost.overlay).toBeVisible();

    await universalHost.overlayCloseButton.click();

    await expect.poll(() => signInPopup.isClosed()).toBe(true);
    await expect(universalHost.overlay).not.toBeVisible();
    await expect.poll(() => universalHost.eventTypes()).toEqual(["close"]);

    const popup = await universalHost.openPopup();
    await expect(universalHost.overlay).toBeVisible();
    await popup.signIn();
    await popup.waitForReadyResponse();
    await popup.start();

    await expect.poll(() => universalHost.eventTypes()).toEqual(["close", "start"]);
    expect(await universalHost.eventDetails("start")).toEqual([universalStartedEntries]);
  });
});
