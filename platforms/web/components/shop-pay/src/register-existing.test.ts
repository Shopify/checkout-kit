import { describe, expect, it } from "vitest";

// Separate file: the component entry must load before anything registers <shop-pay>.
describe("shop-pay component entry with an existing registration", () => {
  it("leaves an existing registration in place instead of throwing", async () => {
    class Existing extends HTMLElement {}
    customElements.define("shop-pay", Existing);

    await expect(import("./register")).resolves.toBeDefined();

    expect(customElements.get("shop-pay")).toBe(Existing);
  });
});
