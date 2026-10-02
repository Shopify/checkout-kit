import packageJson from "@shopify/checkout-kit/package.json" with { type: "json" };
import { checkoutOrigin, checkoutSrc, expect, test } from "../../support";

test.use({ checkoutStub: "blank" });

test.describe("component registration", () => {
  test("upgrades <shopify-checkout> and attaches an open shadow root", async ({ host }) => {
    await host.goto();

    expect(await host.hasShadowWrapper()).toBe(true);
  });

  test("renders the overlay controls when checkout opens", async ({ host }) => {
    await host.startCheckout();

    await expect(host.overlay).toBeVisible();
    await expect(host.overlayFocusButton).toBeVisible();
    await expect(host.overlayCloseButton).toBeVisible();
  });
});

test.describe("src reflection and popup URL", () => {
  test("reflects src and adds negotiation parameters to the popup URL", async ({ host }) => {
    const src = checkoutSrc({ source: "browser-test" });
    const popup = await host.startCheckout({ src });

    await expect(host.component).toHaveAttribute("src", src);
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
  test("dispatches unsupported_browser without opening a popup when native dialogs are unavailable", async ({
    host,
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value: undefined,
      });
    });

    await host.goto();
    await host.clickBuy();

    await host.expectEvent("error");
    await expect
      .poll(() => host.error())
      .toEqual({
        code: "unsupported_browser",
        message: "This browser does not support: native_dialog.",
      });
    await expect.poll(() => host.eventTypes()).toEqual(["error"]);
    expect(context.pages()).toHaveLength(1);
    await expect(host.overlay).not.toBeVisible();
  });

  for (const { name, src } of [
    { name: "empty", src: "" },
    { name: "non-HTTPS", src: "http://checkout.example.test/checkout" },
    { name: "malformed", src: "not-a-url" },
  ]) {
    test(`warns and opens no popup when src is ${name}`, async ({ host, page, context }) => {
      await host.goto();
      await host.configure({ src, logLevel: "warn" });

      const [warning] = await Promise.all([
        page.waitForEvent(
          "console",
          (message) =>
            message.type() === "warning" &&
            message.text().includes("src property is empty or invalid"),
        ),
        host.clickBuy(),
      ]);

      expect(warning.text()).toContain("src property is empty or invalid");
      expect(context.pages()).toHaveLength(1);
      await expect(host.overlay).not.toBeVisible();
    });
  }

  test("opens a popup and shows the modal scrim", async ({ host }) => {
    const popup = await host.startCheckout();

    expect(popup.isClosed()).toBe(false);
    await expect(host.overlay).toBeVisible();
    await expect(host.overlay).toHaveAttribute("open", "");
  });
});

test.describe("closing checkout", () => {
  test("close() dismisses the popup and dispatches close", async ({ host }) => {
    const popup = await host.startCheckout();
    await expect(host.overlay).toBeVisible();

    await host.close();

    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(host.overlay).not.toBeVisible();
    await expect.poll(() => host.eventTypes()).toEqual(["close"]);
  });

  test("the overlay close button dismisses the popup and dispatches close", async ({ host }) => {
    const popup = await host.startCheckout();

    await host.overlayCloseButton.click();

    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(host.overlay).not.toBeVisible();
    await expect.poll(() => host.eventTypes()).toEqual(["close"]);
  });
});
