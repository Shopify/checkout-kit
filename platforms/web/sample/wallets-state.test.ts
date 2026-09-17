import { describe, expect, it, vi } from "vitest";

import {
  createWalletsInitialState,
  createWalletsStore,
  WALLETS_INITIAL_CART_STATUS,
  WALLETS_INITIAL_LOAD_STATE,
  type WalletsSettingsSlice,
} from "./wallets-state";

function settings(overrides: Partial<WalletsSettingsSlice> = {}): WalletsSettingsSlice {
  return {
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
    ...overrides,
  };
}

describe("createWalletsInitialState", () => {
  it("seeds settings from the provided slice and empty runtime data", () => {
    const state = createWalletsInitialState(
      settings({ storefrontDomain: "your-store.myshopify.com", country: "US" }),
    );
    expect(state.storefrontDomain).toBe("your-store.myshopify.com");
    expect(state.country).toBe("US");
    expect(state.purchaseSource).toBe("cart");
    expect(state.variants).toEqual([]);
    expect(state.cartLines).toEqual([]);
    expect(state.loadState).toBe(WALLETS_INITIAL_LOAD_STATE);
    expect(state.cartStatus).toBe(WALLETS_INITIAL_CART_STATUS);
    expect(state.log).toEqual([]);
  });
});

describe("createWalletsStore", () => {
  it("shallow-merges partial updates", () => {
    const store = createWalletsStore(createWalletsInitialState(settings()));
    store.setState({ country: "CA" });
    expect(store.getState().country).toBe("CA");
    expect(store.getState().purchaseSource).toBe("cart");
  });

  it("notifies every subscriber on each update", () => {
    const store = createWalletsStore(createWalletsInitialState(settings()));
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);

    store.setState({ language: "fr" });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
