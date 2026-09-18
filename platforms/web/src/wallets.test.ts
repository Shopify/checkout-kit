import { afterEach, describe, expect, it } from "vitest";

import "./wallets-web-component";
import { ShopifyAcceleratedCheckoutButtons } from "./wallets";

describe("<shopify-accelerated-checkout-buttons>", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("registration", () => {
    it("registers the custom element once", () => {
      expect(customElements.get("shopify-accelerated-checkout-buttons")).toBe(
        ShopifyAcceleratedCheckoutButtons,
      );
    });

    it("creates instances via document.createElement", () => {
      const el = document.createElement("shopify-accelerated-checkout-buttons");
      expect(el).toBeInstanceOf(ShopifyAcceleratedCheckoutButtons);
    });
  });

  describe("placeholder rendering", () => {
    it("renders a container with role=group and aria-label", () => {
      const el = renderElement();
      const container = el.shadowRoot!.querySelector("[role='group']") as HTMLElement;
      expect(container).not.toBeNull();
      expect(container.getAttribute("aria-label")).toBe("Accelerated checkout");
    });

    it("renders a container with data-state=idle", () => {
      const el = renderElement();
      const container = el.shadowRoot!.querySelector("[data-state]") as HTMLElement;
      expect(container).not.toBeNull();
      expect(container.getAttribute("data-state")).toBe("idle");
    });
  });

  describe("attribute → property reflection", () => {
    it("reflects store-domain to storeDomain", () => {
      const el = renderElement();
      el.setAttribute("store-domain", "shop.example.com");
      expect(el.storeDomain).toBe("shop.example.com");
    });

    it("reflects country to country", () => {
      const el = renderElement();
      el.setAttribute("country", "CA");
      expect(el.country).toBe("CA");
    });

    it("reflects language to language", () => {
      const el = renderElement();
      el.setAttribute("language", "fr");
      expect(el.language).toBe("fr");
    });

    it("reflects cart-id to cartId", () => {
      const el = renderElement();
      el.setAttribute("cart-id", "gid://shopify/Cart/123");
      expect(el.cartId).toBe("gid://shopify/Cart/123");
    });

    it("reflects variant-id to variantId", () => {
      const el = renderElement();
      el.setAttribute("variant-id", "gid://shopify/ProductVariant/456");
      expect(el.variantId).toBe("gid://shopify/ProductVariant/456");
    });

    it("reflects selling-plan-id to sellingPlanId", () => {
      const el = renderElement();
      el.setAttribute("selling-plan-id", "gid://shopify/SellingPlan/789");
      expect(el.sellingPlanId).toBe("gid://shopify/SellingPlan/789");
    });

    it("reflects wallet-count to walletCount", () => {
      const el = renderElement();
      el.setAttribute("wallet-count", "3");
      expect(el.walletCount).toBe(3);
    });

    it("reflects layout to layout", () => {
      const el = renderElement();
      el.setAttribute("layout", "vertical");
      expect(el.layout).toBe("vertical");
    });
  });

  describe("property → attribute reflection", () => {
    it("reflects storeDomain to store-domain", () => {
      const el = renderElement();
      el.storeDomain = "shop.example.com";
      expect(el.getAttribute("store-domain")).toBe("shop.example.com");
    });

    it("reflects country to country", () => {
      const el = renderElement();
      el.country = "US";
      expect(el.getAttribute("country")).toBe("US");
    });

    it("reflects language to language", () => {
      const el = renderElement();
      el.language = "en";
      expect(el.getAttribute("language")).toBe("en");
    });

    it("reflects cartId to cart-id", () => {
      const el = renderElement();
      el.cartId = "gid://shopify/Cart/123";
      expect(el.getAttribute("cart-id")).toBe("gid://shopify/Cart/123");
    });

    it("reflects variantId to variant-id", () => {
      const el = renderElement();
      el.variantId = "gid://shopify/ProductVariant/456";
      expect(el.getAttribute("variant-id")).toBe("gid://shopify/ProductVariant/456");
    });

    it("reflects sellingPlanId to selling-plan-id", () => {
      const el = renderElement();
      el.sellingPlanId = "gid://shopify/SellingPlan/789";
      expect(el.getAttribute("selling-plan-id")).toBe("gid://shopify/SellingPlan/789");
    });

    it("removes the attribute when assigned undefined", () => {
      const el = renderElement();
      el.storeDomain = "shop.example.com";
      el.storeDomain = undefined;
      expect(el.hasAttribute("store-domain")).toBe(false);
      expect(el.storeDomain).toBe("");
    });

    it("reflects layout to layout attribute", () => {
      const el = renderElement();
      el.layout = "vertical";
      expect(el.getAttribute("layout")).toBe("vertical");
    });

    it("removes layout attribute when assigned undefined", () => {
      const el = renderElement();
      el.layout = "vertical";
      el.layout = undefined;
      expect(el.hasAttribute("layout")).toBe(false);
    });
  });

  describe("walletCount", () => {
    it("returns 0 when the attribute is absent", () => {
      const el = renderElement();
      expect(el.walletCount).toBe(0);
    });

    it("returns the numeric value of the attribute", () => {
      const el = renderElement();
      el.setAttribute("wallet-count", "3");
      expect(el.walletCount).toBe(3);
    });

    it("returns 0 for non-numeric attribute values", () => {
      const el = renderElement();
      el.setAttribute("wallet-count", "abc");
      expect(el.walletCount).toBe(0);
    });

    it("sets the attribute from the property", () => {
      const el = renderElement();
      el.walletCount = 5;
      expect(el.getAttribute("wallet-count")).toBe("5");
    });

    it("removes the attribute for falsy values", () => {
      const el = renderElement();
      el.walletCount = 3;
      el.walletCount = 0;
      expect(el.hasAttribute("wallet-count")).toBe(false);

      el.walletCount = 3;
      el.walletCount = undefined;
      expect(el.hasAttribute("wallet-count")).toBe(false);
      expect(el.walletCount).toBe(0);
    });
  });

  describe("connect / disconnect idempotency", () => {
    it("is safe to call connectedCallback multiple times", () => {
      const el = renderElement();
      el.connectedCallback();
      el.connectedCallback();
      const container = el.shadowRoot!.querySelector("[data-state]") as HTMLElement;
      expect(container.getAttribute("data-state")).toBe("idle");
    });

    it("is safe to call disconnectedCallback multiple times", () => {
      const el = renderElement();
      el.disconnectedCallback();
      el.disconnectedCallback();
      const container = el.shadowRoot!.querySelector("[data-state]") as HTMLElement;
      expect(container.getAttribute("data-state")).toBe("idle");
    });

    it("preserves the shadow tree across element moves", () => {
      const el = renderElement();
      const container = el.shadowRoot!.querySelector("[role='group']");

      const newParent = document.createElement("div");
      document.body.appendChild(newParent);
      newParent.appendChild(el);

      expect(el.shadowRoot!.querySelector("[role='group']")).toBe(container);
    });
  });

  describe("string property defaults", () => {
    it("returns empty string for unset string properties", () => {
      const el = renderElement();
      expect(el.storeDomain).toBe("");
      expect(el.country).toBe("");
      expect(el.language).toBe("");
      expect(el.cartId).toBe("");
      expect(el.variantId).toBe("");
      expect(el.sellingPlanId).toBe("");
    });

    it("defaults layout to horizontal", () => {
      const el = renderElement();
      expect(el.layout).toBe("horizontal");
    });

    it("defaults logLevel to error", () => {
      const el = renderElement();
      expect(el.logLevel).toBe("error");
    });
  });

  describe("logLevel", () => {
    it("reflects log-level attribute to logLevel property", () => {
      const el = renderElement();
      el.setAttribute("log-level", "debug");
      expect(el.logLevel).toBe("debug");
    });

    it("reflects logLevel property to log-level attribute", () => {
      const el = renderElement();
      el.logLevel = "warn";
      expect(el.getAttribute("log-level")).toBe("warn");
    });

    it("coerces invalid values to the default", () => {
      const el = renderElement();
      el.setAttribute("log-level", "nonsense");
      expect(el.logLevel).toBe("error");
    });

    it("removes the attribute when set to undefined", () => {
      const el = renderElement();
      el.logLevel = "debug";
      el.logLevel = undefined;
      expect(el.hasAttribute("log-level")).toBe(false);
      expect(el.logLevel).toBe("error");
    });
  });
});

function renderElement(attributes: Record<string, string> = {}): ShopifyAcceleratedCheckoutButtons {
  const el = document.createElement(
    "shopify-accelerated-checkout-buttons",
  ) as ShopifyAcceleratedCheckoutButtons;
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}
