import { describe, expect, it, vi } from "vitest";

import "./register";
import { ShopifyCheckout } from "./shopify-checkout";

describe("ShopifyCheckout.register", () => {
  it("registers the class itself as <shopify-checkout> from the component entry", () => {
    expect(customElements.get("shopify-checkout")).toBe(ShopifyCheckout);
    expect(document.createElement("shopify-checkout")).toBeInstanceOf(ShopifyCheckout);
  });

  it("returns the existing class when the name is already registered by it", () => {
    expect(ShopifyCheckout.register()).toBe(ShopifyCheckout);
  });

  it("defines a subclass for a custom tag name, once", () => {
    const Custom = ShopifyCheckout.register("custom-checkout");

    expect(Custom).not.toBe(ShopifyCheckout);
    expect(Custom.prototype).toBeInstanceOf(ShopifyCheckout);
    expect(customElements.get("custom-checkout")).toBe(Custom);
    const element = document.createElement("custom-checkout");
    expect(element).toBeInstanceOf(ShopifyCheckout);
    expect(typeof (element as ShopifyCheckout).open).toBe("function");
    expect(ShopifyCheckout.register("custom-checkout")).toBe(Custom);
  });

  it("registers subclasses under their own names", () => {
    class BrandedCheckout extends ShopifyCheckout {}

    const Branded = BrandedCheckout.register("branded-checkout");

    expect(Branded.prototype).toBeInstanceOf(BrandedCheckout);
    expect(document.createElement("branded-checkout")).toBeInstanceOf(BrandedCheckout);
    expect(BrandedCheckout.register("branded-checkout")).toBe(Branded);
  });

  it("throws when another element already uses the name", () => {
    customElements.define("foreign-checkout", class extends HTMLElement {});

    expect(() => ShopifyCheckout.register("foreign-checkout")).toThrow(
      "Cannot register <foreign-checkout>: another element already uses that name.",
    );
  });

  it("defines the element in the given registry", () => {
    const define = vi.fn();
    const registry = { get: () => undefined, define } as unknown as CustomElementRegistry;

    expect(ShopifyCheckout.register(undefined, registry)).toBe(ShopifyCheckout);
    expect(define).toHaveBeenCalledWith("shopify-checkout", ShopifyCheckout);
  });
});
