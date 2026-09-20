import type { CartLine, ProductVariantOption } from "./cart";
import type { CartStatus, LogEntry, NoticeTone } from "./state";
import type { WalletsPurchaseSource } from "./wallets-storage";

export type { WalletsPurchaseSource };

export type WalletsSettingsSlice = {
  storefrontDomain: string;
  storefrontAccessToken: string;
  country: string;
  language: string;
  purchaseSource: WalletsPurchaseSource;
  variantId: string;
  sellingPlanId: string;
  walletCount: number;
  layout: string;
  settingsCollapsed: boolean;
  eventsCollapsed: boolean;
};

export type WalletsAppState = WalletsSettingsSlice & {
  variants: ProductVariantOption[];
  cartLines: CartLine[];
  loadState: string;
  cartStatus: CartStatus;
  log: LogEntry[];
};

export const WALLETS_INITIAL_LOAD_STATE = "Waiting for domain";
export const WALLETS_INITIAL_CART_STATUS: CartStatus = {
  message: "Enter a storefront domain to load products automatically.",
  tone: "info" as NoticeTone,
};

export function createWalletsInitialState(settings: WalletsSettingsSlice): WalletsAppState {
  return {
    ...settings,
    variants: [],
    cartLines: [],
    loadState: WALLETS_INITIAL_LOAD_STATE,
    cartStatus: WALLETS_INITIAL_CART_STATUS,
    log: [],
  };
}

export type WalletsStore = {
  getState(): WalletsAppState;
  setState(partial: Partial<WalletsAppState>): void;
  subscribe(listener: () => void): void;
};

export function createWalletsStore(initial: WalletsAppState): WalletsStore {
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
