import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductVariantOption } from "./cart";
import { createProductLoader } from "./product-loader";
import { createInitialState, createStore, type SettingsSlice, type Store } from "./state";

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

function variant(id: string): ProductVariantOption {
  return {
    id,
    title: `Product ${id}`,
    productTitle: `Product ${id}`,
    variantTitle: "Default Title",
    vendor: "Acme",
    price: "10.00",
    available: true,
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const DOMAIN = "your-store.myshopify.com";
let store: Store;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  store = createStore(createInitialState(settings()));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createProductLoader", () => {
  it("does not schedule a load for an incomplete domain", async () => {
    const fetchVariants = vi.fn();
    const loader = createProductLoader({ store, setDomainInputValue: () => {}, fetchVariants });

    loader.schedule("your-store");
    await vi.advanceTimersByTimeAsync(1000);

    expect(fetchVariants).not.toHaveBeenCalled();
    expect(store.getState().loadState).toBe("Waiting for domain");
  });

  it("loads variants after the debounce and marks success", async () => {
    const fetchVariants = vi.fn().mockResolvedValue([variant("1"), variant("2")]);
    const setDomainInputValue = vi.fn();
    const loader = createProductLoader({
      store,
      setDomainInputValue,
      fetchVariants,
      debounceMs: 500,
    });

    loader.schedule(`https://${DOMAIN}/products`);
    expect(store.getState().loadState).toBe("Loading soon");

    await vi.advanceTimersByTimeAsync(500);

    expect(fetchVariants).toHaveBeenCalledWith(DOMAIN);
    expect(setDomainInputValue).toHaveBeenCalledWith(DOMAIN);
    expect(store.getState().variants).toHaveLength(2);
    expect(store.getState().loadState).toBe("2 loaded");
    expect(store.getState().cartStatus).toEqual({ message: "Products loaded.", tone: "success" });
  });

  it("marks failure and preserves the error message", async () => {
    const fetchVariants = vi.fn().mockRejectedValue(new Error("nope"));
    const loader = createProductLoader({ store, setDomainInputValue: () => {}, fetchVariants });

    loader.schedule(DOMAIN);
    await vi.advanceTimersByTimeAsync(500);

    expect(store.getState().loadState).toBe("Load failed");
    expect(store.getState().cartStatus).toEqual({ message: "nope", tone: "error" });
  });

  it("clears prior products and persists the normalized domain on schedule", async () => {
    const loader = createProductLoader({
      store,
      setDomainInputValue: () => {},
      fetchVariants: vi.fn(),
    });
    store.setState({ variants: [variant("1")], cartLines: [{ variantId: "1", quantity: 1 }] });

    loader.schedule(`https://${DOMAIN}`);

    expect(store.getState().variants).toEqual([]);
    expect(store.getState().cartLines).toEqual([]);
    expect(localStorage.getItem("checkout-kit:web-demo:storefront-domain")).toBe(DOMAIN);
  });

  it("only runs the latest scheduled load when rescheduled during the debounce", async () => {
    const fetchVariants = vi.fn().mockResolvedValue([variant("1")]);
    const loader = createProductLoader({ store, setDomainInputValue: () => {}, fetchVariants });

    loader.schedule("first-store.myshopify.com");
    loader.schedule("second-store.myshopify.com");
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchVariants).toHaveBeenCalledTimes(1);
    expect(fetchVariants).toHaveBeenCalledWith("second-store.myshopify.com");
  });

  it("ignores an in-flight response when a newer load is scheduled", async () => {
    const first = deferred<ProductVariantOption[]>();
    const second = deferred<ProductVariantOption[]>();
    const fetchVariants = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const loader = createProductLoader({ store, setDomainInputValue: () => {}, fetchVariants });

    loader.schedule("first-store.myshopify.com");
    await vi.advanceTimersByTimeAsync(500);

    loader.schedule("second-store.myshopify.com");
    await vi.advanceTimersByTimeAsync(500);

    first.resolve([variant("stale")]);
    second.resolve([variant("fresh")]);
    await vi.runAllTimersAsync();

    expect(store.getState().variants.map((v) => v.id)).toEqual(["fresh"]);
  });
});
