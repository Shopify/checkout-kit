export type WalletsPurchaseSource = "cart" | "buynow";

export type WalletsPersistedSettings = {
  storefrontDomain: string;
  storefrontAccessToken: string;
  country: string;
  language: string;
  purchaseSource: WalletsPurchaseSource;
  cartId: string;
  variantId: string;
  sellingPlanId: string;
  walletCount: number;
  layout: string;
  settingsCollapsed: boolean;
  eventsCollapsed: boolean;
};

export const WALLETS_STORAGE_KEYS = {
  storefrontDomain: "checkout-kit:wallets-demo:storefront-domain",
  storefrontAccessToken: "checkout-kit:wallets-demo:storefront-access-token",
  country: "checkout-kit:wallets-demo:country",
  language: "checkout-kit:wallets-demo:language",
  purchaseSource: "checkout-kit:wallets-demo:purchase-source",
  cartId: "checkout-kit:wallets-demo:cart-id",
  variantId: "checkout-kit:wallets-demo:variant-id",
  sellingPlanId: "checkout-kit:wallets-demo:selling-plan-id",
  walletCount: "checkout-kit:wallets-demo:wallet-count",
  layout: "checkout-kit:wallets-demo:layout",
  settingsCollapsed: "checkout-kit:wallets-demo:settings-collapsed",
  eventsCollapsed: "checkout-kit:wallets-demo:events-collapsed",
  columnLeft: "checkout-kit:wallets-demo:col-left",
  columnRight: "checkout-kit:wallets-demo:col-right",
} as const;

export function coerceWalletCount(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}

export function loadWalletsPersistedSettings(): WalletsPersistedSettings {
  return {
    storefrontDomain: readStorage(WALLETS_STORAGE_KEYS.storefrontDomain),
    storefrontAccessToken: readStorage(WALLETS_STORAGE_KEYS.storefrontAccessToken),
    country: readStorage(WALLETS_STORAGE_KEYS.country),
    language: readStorage(WALLETS_STORAGE_KEYS.language),
    purchaseSource:
      readStorage(WALLETS_STORAGE_KEYS.purchaseSource) === "buynow" ? "buynow" : "cart",
    cartId: readStorage(WALLETS_STORAGE_KEYS.cartId),
    variantId: readStorage(WALLETS_STORAGE_KEYS.variantId),
    sellingPlanId: readStorage(WALLETS_STORAGE_KEYS.sellingPlanId),
    walletCount: coerceWalletCount(readStorage(WALLETS_STORAGE_KEYS.walletCount)),
    layout: readStorage(WALLETS_STORAGE_KEYS.layout) || "horizontal",
    settingsCollapsed: readStorage(WALLETS_STORAGE_KEYS.settingsCollapsed) === "1",
    eventsCollapsed: readStorage(WALLETS_STORAGE_KEYS.eventsCollapsed) === "1",
  };
}

export function persistWalletsSettings(settings: Partial<WalletsPersistedSettings>): void {
  if (settings.storefrontDomain !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.storefrontDomain, settings.storefrontDomain);
  }
  if (settings.storefrontAccessToken !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.storefrontAccessToken, settings.storefrontAccessToken);
  }
  if (settings.country !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.country, settings.country);
  }
  if (settings.language !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.language, settings.language);
  }
  if (settings.purchaseSource !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.purchaseSource, settings.purchaseSource);
  }
  if (settings.cartId !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.cartId, settings.cartId);
  }
  if (settings.variantId !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.variantId, settings.variantId);
  }
  if (settings.sellingPlanId !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.sellingPlanId, settings.sellingPlanId);
  }
  if (settings.walletCount !== undefined) {
    writeStorage(
      WALLETS_STORAGE_KEYS.walletCount,
      settings.walletCount > 0 ? String(settings.walletCount) : "",
    );
  }
  if (settings.layout !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.layout, settings.layout);
  }
  if (settings.settingsCollapsed !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.settingsCollapsed, settings.settingsCollapsed ? "1" : "");
  }
  if (settings.eventsCollapsed !== undefined) {
    writeStorage(WALLETS_STORAGE_KEYS.eventsCollapsed, settings.eventsCollapsed ? "1" : "");
  }
}
