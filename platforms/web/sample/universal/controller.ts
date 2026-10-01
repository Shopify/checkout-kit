import { normalizeQuantity, upsertCartLine } from "../cart";
import { loadCatalog, type CatalogLoader } from "./catalog";
import { parseShopDomain } from "./domain";
import {
  selectQuantity,
  selectShop,
  withInputChange,
  type ShopState,
  type UniversalStore,
} from "./state";

const CATALOG_FAILURE =
  "Could not load public products. Check the domain and published products, then retry.";
const EMPTY_CATALOG = "No products were found. Publish products to this shop and retry.";

interface ControllerOptions {
  store: UniversalStore;
  catalogLoader?: CatalogLoader;
}

export class UniversalController {
  readonly #store: UniversalStore;
  readonly #fetchCatalog: CatalogLoader;
  readonly #requests = new Map<string, AbortController>();
  #nextKey = 0;
  #disposed = false;

  constructor(options: ControllerOptions) {
    this.#store = options.store;
    this.#fetchCatalog = options.catalogLoader ?? loadCatalog;
  }

  readonly clearAddError = (): void => {
    this.#store.update((state) => (state.addShopError ? { ...state, addShopError: "" } : state));
  };

  #loadShop(key: string): void {
    if (this.#disposed) return;
    const initialShop = selectShop(this.#store.getState(), key);
    if (!initialShop) return;

    this.#requests.get(key)?.abort();
    const request = new AbortController();
    this.#requests.set(key, request);

    this.#store.update((state) => {
      const shop = selectShop(state, key);
      if (!shop) return state;
      if (shop.catalogStatus === "loading" && !shop.catalogError) return state;
      const shops = state.shops.map((entry) =>
        entry.key === key
          ? { ...entry, catalogStatus: "loading" as const, catalogError: "" }
          : entry,
      );
      return withInputChange(state, shops);
    });

    void this.#fetchCatalog(initialShop.domain, request.signal)
      .then((variants) => {
        if (this.#disposed || request.signal.aborted || this.#requests.get(key) !== request)
          return undefined;
        this.#requests.delete(key);
        return this.#store.update((state) => {
          if (!selectShop(state, key)) return state;
          if (variants.length === 0) {
            return {
              ...state,
              shops: state.shops.map((shop) =>
                shop.key === key
                  ? { ...shop, catalogStatus: "error" as const, catalogError: EMPTY_CATALOG }
                  : shop,
              ),
            };
          }
          return {
            ...state,
            shops: state.shops.map((shop) =>
              shop.key === key
                ? { ...shop, catalogStatus: "ready" as const, catalogError: "", variants }
                : shop,
            ),
          };
        });
      })
      .catch(() => {
        if (this.#disposed || request.signal.aborted || this.#requests.get(key) !== request) return;
        this.#requests.delete(key);
        this.#store.update((state) => {
          if (!selectShop(state, key)) return state;
          return {
            ...state,
            shops: state.shops.map((shop) =>
              shop.key === key
                ? { ...shop, catalogStatus: "error" as const, catalogError: CATALOG_FAILURE }
                : shop,
            ),
          };
        });
      });
  }

  addShop(rawDomain: string): boolean {
    if (this.#disposed) return false;
    const parsed = parseShopDomain(rawDomain);
    if (!parsed.ok) {
      this.#store.update((state) => ({ ...state, addShopError: parsed.message }));
      return false;
    }
    if (this.#store.getState().shops.some((shop) => shop.domain === parsed.domain)) {
      this.#store.update((state) => ({
        ...state,
        addShopError: `${parsed.domain} is already selected.`,
      }));
      return false;
    }

    const key = `shop-${++this.#nextKey}`;
    const shop: ShopState = {
      key,
      domain: parsed.domain,
      catalogStatus: "loading",
      catalogError: "",
      variants: [],
      cartLines: [],
      cartRevision: 0,
    };
    this.#store.update((state) => ({
      ...withInputChange(state, [...state.shops, shop]),
      addShopError: "",
    }));
    this.#loadShop(key);
    return true;
  }

  retryShop(key: string): void {
    const shop = selectShop(this.#store.getState(), key);
    if (!shop || shop.catalogStatus === "loading") return;
    this.#loadShop(key);
  }

  removeShop(key: string): void {
    if (!selectShop(this.#store.getState(), key)) return;
    this.#requests.get(key)?.abort();
    this.#requests.delete(key);
    this.#store.update((state) =>
      withInputChange(
        state,
        state.shops.filter((shop) => shop.key !== key),
      ),
    );
  }

  setQuantity(key: string, variantId: string, quantity: unknown): void {
    const normalizedId = variantId.trim();
    if (!normalizedId) return;
    this.#store.update((state) => {
      const shop = selectShop(state, key);
      if (!shop) return state;
      const nextQuantity = Number(quantity) <= 0 ? 0 : normalizeQuantity(quantity);
      const currentQuantity = selectQuantity(shop, normalizedId);
      if (currentQuantity === nextQuantity) return state;
      if (nextQuantity > 0) {
        const variant = shop.variants.find((entry) => entry.id === normalizedId);
        if (shop.catalogStatus !== "ready" || !variant?.available) return state;
      }

      const cartLines = upsertCartLine(shop.cartLines, normalizedId, nextQuantity);
      const shops = state.shops.map((entry) =>
        entry.key === key ? { ...entry, cartLines, cartRevision: entry.cartRevision + 1 } : entry,
      );
      return withInputChange(state, shops);
    });
  }

  setRuntimeNotice(notice: string): void {
    this.#store.update((state) => ({ ...state, runtime: { notice } }));
  }

  dispose(): void {
    this.#disposed = true;
    for (const request of this.#requests.values()) request.abort();
    this.#requests.clear();
  }
}
