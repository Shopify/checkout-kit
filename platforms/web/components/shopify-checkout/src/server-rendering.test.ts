// @vitest-environment node
import { expect, it } from "vitest";

it("imports without a DOM, and registers nothing", async () => {
  expect(globalThis.customElements).toBeUndefined();

  const { ShopifyCheckout } = await import("./index");
  await import("./register");

  expect(typeof ShopifyCheckout.register).toBe("function");
});
