import type { ShopifyCheckout } from "@shopify/checkout-kit";
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

test.describe("blocked overlay", () => {
  test("switches from repeated blocking to an open popup without stale close listeners", async ({
    host,
    page,
  }) => {
    await page.addInitScript(() => {
      const open = window.open.bind(window);
      let attempts = 0;
      window.open = (...args) => (attempts++ < 2 ? null : open(...args));
    });
    await host.goto();
    await host.configure({ src: checkoutSrc() });
    await host.clickBuy();

    const retry = host.component.getByRole("button", { name: "Open checkout", exact: true });
    await expect(host.overlay).toHaveAttribute("data-state", "blocked");
    await expect(retry).toBeVisible();
    await expect(host.overlayCloseButton).toBeVisible();
    await expect(host.overlayFocusButton).not.toBeVisible();

    await retry.click();
    await expect.poll(() => host.eventTypes()).toEqual(["blocked", "blocked"]);
    await expect(host.overlay).toHaveAttribute("open", "");

    const [popup] = await Promise.all([page.waitForEvent("popup"), retry.click()]);
    await expect(host.overlayFocusButton).toBeVisible();
    await expect(retry).not.toBeVisible();
    await expect.poll(() => host.eventTypes()).toEqual(["blocked", "blocked"]);

    await host.overlayCloseButton.click();
    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(host.overlay).not.toBeVisible();
    await expect.poll(() => host.eventTypes()).toEqual(["blocked", "blocked", "close"]);
  });

  test("preserves custom content in both slots across a retry", async ({ host, page }) => {
    await page.addInitScript(() => {
      const open = window.open.bind(window);
      let blocked = true;
      window.open = (...args) => {
        if (!blocked) return open(...args);
        blocked = false;
        return null;
      };
    });
    await host.goto();
    await host.configure({ src: checkoutSrc() });
    await host.component.evaluate((element) => {
      const normal = document.createElement("p");
      normal.slot = "overlay";
      normal.textContent = "Custom checkout open";
      const retry = document.createElement("button");
      retry.slot = "overlay-blocked";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => (element as ShopifyCheckout).open());
      element.append(normal, retry);
    });
    await host.clickBuy();

    const retry = host.component.getByRole("button", { name: "Try again", exact: true });
    const normal = host.component.getByText("Custom checkout open", { exact: true });
    await expect(retry).toBeVisible();
    await expect(normal).not.toBeVisible();
    await expect(host.overlayCloseButton).not.toBeVisible();

    const [popup] = await Promise.all([page.waitForEvent("popup"), retry.click()]);
    await expect(normal).toBeVisible();
    await expect(retry).not.toBeVisible();
    await expect(host.overlayCloseButton).not.toBeVisible();
    await expect.poll(() => host.eventTypes()).toEqual(["blocked"]);

    await host.close();
    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect.poll(() => host.eventTypes()).toEqual(["blocked", "close"]);
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
