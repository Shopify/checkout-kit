import { describe, expect, it, vi } from "vitest";

import type { ProductVariantOption } from "../cart";
import { createSessionPreparationController } from "./preparation";
import {
  createInitialState,
  createUniversalStore,
  selectCartReadiness,
  withInputChange,
  type ShopState,
} from "./state";
import { SampleTransportError, type CreatedCart, type PreparationTransport } from "./transport";

const CONTINUE_URL = "https://shop.app/checkouts/uc/synthetic-session?key=session-secret";

function variant(id: string): ProductVariantOption {
  return {
    id,
    title: `Product ${id}`,
    productTitle: `Product ${id}`,
    variantTitle: "Default Title",
    vendor: "Synthetic shop",
    price: "10.00",
    available: true,
  };
}

function shop(key: string, domain: string, variantId: string): ShopState {
  return {
    key,
    domain,
    catalogStatus: "ready",
    catalogError: "",
    variants: [variant(variantId)],
    cartLines: [{ variantId, quantity: 1 }],
    cartRevision: 1,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function readyStore() {
  return createUniversalStore({
    ...createInitialState(),
    shops: [
      shop("shop-1", "store-one.myshopify.com", "123"),
      shop("shop-2", "store-two.myshopify.com", "456"),
    ],
  });
}

describe("Universal session preparation", () => {
  it("creates independent carts, passes full opaque IDs in shop order, and keeps IDs out of state", async () => {
    const store = readyStore();
    const cartIds = [
      "gid://shopify/Cart/c1-first?key=first-cart-secret",
      "gid://shopify/Cart/c1-second?key=second-cart-secret",
    ];
    const createCart = vi
      .fn<PreparationTransport["createCart"]>()
      .mockImplementation(async (entry) => ({
        cartId: entry.domain === "store-one.myshopify.com" ? cartIds[0]! : cartIds[1]!,
        currencyCode: "CAD",
      }));
    const createSession = vi
      .fn<PreparationTransport["createSession"]>()
      .mockResolvedValue(CONTINUE_URL);
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    await controller.prepare();

    expect(createCart).toHaveBeenCalledTimes(2);
    expect(createCart).toHaveBeenNthCalledWith(
      1,
      { domain: "store-one.myshopify.com", lines: [{ variantId: "123", quantity: 1 }] },
      "production",
      "CA",
      expect.any(AbortSignal),
    );
    expect(createSession).toHaveBeenCalledWith(cartIds, "production", expect.any(AbortSignal));
    expect(store.getState().preparation).toMatchObject({
      phase: "ready",
      url: CONTINUE_URL,
      readyGeneration: 0,
      error: "",
      carts: {
        "shop-1": { phase: "ready", currencyCode: "CAD" },
        "shop-2": { phase: "ready", currencyCode: "CAD" },
      },
    });
    expect(JSON.stringify(store.getState())).not.toContain("first-cart-secret");
    expect(JSON.stringify(store.getState())).not.toContain("second-cart-secret");
    controller.dispose();
  });

  it("reuses a successful shop cart when another shop fails and is retried", async () => {
    const store = readyStore();
    const firstCartId = "gid://shopify/Cart/c1-first?key=first-cart-secret";
    const secondCartId = "gid://shopify/Cart/c1-second?key=second-cart-secret";
    let secondAttempts = 0;
    const createCart = vi
      .fn<PreparationTransport["createCart"]>()
      .mockImplementation(async (entry) => {
        if (entry.domain === "store-one.myshopify.com") {
          return { cartId: firstCartId, currencyCode: "CAD" };
        }
        secondAttempts += 1;
        if (secondAttempts === 1) throw new SampleTransportError("cart_rejected");
        return { cartId: secondCartId, currencyCode: "CAD" };
      });
    const createSession = vi
      .fn<PreparationTransport["createSession"]>()
      .mockResolvedValue(CONTINUE_URL);
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    await controller.prepare();
    expect(store.getState().preparation.phase).toBe("error");
    expect(store.getState().preparation.carts["shop-1"]).toEqual({
      phase: "ready",
      currencyCode: "CAD",
    });
    expect(createSession).not.toHaveBeenCalled();

    await controller.prepare();
    expect(store.getState().preparation.phase).toBe("ready");
    expect(
      createCart.mock.calls.filter(([entry]) => entry.domain === "store-one.myshopify.com"),
    ).toHaveLength(1);
    expect(
      createCart.mock.calls.filter(([entry]) => entry.domain === "store-two.myshopify.com"),
    ).toHaveLength(2);
    expect(createSession).toHaveBeenCalledWith(
      [firstCartId, secondCartId],
      "production",
      expect.any(AbortSignal),
    );
    controller.dispose();
  });

  it("recreates only the cart whose lines changed after a partial failure", async () => {
    const store = createUniversalStore({
      ...createInitialState(),
      shops: [
        shop("shop-1", "store-one.myshopify.com", "123"),
        shop("shop-2", "store-two.myshopify.com", "456"),
        shop("shop-3", "store-three.myshopify.com", "789"),
      ],
    });
    let thirdAttempts = 0;
    const createCart = vi
      .fn<PreparationTransport["createCart"]>()
      .mockImplementation(async (entry) => {
        if (entry.domain === "store-three.myshopify.com" && ++thirdAttempts === 1) {
          throw new SampleTransportError("cart_rejected");
        }
        return {
          cartId: `gid://shopify/Cart/${entry.domain}-${entry.lines[0]?.quantity}?key=synthetic-secret`,
          currencyCode: "CAD",
        };
      });
    const createSession = vi
      .fn<PreparationTransport["createSession"]>()
      .mockResolvedValue(CONTINUE_URL);
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    await controller.prepare();
    expect(store.getState().preparation.phase).toBe("error");
    store.update((state) =>
      withInputChange(
        state,
        state.shops.map((entry) =>
          entry.key === "shop-1"
            ? {
                ...entry,
                cartRevision: entry.cartRevision + 1,
                cartLines: [{ variantId: "123", quantity: 2 }],
              }
            : entry,
        ),
      ),
    );
    await controller.prepare();

    expect(
      createCart.mock.calls.filter(([entry]) => entry.domain === "store-one.myshopify.com"),
    ).toHaveLength(2);
    expect(
      createCart.mock.calls.filter(([entry]) => entry.domain === "store-two.myshopify.com"),
    ).toHaveLength(1);
    expect(
      createCart.mock.calls.filter(([entry]) => entry.domain === "store-three.myshopify.com"),
    ).toHaveLength(2);
    expect(createSession).toHaveBeenCalledWith(
      [
        "gid://shopify/Cart/store-one.myshopify.com-2?key=synthetic-secret",
        "gid://shopify/Cart/store-two.myshopify.com-1?key=synthetic-secret",
        "gid://shopify/Cart/store-three.myshopify.com-1?key=synthetic-secret",
      ],
      "production",
      expect.any(AbortSignal),
    );
    controller.dispose();
  });

  it("blocks mixed-currency carts before session creation", async () => {
    const store = readyStore();
    const createCart = vi
      .fn<PreparationTransport["createCart"]>()
      .mockImplementation(async (entry) => ({
        cartId: `gid://shopify/Cart/${entry.domain}?key=cart-secret`,
        currencyCode: entry.domain === "store-one.myshopify.com" ? "CAD" : "USD",
      }));
    const createSession = vi.fn<PreparationTransport["createSession"]>();
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    await controller.prepare();

    expect(createSession).not.toHaveBeenCalled();
    expect(store.getState().preparation.phase).toBe("error");
    expect(store.getState().preparation.error).toContain("different currencies");
    expect(store.getState().preparation.url).toBe("");
    controller.dispose();
  });

  it("reports a failed shop without showing a raw upstream secret", async () => {
    const store = readyStore();
    const createCart = vi
      .fn<PreparationTransport["createCart"]>()
      .mockImplementation(async (entry) => {
        if (entry.domain === "store-two.myshopify.com") {
          throw new Error("upstream response leaked-cart-secret");
        }
        return { cartId: "gid://shopify/Cart/c1-first?key=cart-secret", currencyCode: "CAD" };
      });
    const createSession = vi.fn<PreparationTransport["createSession"]>();
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    await controller.prepare();

    expect(store.getState().preparation.phase).toBe("error");
    expect(store.getState().preparation.error).toContain("store-two.myshopify.com");
    expect(store.getState().preparation.error).not.toContain("leaked-cart-secret");
    expect(createSession).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("aborts active requests and ignores stale carts when a shop input changes", async () => {
    const store = createUniversalStore({
      ...createInitialState(),
      shops: [shop("shop-1", "store-one.myshopify.com", "123")],
    });
    const pending = deferred<CreatedCart>();
    const createCart = vi.fn<PreparationTransport["createCart"]>().mockReturnValue(pending.promise);
    const createSession = vi.fn<PreparationTransport["createSession"]>();
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    const preparing = controller.prepare();
    const signal = createCart.mock.calls[0]?.[3];
    expect(signal?.aborted).toBe(false);
    store.update((state) =>
      withInputChange(
        state,
        state.shops.map((entry) => ({ ...entry })),
      ),
    );
    expect(signal?.aborted).toBe(true);
    pending.resolve({ cartId: "gid://shopify/Cart/c1-stale?key=cart-secret", currencyCode: "CAD" });
    await preparing;

    expect(store.getState().preparation).toMatchObject({
      phase: "editing",
      url: "",
      readyGeneration: null,
      carts: {},
    });
    expect(createSession).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("invalidates a ready URL when country or environment changes", async () => {
    const store = createUniversalStore({
      ...createInitialState(),
      shops: [shop("shop-1", "store-one.myshopify.com", "123")],
    });
    const transport: PreparationTransport = {
      createCart: vi.fn().mockResolvedValue({
        cartId: "gid://shopify/Cart/c1-first?key=cart-secret",
        currencyCode: "CAD",
      }),
      createSession: vi.fn().mockResolvedValue(CONTINUE_URL),
    };
    const controller = createSessionPreparationController({ store, transport });
    await controller.prepare();
    expect(store.getState().preparation.phase).toBe("ready");

    controller.setBuyerCountry("US");
    expect(store.getState().preparation.phase).toBe("editing");
    expect(store.getState().preparation.url).toBe("");
    const generation = store.getState().preparation.generation;
    controller.setEnvironment("development");
    expect(store.getState().preparation.generation).toBe(generation + 1);
    controller.dispose();
  });

  it("regenerates carts rejected by the session endpoint without exposing its raw response", async () => {
    const store = createUniversalStore({
      ...createInitialState(),
      shops: [shop("shop-1", "store-one.myshopify.com", "123")],
    });
    const createCart = vi.fn().mockResolvedValue({
      cartId: "gid://shopify/Cart/c1-first?key=cart-secret",
      currencyCode: "CAD",
    });
    const createSession = vi
      .fn()
      .mockRejectedValueOnce(new SampleTransportError("session_rejected"))
      .mockResolvedValueOnce(CONTINUE_URL);
    const transport: PreparationTransport = {
      createCart,
      createSession,
    };
    const controller = createSessionPreparationController({ store, transport });
    await controller.prepare();

    expect(store.getState().preparation.phase).toBe("error");
    expect(store.getState().preparation.error).toContain("selected carts");
    expect(store.getState().preparation.url).toBe("");
    expect(store.getState().preparation.carts).toEqual({});
    expect(selectCartReadiness(store.getState()).ready).toBe(true);
    await controller.prepare();
    expect(createCart).toHaveBeenCalledTimes(2);
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(store.getState().preparation.phase).toBe("ready");
    controller.dispose();
  });

  it("reuses successful carts after a transient session network error", async () => {
    const store = createUniversalStore({
      ...createInitialState(),
      shops: [shop("shop-1", "store-one.myshopify.com", "123")],
    });
    const createCart = vi.fn().mockResolvedValue({
      cartId: "gid://shopify/Cart/c1-first?key=cart-secret",
      currencyCode: "CAD",
    });
    const createSession = vi
      .fn()
      .mockRejectedValueOnce(new SampleTransportError("upstream_unavailable"))
      .mockResolvedValueOnce(CONTINUE_URL);
    const controller = createSessionPreparationController({
      store,
      transport: { createCart, createSession },
    });

    await controller.prepare();
    expect(store.getState().preparation.phase).toBe("error");
    await controller.prepare();
    expect(createCart).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(store.getState().preparation.phase).toBe("ready");
    controller.dispose();
  });
});
