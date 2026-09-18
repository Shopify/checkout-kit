import { beforeEach, describe, expect, it } from "vitest";

import "../src/wallets-web-component";
import type { ShopifyAcceleratedCheckoutButtons } from "../src/wallets";
import type { ProductVariantOption } from "./cart";
import { queryWalletsRefs, type WalletsRefs } from "./wallets-dom";
import { renderWalletsApp } from "./wallets-render";
import {
  createWalletsInitialState,
  type WalletsAppState,
  type WalletsSettingsSlice,
} from "./wallets-state";
import { WALLETS_SHELL } from "./wallets-shell";
import { renderWalletsSettings } from "./views/wallets-settings";
import { renderWalletsElement } from "./views/wallets-element";
import { renderWalletsLog } from "./views/wallets-log";

function mountShell(): WalletsRefs {
  document.body.innerHTML = WALLETS_SHELL;
  return queryWalletsRefs();
}

function settings(overrides: Partial<WalletsSettingsSlice> = {}): WalletsSettingsSlice {
  return {
    storefrontDomain: "your-store.myshopify.com",
    storefrontAccessToken: "shpat_test",
    country: "US",
    language: "en",
    purchaseSource: "cart",
    cartId: "",
    variantId: "",
    sellingPlanId: "",
    walletCount: 0,
    layout: "horizontal",
    settingsCollapsed: false,
    eventsCollapsed: false,
    ...overrides,
  };
}

function state(overrides: Partial<WalletsAppState> = {}): WalletsAppState {
  return { ...createWalletsInitialState(settings()), ...overrides };
}

function variant(overrides: Partial<ProductVariantOption> = {}): ProductVariantOption {
  return {
    id: "123",
    title: "Sample product",
    productTitle: "Sample product",
    variantTitle: "Default Title",
    vendor: "Acme",
    price: "10.00",
    available: true,
    ...overrides,
  };
}

function createElement(): ShopifyAcceleratedCheckoutButtons {
  return document.createElement(
    "shopify-accelerated-checkout-buttons",
  ) as ShopifyAcceleratedCheckoutButtons;
}

let refs: WalletsRefs;
beforeEach(() => {
  refs = mountShell();
});

