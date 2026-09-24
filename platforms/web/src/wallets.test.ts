import { describe, expect, it, vi } from "vitest";

import { ShopifyAcceleratedCheckoutButtons } from "./wallets-index";
import type { GetCart, WalletCallbacks } from "./wallets.types";

const tagName = "shopify-accelerated-checkout-buttons";

function createElement(): ShopifyAcceleratedCheckoutButtons {
  return document.createElement(tagName);
}

describe("accelerated checkout buttons element", () => {
  it("renders an accessible wallet mount without runtime behavior", () => {
    const root = createElement().shadowRoot?.querySelector('[part="root"]');

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

  it("keeps scalar attributes and properties equivalent", () => {
    const element = createElement();

    element.setAttribute("store-domain", "example.myshopify.com");
    element.setAttribute("country", "CA");
    element.setAttribute("locale", "fr-CA");
    element.setAttribute("currency", "CAD");

    expect(element.storeDomain).toBe("example.myshopify.com");
    expect(element.country).toBe("CA");
    expect(element.locale).toBe("fr-CA");
    expect(element.currency).toBe("CAD");

    element.variantId = "gid://shopify/ProductVariant/1";
    element.sellingPlanId = "gid://shopify/SellingPlan/2";
    element.layout = "vertical";

    expect(element.getAttribute("variant-id")).toBe("gid://shopify/ProductVariant/1");
    expect(element.getAttribute("selling-plan-id")).toBe("gid://shopify/SellingPlan/2");
    expect(element.getAttribute("layout")).toBe("vertical");

    element.setAttribute("layout", "diagonal");
    expect(element.layout).toBeUndefined();
  });

  it("clears nullable properties instead of reflecting the string null", () => {
    const element = createElement();

    element.configure({
      storeDomain: "example.myshopify.com",
      sellingPlanId: "gid://shopify/SellingPlan/2",
      cartId: "existing-cart-reference",
    });
    element.configure({ storeDomain: null, sellingPlanId: null, cartId: null });

    expect(element.storeDomain).toBeUndefined();
    expect(element.sellingPlanId).toBeUndefined();
    expect(element.cartId).toBeUndefined();
    expect(element.outerHTML).not.toContain("null");
  });

  it("keeps the opaque existing-cart reference out of markup", () => {
    const element = createElement();

    element.cartId = "existing-cart-reference";

    expect(element.cartId).toBe("existing-cart-reference");
    expect(element.hasAttribute("cart-id")).toBe(false);
    expect(element.outerHTML).not.toContain("existing-cart-reference");
  });

  it("upgrades properties that would otherwise shadow class accessors", () => {
    const element = createElement();
    const getCart: GetCart = vi.fn().mockResolvedValue("created-cart-reference");
    const callbacks: WalletCallbacks = { ready: vi.fn() };

    Object.defineProperties(element, {
      locale: { configurable: true, value: "en-CA", writable: true },
      cartId: { configurable: true, value: "existing-cart-reference", writable: true },
      getCart: { configurable: true, value: getCart, writable: true },
      callbacks: { configurable: true, value: callbacks, writable: true },
    });
    document.body.append(element);

    expect(element.locale).toBe("en-CA");
    expect(element.cartId).toBe("existing-cart-reference");
    expect(element.getCart).toBe(getCart);
    expect(element.callbacks).toBe(callbacks);
    expect(Object.hasOwn(element, "getCart")).toBe(false);

    element.remove();
  });

  it("normalizes walletCount while preserving zero as the all-wallets default", () => {
    const element = createElement();

    element.walletCount = 3.8;
    expect(element.walletCount).toBe(3);
    expect(element.getAttribute("wallet-count")).toBe("3");

    element.walletCount = 0.5;
    expect(element.walletCount).toBe(0);
    expect(element.hasAttribute("wallet-count")).toBe(false);

    element.walletCount = 0;
    expect(element.walletCount).toBe(0);
    expect(element.hasAttribute("wallet-count")).toBe(false);

    element.setAttribute("wallet-count", "invalid");
    expect(element.walletCount).toBe(0);
  });

  it("applies configure patches, preserves omitted members, and clears explicit undefined", () => {
    const element = createElement();

    element.configure({
      storeDomain: "example.myshopify.com",
      country: "CA",
      locale: "en-CA",
      currency: "CAD",
      variantId: "gid://shopify/ProductVariant/1",
      sellingPlanId: "gid://shopify/SellingPlan/2",
      walletCount: 2,
      layout: "horizontal",
    });
    element.configure({
      variantId: "gid://shopify/ProductVariant/3",
      sellingPlanId: undefined,
    });

    expect(element.storeDomain).toBe("example.myshopify.com");
    expect(element.country).toBe("CA");
    expect(element.locale).toBe("en-CA");
    expect(element.currency).toBe("CAD");
    expect(element.variantId).toBe("gid://shopify/ProductVariant/3");
    expect(element.sellingPlanId).toBeUndefined();
    expect(element.walletCount).toBe(2);
    expect(element.layout).toBe("horizontal");
  });

  it("accepts getCart and callbacks through configure without reflecting functions", () => {
    const element = createElement();
    const getCart: GetCart = vi.fn().mockResolvedValue("created-cart-reference");
    const callbacks: WalletCallbacks = { ready: vi.fn(), error: vi.fn() };
    const replacement: WalletCallbacks = { ready: vi.fn() };

    element.configure({ getCart, callbacks });

    expect(element.getCart).toBe(getCart);
    expect(element.callbacks).toBe(callbacks);
    expect(element.getAttributeNames()).not.toContain("get-cart");
    expect(element.getAttributeNames()).not.toContain("callbacks");

    element.configure({ callbacks: replacement });
    expect(element.callbacks).toBe(replacement);
    expect(element.getCart).toBe(getCart);

    element.configure({ getCart: undefined });
    expect(element.getCart).toBeUndefined();
  });
});
