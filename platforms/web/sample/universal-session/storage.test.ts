import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS, loadPersistedSettings, persistSettings } from "./storage";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("STORAGE_KEYS", () => {
  it("keeps the Shop Pay playground's settings apart from the other playgrounds", () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key).toMatch(/^checkout-kit:shop-pay-demo:/);
    }
  });
});

describe("loadPersistedSettings", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadPersistedSettings()).toEqual({
      sourceMode: "build",
      storefrontDomain: "",
      storeDomains: [],
      environment: "production",
      buyerCountry: "",
      button: true,
      target: "",
      logLevel: "warn",
      settingsCollapsed: false,
      eventsCollapsed: false,
    });
  });

  it("reflects stored values", () => {
    persistSettings("checkout-kit:shop-pay-demo", {
      sourceMode: "manual",
      storeDomains: ["one.myshopify.com", "two.myshopify.com"],
      environment: "development",
      buyerCountry: "US",
      button: false,
      target: "auto",
      logLevel: "debug",
      settingsCollapsed: true,
      eventsCollapsed: true,
    });

    expect(loadPersistedSettings()).toEqual({
      sourceMode: "manual",
      storefrontDomain: "",
      storeDomains: ["one.myshopify.com", "two.myshopify.com"],
      environment: "development",
      buyerCountry: "US",
      button: false,
      target: "auto",
      logLevel: "debug",
      settingsCollapsed: true,
      eventsCollapsed: true,
    });
  });

  it("falls back to defaults for unrecognized values", () => {
    localStorage.setItem(STORAGE_KEYS.sourceMode, "nonsense");
    localStorage.setItem(STORAGE_KEYS.environment, "staging");
    localStorage.setItem(STORAGE_KEYS.buyerCountry, "XX");
    localStorage.setItem(STORAGE_KEYS.logLevel, "verbose");

    expect(loadPersistedSettings()).toMatchObject({
      sourceMode: "build",
      environment: "production",
      buyerCountry: "",
      logLevel: "warn",
    });
  });
});

describe("loadPersistedSettings migration", () => {
  it("migrates a stored storefrontDomain to storeDomains when the list is empty", () => {
    localStorage.setItem(STORAGE_KEYS.storefrontDomain, "your-store.myshopify.com");
    expect(loadPersistedSettings().storeDomains).toEqual(["your-store.myshopify.com"]);
  });

  it("does not migrate when storeDomains is already set", () => {
    localStorage.setItem(STORAGE_KEYS.storefrontDomain, "old.myshopify.com");
    localStorage.setItem(STORAGE_KEYS.stores, JSON.stringify(["new.myshopify.com"]));
    expect(loadPersistedSettings().storeDomains).toEqual(["new.myshopify.com"]);
  });

  it("keeps a saved empty list after the user removes every store", () => {
    localStorage.setItem(STORAGE_KEYS.storefrontDomain, "old.myshopify.com");
    expect(loadPersistedSettings().storeDomains).toEqual(["old.myshopify.com"]);

    persistSettings("checkout-kit:shop-pay-demo", { storeDomains: [] });
    expect(loadPersistedSettings().storeDomains).toEqual([]);
  });

  it("ignores invalid JSON in storeDomains", () => {
    localStorage.setItem(STORAGE_KEYS.stores, "not json");
    expect(loadPersistedSettings().storeDomains).toEqual([]);
  });
});

describe("persistSettings", () => {
  it("removes keys for default booleans and empty strings", () => {
    persistSettings("checkout-kit:shop-pay-demo", { settingsCollapsed: true, button: false });
    persistSettings("checkout-kit:shop-pay-demo", { settingsCollapsed: false, button: true });

    expect(localStorage.getItem(STORAGE_KEYS.settingsCollapsed)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.button)).toBeNull();
  });

  it("only writes the provided fields", () => {
    localStorage.setItem(STORAGE_KEYS.target, "auto");
    persistSettings("checkout-kit:shop-pay-demo", { storeDomains: ["your-store.myshopify.com"] });
    expect(localStorage.getItem(STORAGE_KEYS.target)).toBe("auto");
  });

  it("persists storeDomains as JSON", () => {
    persistSettings("checkout-kit:shop-pay-demo", {
      storeDomains: ["one.myshopify.com", "two.myshopify.com"],
    });
    expect(localStorage.getItem(STORAGE_KEYS.stores)).toBe(
      JSON.stringify(["one.myshopify.com", "two.myshopify.com"]),
    );
  });

  it("has no field for the pasted session URL", () => {
    persistSettings("checkout-kit:shop-pay-demo", {
      ...loadPersistedSettings(),
      manualSrc: "https://example.test",
    } as never);
    const values = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index) ?? ""),
    );
    expect(values.join(" ")).not.toContain("example.test");
  });
});