describe("renderWalletsSettings", () => {
  it("shows the cart banner and cart settings in cart mode", () => {
    const el = createElement();
    renderWalletsSettings(refs, state({ purchaseSource: "cart" }), el);
    expect(refs.cartBanner.hidden).toBe(false);
    expect(refs.cartSourceFields.hidden).toBe(false);
    expect(refs.buynowSourceFields.hidden).toBe(true);
  });

  it("hides the cart banner and shows buynow settings in buynow mode", () => {
    const el = createElement();
    renderWalletsSettings(refs, state({ purchaseSource: "buynow" }), el);
    expect(refs.cartBanner.hidden).toBe(true);
    expect(refs.cartSourceFields.hidden).toBe(true);
    expect(refs.buynowSourceFields.hidden).toBe(false);
  });

  it("applies storeDomain, country, and language to the element", () => {
    const el = createElement();
    renderWalletsSettings(
      refs,
      state({ storefrontDomain: "your-store.myshopify.com", country: "CA", language: "fr" }),
      el,
    );
    expect(el.storeDomain).toBe("your-store.myshopify.com");
    expect(el.country).toBe("CA");
    expect(el.language).toBe("fr");
  });

  it("applies walletCount to the element", () => {
    const el = createElement();
    renderWalletsSettings(refs, state({ walletCount: 3 }), el);
    expect(el.walletCount).toBe(3);
  });

  it("sets cartId from state and clears variantId/sellingPlanId in cart mode", () => {
    const el = createElement();
    renderWalletsSettings(
      refs,
      state({
        purchaseSource: "cart",
        cartId: "https://your-store.myshopify.com/cart/123:1",
      }),
      el,
    );
    expect(el.cartId).toBe("https://your-store.myshopify.com/cart/123:1");
    expect(el.variantId).toBe("");
    expect(el.sellingPlanId).toBe("");
  });

  it("enables the create-cart button when there are cart lines", () => {
    const el = createElement();
    renderWalletsSettings(
      refs,
      state({ purchaseSource: "cart", cartLines: [{ variantId: "123", quantity: 1 }] }),
      el,
    );
    expect(refs.createCartButton.disabled).toBe(false);
  });

  it("disables the create-cart button when the cart is empty", () => {
    const el = createElement();
    renderWalletsSettings(refs, state({ purchaseSource: "cart", cartLines: [] }), el);
    expect(refs.createCartButton.disabled).toBe(true);
  });

  it("disables the create-cart button when the access token is missing", () => {
    const el = createElement();
    renderWalletsSettings(
      refs,
      state({
        purchaseSource: "cart",
        storefrontAccessToken: "",
        cartLines: [{ variantId: "123", quantity: 1 }],
      }),
      el,
    );
    expect(refs.createCartButton.disabled).toBe(true);
  });

  it("sets variantId/sellingPlanId and clears cartId in buynow mode", () => {
    const el = createElement();
    renderWalletsSettings(
      refs,
      state({
        purchaseSource: "buynow",
        variantId: "gid://shopify/ProductVariant/456",
        sellingPlanId: "gid://shopify/SellingPlan/789",
      }),
      el,
    );
    expect(el.cartId).toBe("");
    expect(el.variantId).toBe("gid://shopify/ProductVariant/456");
    expect(el.sellingPlanId).toBe("gid://shopify/SellingPlan/789");
  });

  it("collapses the settings panel", () => {
    const el = createElement();
    renderWalletsSettings(refs, state({ settingsCollapsed: true }), el);
    expect(refs.layout.classList.contains("settings-collapsed")).toBe(true);
    expect(refs.settingsToggle.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("renderWalletsElement", () => {
  it("dumps the element's reflected attributes", () => {
    const el = createElement();
    el.storeDomain = "your-store.myshopify.com";
    el.country = "US";
    renderWalletsElement(refs, state(), el);
    expect(refs.elementAttrs.textContent).toContain("store-domain");
    expect(refs.elementAttrs.textContent).toContain("your-store.myshopify.com");
  });

  it("shows cartId from state in cart mode", () => {
    const el = createElement();
    renderWalletsElement(
      refs,
      state({
        purchaseSource: "cart",
        cartId: "https://your-store.myshopify.com/cart/123:2",
      }),
      el,
    );
    expect(refs.stateCartId.textContent).toBe("https://your-store.myshopify.com/cart/123:2");
    expect(refs.stateVariantId.textContent).toBe("—");
  });

  it("shows em dash for cartId when not in cart mode", () => {
    const el = createElement();
    renderWalletsElement(refs, state({ purchaseSource: "buynow", cartId: "" }), el);
    expect(refs.stateCartId.textContent).toBe("—");
  });

  it("shows variantId state in buynow mode", () => {
    const el = createElement();
    renderWalletsElement(
      refs,
      state({ purchaseSource: "buynow", variantId: "gid://shopify/ProductVariant/456" }),
      el,
    );
    expect(refs.stateCartId.textContent).toBe("—");
    expect(refs.stateVariantId.textContent).toBe("gid://shopify/ProductVariant/456");
  });
});

describe("renderWalletsLog", () => {
  it("renders log entries in stored order", () => {
    renderWalletsLog(
      refs,
      state({
        log: [
          { type: "settings.update", time: "00:00:02.000", snapshot: "{}" },
          { type: "wallets.render", time: "00:00:01.000", snapshot: "{}" },
        ],
      }),
    );
    const names = [...refs.eventLog.querySelectorAll(".event-entry-name")].map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["settings.update", "wallets.render"]);
  });

  it("collapses the events panel", () => {
    renderWalletsLog(refs, state({ eventsCollapsed: true }));
    expect(refs.layout.classList.contains("events-collapsed")).toBe(true);
  });
});

describe("renderWalletsApp", () => {
  it("renders products and cart in cart mode", () => {
    const el = createElement();
    renderWalletsApp(
      refs,
      state({
        variants: [variant()],
        cartLines: [{ variantId: "123", quantity: 1 }],
      }),
      el,
    );
    expect(refs.productList.querySelectorAll(".product-card")).toHaveLength(1);
    expect(refs.selectedLines.querySelectorAll(".cart-line")).toHaveLength(1);
  });

  it("renders products in buynow mode too (same grid)", () => {
    const el = createElement();
    renderWalletsApp(
      refs,
      state({
        purchaseSource: "buynow",
        variants: [variant()],
        variantId: "gid://shopify/ProductVariant/456",
      }),
      el,
    );
    expect(refs.productList.querySelectorAll(".product-card")).toHaveLength(1);
    expect(el.variantId).toBe("gid://shopify/ProductVariant/456");
    // Cart banner is hidden
    expect(refs.cartBanner.hidden).toBe(true);
  });
});
