import { describe, expect, it, vi } from "vitest";

import { ShopifyAcceleratedCheckoutButtons } from "./wallets-index";

const tagName = "shopify-accelerated-checkout-buttons";

describe("accelerated checkout buttons element shell", () => {
  it("renders an accessible wallet mount without runtime behavior", () => {
    const element = document.createElement(tagName);
    const root = element.shadowRoot?.querySelector('[part="root"]');

    expect(root?.getAttribute("role")).toBe("group");
    expect(root?.getAttribute("aria-label")).toBe("Accelerated checkout");
    expect(root?.children).toHaveLength(0);
  });

  it("registers synchronously and tolerates the registration module being evaluated again", async () => {
    await import("./wallets-index");
    const registered = customElements.get(tagName);

    expect(registered).toBe(ShopifyAcceleratedCheckoutButtons);

    vi.resetModules();
    const secondCopy = await import("./wallets-index");

    expect(customElements.get(tagName)).toBe(registered);
    expect(secondCopy.ShopifyAcceleratedCheckoutButtons).toBe(registered);
    expect(() => new secondCopy.ShopifyAcceleratedCheckoutButtons()).not.toThrow();
  });
});
