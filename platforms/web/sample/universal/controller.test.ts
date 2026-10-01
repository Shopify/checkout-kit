import { describe, expect, it, vi } from "vitest";

import type { ProductVariantOption } from "../cart";
import { UniversalController } from "./controller";
import {
  createInitialState,
  createUniversalStore,
  selectCartReadiness,
  selectShopCartPreview,
} from "./state";

function variant(id: string, available = true): ProductVariantOption {
  return {
    id,
    title: `Product ${id}`,
    productTitle: `Product ${id}`,
    variantTitle: "Default Title",
    vendor: "Synthetic shop",
    price: "10.00",
    available,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("Universal shop controller", () => {
  it("keeps identical variant IDs independent across two shops and derives separate previews", async () => {
    const store = createUniversalStore(createInitialState());
    const controller = new UniversalController({
      store,
      catalogLoader: vi.fn().mockResolvedValue([variant("123")]),
    });
    expect(controller.addShop("SHOP-ONE.example.com")).toBe(true);
    expect(controller.addShop("https://shop-two.example.com/")).toBe(true);
    await vi.waitFor(() =>
      expect(store.getState().shops.every((shop) => shop.catalogStatus === "ready")).toBe(true),
    );

    const [first, second] = store.getState().shops;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    controller.setQuantity(first!.key, "123", 2);
    controller.setQuantity(second!.key, "123", 3);

    expect(store.getState().shops.map((shop) => shop.cartLines)).toEqual([
      [{ variantId: "123", quantity: 2 }],
      [{ variantId: "123", quantity: 3 }],
    ]);
    expect(store.getState().shops.map(selectShopCartPreview)).toEqual([
      "https://shop-one.example.com/cart/123:2",
      "https://shop-two.example.com/cart/123:3",
    ]);
    expect(selectCartReadiness(store.getState())).toMatchObject({
      ready: true,
      shopCount: 2,
      itemCount: 5,
    });
    expect(controller.addShop("https://SHOP-ONE.example.com/")).toBe(false);
    expect(store.getState().shops).toHaveLength(2);
    expect(store.getState().addShopError).toContain("already selected");
    controller.dispose();
  });

  it("shows one shop failure, retries it, and suppresses raw loader errors", async () => {
    const store = createUniversalStore(createInitialState());
    const catalogLoader = vi
      .fn()
      .mockRejectedValueOnce(new Error("private token must not appear"))
      .mockResolvedValueOnce([variant("123")]);
    const controller = new UniversalController({ store, catalogLoader });
    controller.addShop("shop-one.example.com");
    await vi.waitFor(() => expect(store.getState().shops[0]?.catalogStatus).toBe("error"));
    expect(store.getState().shops[0]?.catalogError).not.toContain("private token");
    expect(selectCartReadiness(store.getState()).hint).toContain("Retry");

    controller.retryShop(store.getState().shops[0]!.key);
    await vi.waitFor(() => expect(store.getState().shops[0]?.catalogStatus).toBe("ready"));
    expect(catalogLoader).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it("ignores a late response after removal and re-addition of the same domain", async () => {
    const oldLoad = deferred<ProductVariantOption[]>();
    const newLoad = deferred<ProductVariantOption[]>();
    const catalogLoader = vi
      .fn()
      .mockReturnValueOnce(oldLoad.promise)
      .mockReturnValueOnce(newLoad.promise);
    const store = createUniversalStore(createInitialState());
    const controller = new UniversalController({ store, catalogLoader });
    controller.addShop("shop-one.example.com");
    const oldKey = store.getState().shops[0]!.key;
    const oldSignal = catalogLoader.mock.calls[0]?.[1] as AbortSignal;
    controller.removeShop(oldKey);
    expect(oldSignal.aborted).toBe(true);
    controller.addShop("shop-one.example.com");
    const newKey = store.getState().shops[0]!.key;
    expect(newKey).not.toBe(oldKey);

    oldLoad.resolve([variant("stale")]);
    await Promise.resolve();
    expect(store.getState().shops[0]?.catalogStatus).toBe("loading");
    expect(store.getState().shops[0]?.variants).toEqual([]);
    newLoad.resolve([variant("fresh")]);
    await vi.waitFor(() => expect(store.getState().shops[0]?.catalogStatus).toBe("ready"));
    expect(store.getState().shops[0]?.variants.map((item) => item.id)).toEqual(["fresh"]);
    controller.dispose();
  });

  it("clamps quantities, blocks unavailable variants, and invalidates prepared URLs on edits", async () => {
    const store = createUniversalStore(createInitialState());
    const controller = new UniversalController({
      store,
      catalogLoader: vi
        .fn()
        .mockResolvedValue([variant("unavailable", false), variant("available")]),
    });
    controller.addShop("shop-one.example.com");
    await vi.waitFor(() => expect(store.getState().shops[0]?.catalogStatus).toBe("ready"));
    const key = store.getState().shops[0]!.key;
    expect(selectCartReadiness(store.getState()).ready).toBe(false);
    controller.setQuantity(key, "unavailable", 1);
    expect(store.getState().shops[0]?.cartLines).toEqual([]);

    controller.setQuantity(key, "available", 5000);
    expect(store.getState().shops[0]?.cartLines).toEqual([
      { variantId: "available", quantity: 999 },
    ]);
    const generation = store.getState().preparation.generation;
    store.update((state) => ({
      ...state,
      preparation: {
        ...state.preparation,
        phase: "ready",
        url: "https://checkout.example.test/session",
        readyGeneration: state.preparation.generation,
      },
    }));
    controller.setQuantity(key, "available", 999);
    expect(store.getState().preparation.generation).toBe(generation);
    controller.setQuantity(key, "available", 0);
    expect(store.getState().preparation).toMatchObject({
      generation: generation + 1,
      phase: "editing",
      url: "",
      readyGeneration: null,
    });
    controller.dispose();
  });

  it("keeps stale cart lines visible but blocks preview after a catalog refresh removes a variant", async () => {
    const store = createUniversalStore(createInitialState());
    const controller = new UniversalController({
      store,
      catalogLoader: vi
        .fn()
        .mockResolvedValueOnce([variant("selected")])
        .mockResolvedValueOnce([variant("replacement")]),
    });
    controller.addShop("shop-one.example.com");
    await vi.waitFor(() => expect(store.getState().shops[0]?.catalogStatus).toBe("ready"));
    const key = store.getState().shops[0]!.key;
    controller.setQuantity(key, "selected", 1);
    controller.retryShop(key);
    await vi.waitFor(() => expect(store.getState().shops[0]?.variants[0]?.id).toBe("replacement"));
    expect(store.getState().shops[0]?.cartLines).toEqual([{ variantId: "selected", quantity: 1 }]);
    expect(selectShopCartPreview(store.getState().shops[0]!)).toBe("");
    expect(selectCartReadiness(store.getState()).hint).toContain("Remove unavailable");
    controller.dispose();
  });
});
