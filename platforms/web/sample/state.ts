import { buildCartPermalink, type CartLine, type ProductVariantOption } from "./cart";
import type { SourceMode } from "./storage";

export type { SourceMode };
export type NoticeTone = "info" | "success" | "error";

export type LogEntry = {
  type: string;
  time: string;
  snapshot: string;
};

export type ComponentSnapshot = {
  checkout: unknown;
  error: unknown;
};

export type CartStatus = {
  message: string;
  tone: NoticeTone;
};

export type SettingsSlice = {
  sourceMode: SourceMode;
  storefrontDomain: string;
  target: string;
  appearance: string;
  debug: boolean;
  manualSrc: string;
  settingsCollapsed: boolean;
};

export type AppState = SettingsSlice & {
  variants: ProductVariantOption[];
  cartLines: CartLine[];
  loadState: string;
  cartStatus: CartStatus;
  component: ComponentSnapshot;
  log: LogEntry[];
};

export const INITIAL_LOAD_STATE = "Waiting for domain";
export const INITIAL_CART_STATUS: CartStatus = {
  message: "Enter a storefront domain to load products automatically.",
  tone: "info",
};

export function createInitialState(settings: SettingsSlice): AppState {
  return {
    ...settings,
    variants: [],
    cartLines: [],
    loadState: INITIAL_LOAD_STATE,
    cartStatus: INITIAL_CART_STATUS,
    component: { checkout: undefined, error: undefined },
    log: [],
  };
}

export type Store = {
  getState(): AppState;
  setState(partial: Partial<AppState>): void;
  subscribe(listener: () => void): void;
};

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState(partial) {
      state = { ...state, ...partial };
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
    },
  };
}

export function selectGeneratedCartUrl(state: AppState): string {
  if (state.cartLines.length === 0) return "";

  try {
    return buildCartPermalink(state.storefrontDomain, state.cartLines);
  } catch {
    return "";
  }
}

export function selectActiveSourceUrl(state: AppState): string {
  return state.sourceMode === "manual" ? state.manualSrc.trim() : selectGeneratedCartUrl(state);
}
