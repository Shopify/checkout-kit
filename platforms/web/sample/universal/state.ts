import type { LogLevel } from "@shopify/checkout-kit";

import {
  buildCartPermalink,
  cartLineTotalQuantity,
  type CartLine,
  type ProductVariantOption,
} from "../cart";

export type CatalogStatus = "loading" | "ready" | "error";

export interface ShopState {
  key: string;
  domain: string;
  catalogStatus: CatalogStatus;
  catalogError: string;
  variants: ProductVariantOption[];
  cartLines: CartLine[];
  cartRevision: number;
}

export interface PreparationState {
  generation: number;
  phase: "editing" | "creatingCarts" | "creatingSession" | "ready" | "error";
  url: string;
  readyGeneration: number | null;
  error: string;
}

export interface DisplayState {
  target: "popup" | "auto";
  appearance: string;
  logLevel: LogLevel;
  settingsCollapsed: boolean;
  eventsCollapsed: boolean;
}

export interface UniversalState {
  shops: ShopState[];
  addShopError: string;
  preparation: PreparationState;
  display: DisplayState;
  runtime: { notice: string };
}

export type StateListener = (state: UniversalState, previous: UniversalState) => void;

export interface UniversalStore {
  getState(): UniversalState;
  update(change: (state: UniversalState) => UniversalState): void;
  subscribe(listener: StateListener): () => void;
}

export const DEFAULT_DISPLAY: DisplayState = {
  target: "popup",
  appearance: "",
  logLevel: "warn",
  settingsCollapsed: false,
  eventsCollapsed: false,
};

export function createInitialState(display: DisplayState = DEFAULT_DISPLAY): UniversalState {
  return {
    shops: [],
    addShopError: "",
    preparation: { generation: 0, phase: "editing", url: "", readyGeneration: null, error: "" },
    display,
    runtime: { notice: "Open a universal checkout to see received events." },
  };
}

export function createUniversalStore(initial: UniversalState): UniversalStore {
  let state = initial;
  const listeners = new Set<StateListener>();

  return {
    getState: () => state,
    update(change) {
      const next = change(state);
      if (next === state) return;
      const previous = state;
      state = next;
      for (const listener of listeners) listener(next, previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** An actual cart/shop input edit invalidates any prepared continuation URL. */
export function withInputChange(state: UniversalState, shops: ShopState[]): UniversalState {
  return {
    ...state,
    shops,
    preparation: {
      generation: state.preparation.generation + 1,
      phase: "editing",
      url: "",
      readyGeneration: null,
      error: "",
    },
  };
}

export function selectShop(state: UniversalState, key: string): ShopState | undefined {
  return state.shops.find((shop) => shop.key === key);
}

export function selectQuantity(shop: ShopState, variantId: string): number {
  return shop.cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

export function invalidCartLines(shop: ShopState): CartLine[] {
  return shop.cartLines.filter(
    (line) => !shop.variants.some((variant) => variant.id === line.variantId && variant.available),
  );
}

export function selectShopCartPreview(shop: ShopState): string {
  if (
    shop.catalogStatus !== "ready" ||
    shop.cartLines.length === 0 ||
    invalidCartLines(shop).length
  ) {
    return "";
  }
  try {
    return buildCartPermalink(shop.domain, shop.cartLines);
  } catch {
    return "";
  }
}

export interface CartReadiness {
  ready: boolean;
  shopCount: number;
  itemCount: number;
  hint: string;
}

export function selectCartReadiness(state: UniversalState): CartReadiness {
  const shopCount = state.shops.length;
  const itemCount = state.shops.reduce(
    (total, shop) => total + cartLineTotalQuantity(shop.cartLines),
    0,
  );
  const base = { shopCount, itemCount };

  if (shopCount === 0) {
    return { ...base, ready: false, hint: "Add a shop to start building carts." };
  }

  for (const shop of state.shops) {
    if (shop.catalogStatus === "loading") {
      return { ...base, ready: false, hint: `Wait for products from ${shop.domain} to load.` };
    }
    if (shop.catalogStatus === "error") {
      return { ...base, ready: false, hint: `Retry product loading for ${shop.domain}.` };
    }
    if (shop.cartLines.length === 0) {
      return { ...base, ready: false, hint: `Add a product to ${shop.domain}'s cart.` };
    }
    if (invalidCartLines(shop).length > 0) {
      return {
        ...base,
        ready: false,
        hint: `Remove unavailable products from ${shop.domain}'s cart.`,
      };
    }
  }

  return { ...base, ready: true, hint: "Every selected shop has a valid cart." };
}
