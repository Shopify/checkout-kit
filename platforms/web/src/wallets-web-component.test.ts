import { afterEach, describe, expect, it } from "vitest";

import { ShopifyAcceleratedCheckoutButtons } from "./wallets";

// Import the registration side-effect.
import "./wallets-web-component";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("wallets-web-component registration", () => {
  it("registers the element", () => {
    expect(customElements.get("shopify-accelerated-checkout-buttons")).toBe(
      ShopifyAcceleratedCheckoutButtons,
    );
  });

  it("is idempotent — re-importing does not throw", async () => {
    // The guard in wallets-web-component.ts prevents double-define.
    // A second dynamic import should not throw.
    await expect(import("./wallets-web-component")).resolves.toBeDefined();
    expect(customElements.get("shopify-accelerated-checkout-buttons")).toBe(
      ShopifyAcceleratedCheckoutButtons,
    );
  });

  it("creates instances via document.createElement", () => {
    const el = document.createElement("shopify-accelerated-checkout-buttons");
    expect(el).toBeInstanceOf(ShopifyAcceleratedCheckoutButtons);
  });
});
