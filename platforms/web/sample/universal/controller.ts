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

export interface UniversalController {
  addShop(rawDomain: string): boolean;
  clearAddError(): void;
  retryShop(key: string): void;
  removeShop(key: string): void;
  setQuantity(key: string, variantId: string, quantity: unknown): void;
  setRuntimeNotice(notice: string): void;
  dispose(): void;
}

interface ControllerOptions {
  store: UniversalStore;
  catalogLoader?: CatalogLoader;
}

export function createUniversalController(options: ControllerOptions): UniversalController {
  const { store } = options;
  const fetchCatalog = options.catalogLoader ?? loadCatalog;
  const requests = new Map<string, AbortController>();
  let nextKey = 0;
  let disposed = false;

  function clearAddError(): void {
    store.update((state) => (state.addShopError ? { ...state, addShopError: "" } : state));
  }

  function loadShop(key: string): void {
    if (disposed) return;
    const initialShop = selectShop(store.getState(), key);
    if (!initialShop) return;

    requests.get(key)?.abort();
    const request = new AbortController();
    requests.set(key, request);

    store.update((state) => {
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

    void fetchCatalog(initialShop.domain, request.signal)
      .then((variants) => {
        if (disposed || request.signal.aborted || requests.get(key) !== request) return undefined;
        requests.delete(key);
        return store.update((state) => {
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
        if (disposed || request.signal.aborted || requests.get(key) !== request) return;
        requests.delete(key);
        store.update((state) => {
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

  function addShop(rawDomain: string): boolean {
    if (disposed) return false;
    const parsed = parseShopDomain(rawDomain);
    if (!parsed.ok) {
      store.update((state) => ({ ...state, addShopError: parsed.message }));
      return false;
    }
    if (store.getState().shops.some((shop) => shop.domain === parsed.domain)) {
      store.update((state) => ({
        ...state,
        addShopError: `${parsed.domain} is already selected.`,
      }));
      return false;
    }

    const key = `shop-${++nextKey}`;
    const shop: ShopState = {
      key,
      domain: parsed.domain,
      catalogStatus: "loading",
      catalogError: "",
      variants: [],
      cartLines: [],
      cartRevision: 0,
    };
    store.update((state) => ({
      ...withInputChange(state, [...state.shops, shop]),
      addShopError: "",
    }));
    loadShop(key);
    return true;
  }

  function retryShop(key: string): void {
    const shop = selectShop(store.getState(), key);
    if (!shop || shop.catalogStatus === "loading") return;
    loadShop(key);
  }

  function removeShop(key: string): void {
    if (!selectShop(store.getState(), key)) return;
    requests.get(key)?.abort();
    requests.delete(key);
    store.update((state) =>
      withInputChange(
        state,
        state.shops.filter((shop) => shop.key !== key),
      ),
    );
  }

  function setQuantity(key: string, variantId: string, quantity: unknown): void {
    const normalizedId = variantId.trim();
    if (!normalizedId) return;
    store.update((state) => {
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

  function setRuntimeNotice(notice: string): void {
    store.update((state) => ({ ...state, runtime: { notice } }));
  }

  function dispose(): void {
    disposed = true;
    for (const request of requests.values()) request.abort();
    requests.clear();
  }

  return { addShop, clearAddError, retryShop, removeShop, setQuantity, setRuntimeNotice, dispose };
}
