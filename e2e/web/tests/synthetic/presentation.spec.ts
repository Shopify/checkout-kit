import { expect, test } from "@playwright/test";

import { CheckoutFixture, CheckoutHostPage, EmbeddedCheckoutStub } from "../../support";

const HTTPS_SRC = CheckoutFixture.src();

test.describe("component registration", () => {
  test("upgrades <shopify-checkout> and attaches an open shadow root", async ({ page }) => {
    const host = new CheckoutHostPage(page);
    await host.goto();

    expect(await host.hasShadowWrapper()).toBe(true);
  });

  test("renders the overlay scrim structure in the shadow root", async ({ page }) => {
    const host = new CheckoutHostPage(page);
    await host.goto();

    await expect(host.overlay).toHaveCount(1);
    await expect(host.overlayLink).toHaveCount(1);
    await expect(host.overlayCloseButton).toHaveCount(1);
  });
});

test.describe("src reflection and overlay link", () => {
  test("reflects src and points the overlay link at the parametrised checkout URL", async ({
    page,
  }) => {
    const host = new CheckoutHostPage(page);
    await host.goto();
    await host.configure({ src: HTTPS_SRC });

    const href = await host.overlayLink.getAttribute("href");
    expect(href).not.toBeNull();

    const url = new URL(href!);
    expect(url.origin).toBe(CheckoutFixture.ORIGIN);
    expect(url.searchParams.get("ec_version")).toBe("2026-04-08");
    expect(url.searchParams.get("ec_delegate")).toBe("window.open");
    expect(url.searchParams.get("ck_version")).toBe("4.0.0");
  });

  test("leaves the overlay link without href for a non-https src", async ({ page }) => {
    const host = new CheckoutHostPage(page);
    await host.goto();
    await host.configure({ src: "http://shop.example.com/checkout" });

    await expect(host.overlayLink).not.toHaveAttribute("href", /.*/);
  });
});

test.describe("open()", () => {
  test("warns and opens no popup when src is empty", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning") warnings.push(msg.text());
    });

    let popped = false;
    page.on("popup", () => {
      popped = true;
    });

    const host = new CheckoutHostPage(page);
    await host.goto();
    await host.clickBuy();
    await page.waitForTimeout(200);

    expect(popped).toBe(false);
    expect(warnings.join("\n")).toContain("src property is empty or invalid");
  });

  test("opens a popup and shows the modal scrim for an https popup target", async ({
    page,
    context,
  }) => {
    await EmbeddedCheckoutStub.blank(context);

    const host = new CheckoutHostPage(page);
    const popup = await host.startCheckout({ src: HTTPS_SRC, target: "popup" });
    expect(popup).toBeTruthy();

    await expect(host.overlay).toHaveAttribute("open", "");
  });

  test("close() dismisses the popup and dispatches ec.close", async ({ page, context }) => {
    await EmbeddedCheckoutStub.blank(context);

    const host = new CheckoutHostPage(page);
    const popup = await host.startCheckout({ src: HTTPS_SRC, target: "popup" });
    await expect(host.overlay).toHaveAttribute("open", "");

    await host.close();

    await host.expectEvent("ec.close");
    await expect.poll(() => popup.isClosed()).toBe(true);
  });
});
