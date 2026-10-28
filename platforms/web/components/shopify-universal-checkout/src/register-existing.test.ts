import { describe, expect, it } from "vitest";

// Separate file: the component entry must load before anything registers <shopify-universal-checkout>.
describe("shopify-universal-checkout component entry with an existing registration", () => {
  it("leaves an existing registration in place instead of throwing", async () => {
    class Existing extends HTMLElement {}
    customElements.define("shopify-universal-checkout", Existing);

    await expect(import("./register")).resolves.toBeDefined();

    expect(customElements.get("shopify-universal-checkout")).toBe(Existing);
  });
});
