import { describe, expect, it, vi } from "vitest";

import type { CartLine } from "./cart";
import {
  createInitialState,
  createStore,
  selectActiveSourceUrl,
  selectGeneratedCartUrl,
  type SettingsSlice,
} from "./state";

function settings(overrides: Partial<SettingsSlice> = {}): SettingsSlice {
  return {
    sourceMode: "build",
    storefrontDomain: "",
    target: "popup",
    appearance: "",
    debug: false,
    manualSrc: "",
    settingsCollapsed: false,
    ...overrides,
  };
}

const lines: CartLine[] = [{ variantId: "123", quantity: 2 }];

describe("createInitialState", () => {
  it("seeds settings from the provided slice and empty runtime data", () => {
    const state = createInitialState(settings({ storefrontDomain: "your-store.myshopify.com" }));
    expect(state.storefrontDomain).toBe("your-store.myshopify.com");
    expect(state.target).toBe("popup");
    expect(state.variants).toEqual([]);
    expect(state.cartLines).toEqual([]);
    expect(state.log).toEqual([]);
    expect(state.cartStatus.tone).toBe("info");
    expect(state.component).toEqual({ checkout: undefined, error: undefined });
  });
});

describe("createStore", () => {
  it("shallow-merges partial updates", () => {
    const store = createStore(createInitialState(settings()));
    store.setState({ loadState: "Loading" });
    expect(store.getState().loadState).toBe("Loading");
    expect(store.getState().target).toBe("popup");
  });

  it("notifies every subscriber on each update", () => {
    const store = createStore(createInitialState(settings()));
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);

    store.setState({ debug: true });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("selectGeneratedCartUrl", () => {
  it("returns an empty string when there are no cart lines", () => {
    const state = createInitialState(settings({ storefrontDomain: "your-store.myshopify.com" }));
    expect(selectGeneratedCartUrl(state)).toBe("");
  });

  it("derives a cart permalink from the domain and lines", () => {
    const state = {
      ...createInitialState(settings({ storefrontDomain: "your-store.myshopify.com" })),
      cartLines: lines,
    };
    expect(selectGeneratedCartUrl(state)).toBe("https://your-store.myshopify.com/cart/123:2");
  });

  it("returns an empty string when the domain is missing", () => {
    const state = { ...createInitialState(settings({ storefrontDomain: "" })), cartLines: lines };
    expect(selectGeneratedCartUrl(state)).toBe("");
  });
});

describe("selectActiveSourceUrl", () => {
  it("uses the derived permalink in build mode", () => {
    const state = {
      ...createInitialState(settings({ storefrontDomain: "your-store.myshopify.com" })),
      cartLines: lines,
    };
    expect(selectActiveSourceUrl(state)).toBe("https://your-store.myshopify.com/cart/123:2");
  });

  it("uses the trimmed manual source in manual mode", () => {
    const state = createInitialState(
      settings({
        sourceMode: "manual",
        manualSrc: "  https://your-store.myshopify.com/cart/1:1  ",
      }),
    );
    expect(selectActiveSourceUrl(state)).toBe("https://your-store.myshopify.com/cart/1:1");
  });
});
