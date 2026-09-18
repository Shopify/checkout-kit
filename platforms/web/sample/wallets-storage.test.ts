import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  coerceWalletCount,
  loadWalletsPersistedSettings,
  persistWalletsSettings,
  WALLETS_STORAGE_KEYS,
} from "./wallets-storage";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("coerceWalletCount", () => {
  it("returns the parsed integer for valid values", () => {
    expect(coerceWalletCount("3")).toBe(3);
  });

  it("returns 0 for empty strings", () => {
    expect(coerceWalletCount("")).toBe(0);
  });

  it("returns 0 for non-numeric strings", () => {
    expect(coerceWalletCount("abc")).toBe(0);
  });

  it("returns 0 for negative values", () => {
    expect(coerceWalletCount("-1")).toBe(0);
  });
});

describe("WALLETS_STORAGE_KEYS", () => {
  it("namespaces the column width keys", () => {
    expect(WALLETS_STORAGE_KEYS.columnLeft).toBe("checkout-kit:wallets-demo:col-left");
    expect(WALLETS_STORAGE_KEYS.columnRight).toBe("checkout-kit:wallets-demo:col-right");
  });
});

describe("loadWalletsPersistedSettings", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadWalletsPersistedSettings()).toEqual({
      storefrontDomain: "",
      storefrontAccessToken: "",
      country: "",
      language: "",
      purchaseSource: "cart",
      cartId: "",
      variantId: "",
      sellingPlanId: "",
      walletCount: 0,
      layout: "horizontal",
      settingsCollapsed: false,
      eventsCollapsed: false,
    });
  });

  it("reflects stored values", () => {
    localStorage.setItem(WALLETS_STORAGE_KEYS.storefrontDomain, "your-store.myshopify.com");
    localStorage.setItem(WALLETS_STORAGE_KEYS.storefrontAccessToken, "shpat_test");
    localStorage.setItem(WALLETS_STORAGE_KEYS.country, "CA");
    localStorage.setItem(WALLETS_STORAGE_KEYS.language, "fr");
    localStorage.setItem(WALLETS_STORAGE_KEYS.purchaseSource, "buynow");
    localStorage.setItem(WALLETS_STORAGE_KEYS.cartId, "gid://shopify/Cart/123");
    localStorage.setItem(WALLETS_STORAGE_KEYS.variantId, "gid://shopify/ProductVariant/456");
    localStorage.setItem(WALLETS_STORAGE_KEYS.sellingPlanId, "gid://shopify/SellingPlan/789");
    localStorage.setItem(WALLETS_STORAGE_KEYS.walletCount, "3");
    localStorage.setItem(WALLETS_STORAGE_KEYS.layout, "vertical");
    localStorage.setItem(WALLETS_STORAGE_KEYS.settingsCollapsed, "1");
    localStorage.setItem(WALLETS_STORAGE_KEYS.eventsCollapsed, "1");

    expect(loadWalletsPersistedSettings()).toEqual({
      storefrontDomain: "your-store.myshopify.com",
      storefrontAccessToken: "shpat_test",
      country: "CA",
      language: "fr",
      purchaseSource: "buynow",
      cartId: "gid://shopify/Cart/123",
      variantId: "gid://shopify/ProductVariant/456",
      sellingPlanId: "gid://shopify/SellingPlan/789",
      walletCount: 3,
      layout: "vertical",
      settingsCollapsed: true,
      eventsCollapsed: true,
    });
  });

  it("falls back to cart for unrecognized purchase source", () => {
    localStorage.setItem(WALLETS_STORAGE_KEYS.purchaseSource, "nonsense");
    expect(loadWalletsPersistedSettings().purchaseSource).toBe("cart");
  });
});

describe("persistWalletsSettings", () => {
  it("writes each provided field to its storage key", () => {
    persistWalletsSettings({
      storefrontDomain: "your-store.myshopify.com",
      storefrontAccessToken: "shpat_test",
      country: "US",
      language: "en",
      purchaseSource: "buynow",
      cartId: "gid://shopify/Cart/123",
      variantId: "gid://shopify/ProductVariant/456",
      sellingPlanId: "gid://shopify/SellingPlan/789",
      walletCount: 5,
      layout: "vertical",
      settingsCollapsed: true,
      eventsCollapsed: true,
    });

    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.storefrontDomain)).toBe(
      "your-store.myshopify.com",
    );
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.storefrontAccessToken)).toBe("shpat_test");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.country)).toBe("US");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.language)).toBe("en");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.purchaseSource)).toBe("buynow");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.cartId)).toBe("gid://shopify/Cart/123");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.variantId)).toBe(
      "gid://shopify/ProductVariant/456",
    );
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.sellingPlanId)).toBe(
      "gid://shopify/SellingPlan/789",
    );
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.walletCount)).toBe("5");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.layout)).toBe("vertical");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.settingsCollapsed)).toBe("1");
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.eventsCollapsed)).toBe("1");
  });

  it("removes the wallet-count key when value is 0", () => {
    localStorage.setItem(WALLETS_STORAGE_KEYS.walletCount, "3");
    persistWalletsSettings({ walletCount: 0 });
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.walletCount)).toBeNull();
  });

  it("removes keys for falsey boolean fields", () => {
    localStorage.setItem(WALLETS_STORAGE_KEYS.settingsCollapsed, "1");
    persistWalletsSettings({ settingsCollapsed: false });
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.settingsCollapsed)).toBeNull();
  });

  it("only writes the provided fields", () => {
    localStorage.setItem(WALLETS_STORAGE_KEYS.country, "CA");
    persistWalletsSettings({ storefrontDomain: "your-store.myshopify.com" });
    expect(localStorage.getItem(WALLETS_STORAGE_KEYS.country)).toBe("CA");
  });
});
