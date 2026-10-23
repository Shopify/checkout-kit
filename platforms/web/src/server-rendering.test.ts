// @vitest-environment node
import { expect, it } from "vitest";

it("imports the SDK entry points without a DOM, and registers nothing", async () => {
  expect(globalThis.customElements).toBeUndefined();

  const { ShopifyCheckout } = await import("./index");
  await import("./shopify-checkout");

  expect(typeof ShopifyCheckout.register).toBe("function");
});
