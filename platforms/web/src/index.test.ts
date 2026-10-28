import { describe, expect, it } from "vitest";

import * as pkg from "./index";

describe("@shopify/checkout-kit public entry", () => {
  it("exports only the three component constructors at runtime", () => {
    expect(new Set(Object.keys(pkg))).toEqual(
      new Set(["ShopPay", "ShopifyCheckout", "ShopifyUniversalCheckout"]),
    );
    for (const Component of Object.values(pkg)) {
      expect(typeof Component).toBe("function");
      expect(Component.prototype).toBeInstanceOf(HTMLElement);
    }
  });

  it("does not register any element when imported", () => {
    for (const tag of ["shopify-checkout", "shopify-universal-checkout", "shop-pay"]) {
      expect(customElements.get(tag)).toBeUndefined();
    }
  });
});
