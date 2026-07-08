import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  STORAGE_KEYS,
  loadPersistedSettings,
  persistSettings,
  readStorage,
  writeStorage,
} from "./storage";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readStorage", () => {
  it("returns the stored value", () => {
    localStorage.setItem("key", "value");
    expect(readStorage("key")).toBe("value");
  });

  it("returns an empty string for missing keys", () => {
    expect(readStorage("missing")).toBe("");
  });

  it("swallows errors and returns an empty string", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStorage("key")).toBe("");
  });
});

describe("writeStorage", () => {
  it("stores non-empty values", () => {
    writeStorage("key", "value");
    expect(localStorage.getItem("key")).toBe("value");
  });

  it("removes the key when the value is empty", () => {
    localStorage.setItem("key", "value");
    writeStorage("key", "");
    expect(localStorage.getItem("key")).toBeNull();
  });

  it("swallows errors", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeStorage("key", "value")).not.toThrow();
  });
});

describe("loadPersistedSettings", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadPersistedSettings()).toEqual({
      sourceMode: "build",
      storefrontDomain: "",
      target: "",
      appearance: "",
      debug: false,
      settingsCollapsed: false,
    });
  });

  it("reflects stored values", () => {
    localStorage.setItem(STORAGE_KEYS.sourceMode, "manual");
    localStorage.setItem(STORAGE_KEYS.storefrontDomain, "your-store.myshopify.com");
    localStorage.setItem(STORAGE_KEYS.target, "auto");
    localStorage.setItem(STORAGE_KEYS.appearance, "app:dark");
    localStorage.setItem(STORAGE_KEYS.debug, "1");
    localStorage.setItem(STORAGE_KEYS.settingsCollapsed, "1");

    expect(loadPersistedSettings()).toEqual({
      sourceMode: "manual",
      storefrontDomain: "your-store.myshopify.com",
      target: "auto",
      appearance: "app:dark",
      debug: true,
      settingsCollapsed: true,
    });
  });

  it("falls back to build for unrecognized source modes", () => {
    localStorage.setItem(STORAGE_KEYS.sourceMode, "nonsense");
    expect(loadPersistedSettings().sourceMode).toBe("build");
  });
});

describe("persistSettings", () => {
  it("writes each provided field to its storage key", () => {
    persistSettings({
      sourceMode: "manual",
      storefrontDomain: "your-store.myshopify.com",
      target: "auto",
      appearance: "app:dark",
      debug: true,
      settingsCollapsed: true,
    });

    expect(localStorage.getItem(STORAGE_KEYS.sourceMode)).toBe("manual");
    expect(localStorage.getItem(STORAGE_KEYS.storefrontDomain)).toBe("your-store.myshopify.com");
    expect(localStorage.getItem(STORAGE_KEYS.target)).toBe("auto");
    expect(localStorage.getItem(STORAGE_KEYS.appearance)).toBe("app:dark");
    expect(localStorage.getItem(STORAGE_KEYS.debug)).toBe("1");
    expect(localStorage.getItem(STORAGE_KEYS.settingsCollapsed)).toBe("1");
  });

  it("removes keys for falsey boolean and empty string fields", () => {
    localStorage.setItem(STORAGE_KEYS.debug, "1");
    localStorage.setItem(STORAGE_KEYS.settingsCollapsed, "1");
    localStorage.setItem(STORAGE_KEYS.storefrontDomain, "your-store.myshopify.com");

    persistSettings({ debug: false, settingsCollapsed: false, storefrontDomain: "" });

    expect(localStorage.getItem(STORAGE_KEYS.debug)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.settingsCollapsed)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.storefrontDomain)).toBeNull();
  });

  it("only writes the provided fields", () => {
    localStorage.setItem(STORAGE_KEYS.target, "auto");
    persistSettings({ storefrontDomain: "your-store.myshopify.com" });
    expect(localStorage.getItem(STORAGE_KEYS.target)).toBe("auto");
  });
});
