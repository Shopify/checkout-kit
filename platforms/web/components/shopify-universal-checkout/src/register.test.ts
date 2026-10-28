import { describe, expect, it, vi } from "vitest";

import "./register";
import { ShopifyUniversalCheckout } from "./shopify-universal-checkout";

describe("ShopifyUniversalCheckout.register", () => {
  it("registers the class itself as <shopify-universal-checkout> from the component entry", () => {
    expect(customElements.get("shopify-universal-checkout")).toBe(ShopifyUniversalCheckout);
    expect(document.createElement("shopify-universal-checkout")).toBeInstanceOf(
      ShopifyUniversalCheckout,
    );
  });

  it("returns the existing class when the name is already registered by it", () => {
    expect(ShopifyUniversalCheckout.register()).toBe(ShopifyUniversalCheckout);
  });

  it("defines a subclass for a custom tag name, once", () => {
    const Custom = ShopifyUniversalCheckout.register("custom-universal-checkout");

    expect(Custom).not.toBe(ShopifyUniversalCheckout);
    expect(Custom.prototype).toBeInstanceOf(ShopifyUniversalCheckout);
    expect(customElements.get("custom-universal-checkout")).toBe(Custom);
    const element = document.createElement("custom-universal-checkout");
    expect(element).toBeInstanceOf(ShopifyUniversalCheckout);
    expect(typeof (element as ShopifyUniversalCheckout).open).toBe("function");
    expect(ShopifyUniversalCheckout.register("custom-universal-checkout")).toBe(Custom);
  });

  it("registers subclasses under their own names", () => {
    class BrandedCheckout extends ShopifyUniversalCheckout {}

    const Branded = BrandedCheckout.register("branded-universal-checkout");

    expect(Branded.prototype).toBeInstanceOf(BrandedCheckout);
    expect(document.createElement("branded-universal-checkout")).toBeInstanceOf(BrandedCheckout);
    expect(BrandedCheckout.register("branded-universal-checkout")).toBe(Branded);
  });

  it("throws when another element already uses the name", () => {
    customElements.define("foreign-universal-checkout", class extends HTMLElement {});

    expect(() => ShopifyUniversalCheckout.register("foreign-universal-checkout")).toThrow(
      "Cannot register <foreign-universal-checkout>: another element already uses that name.",
    );
  });

  it("defines the element in the given registry", () => {
    const define = vi.fn();
    const registry = { get: () => undefined, define } as unknown as CustomElementRegistry;

    expect(ShopifyUniversalCheckout.register(undefined, registry)).toBe(ShopifyUniversalCheckout);
    expect(define).toHaveBeenCalledWith("shopify-universal-checkout", ShopifyUniversalCheckout);
  });
});
