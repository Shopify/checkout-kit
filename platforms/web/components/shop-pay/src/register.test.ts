import { describe, expect, it, vi } from "vitest";

import "./register";
import { ShopPay } from "./shop-pay";

describe("ShopPay.register", () => {
  it("registers the class itself as <shop-pay> from the component entry", () => {
    expect(customElements.get("shop-pay")).toBe(ShopPay);
    expect(document.createElement("shop-pay")).toBeInstanceOf(ShopPay);
  });

  it("returns the existing class when the name is already registered by it", () => {
    expect(ShopPay.register()).toBe(ShopPay);
  });

  it("defines a subclass for a custom tag name, once", () => {
    const Custom = ShopPay.register("custom-shop-pay");

    expect(Custom).not.toBe(ShopPay);
    expect(Custom.prototype).toBeInstanceOf(ShopPay);
    expect(customElements.get("custom-shop-pay")).toBe(Custom);
    const element = document.createElement("custom-shop-pay");
    expect(element).toBeInstanceOf(ShopPay);
    expect(typeof (element as ShopPay).open).toBe("function");
    expect(ShopPay.register("custom-shop-pay")).toBe(Custom);
  });

  it("registers subclasses under their own names", () => {
    class BrandedCheckout extends ShopPay {}

    const Branded = BrandedCheckout.register("branded-shop-pay");

    expect(Branded.prototype).toBeInstanceOf(BrandedCheckout);
    expect(document.createElement("branded-shop-pay")).toBeInstanceOf(BrandedCheckout);
    expect(BrandedCheckout.register("branded-shop-pay")).toBe(Branded);
  });

  it("throws when another element already uses the name", () => {
    customElements.define("foreign-shop-pay", class extends HTMLElement {});

    expect(() => ShopPay.register("foreign-shop-pay")).toThrow(
      "Cannot register <foreign-shop-pay>: another element already uses that name.",
    );
  });

  it("defines the element in the given registry", () => {
    const define = vi.fn();
    const registry = { get: () => undefined, define } as unknown as CustomElementRegistry;

    expect(ShopPay.register(undefined, registry)).toBe(ShopPay);
    expect(define).toHaveBeenCalledWith("shop-pay", ShopPay);
  });
});
