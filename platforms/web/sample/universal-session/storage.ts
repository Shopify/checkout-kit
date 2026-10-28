import type { ShopifyCheckoutLogLevel } from "@shopify/checkout-kit";

import { coerceLogLevel, readStorage, writeStorage } from "../storage";
import {
  isBuyerCountry,
  type BuyerCountry,
  type CheckoutEnvironment,
} from "../universal-session/api";

// Generic helpers are shared with the Checkout playground; the keys are this page's own.
export { coerceLogLevel, DEFAULT_LOG_LEVEL, readStorage, writeStorage } from "../storage";

export type SourceMode = "build" | "manual";

/** Every setting except the pasted session URL, which is never stored. */
export type PersistedSettings = {
  sourceMode: SourceMode;
  /** Deprecated: migrated to storeDomains. */
  storefrontDomain: string;
  /** Domains of stores in the list, in order. */
  storeDomains: string[];
  environment: CheckoutEnvironment;
  buyerCountry: BuyerCountry | "";
  button: boolean;
  target: string;
  logLevel: ShopifyCheckoutLogLevel;
  settingsCollapsed: boolean;
  eventsCollapsed: boolean;
};

export function makeStorageKeys(prefix: string) {
  return {
    sourceMode: `${prefix}:source-mode`,
    storefrontDomain: `${prefix}:storefront-domain`,
    stores: `${prefix}:stores`,
    environment: `${prefix}:environment`,
    buyerCountry: `${prefix}:buyer-country`,
    button: `${prefix}:button`,
    target: `${prefix}:target`,
    logLevel: `${prefix}:log-level`,
    settingsCollapsed: `${prefix}:settings-collapsed`,
    eventsCollapsed: `${prefix}:events-collapsed`,
    columnLeft: `${prefix}:col-left`,
    columnRight: `${prefix}:col-right`,
  } as const;
}

// Default prefix for backward compatibility, used by Shop Pay.
const DEFAULT_PREFIX = "checkout-kit:shop-pay-demo";
export const STORAGE_KEYS = makeStorageKeys(DEFAULT_PREFIX);

export function loadPersistedSettings(prefix: string = DEFAULT_PREFIX): PersistedSettings {
  const keys = makeStorageKeys(prefix);
  const buyerCountry = readStorage(keys.buyerCountry);
  const storesJson = readStorage(keys.stores);
  let storeDomains: string[] = [];

  // Try to parse the stored domains list.
  if (storesJson) {
    try {
      const parsed = JSON.parse(storesJson);
      if (Array.isArray(parsed) && parsed.every((d) => typeof d === "string")) {
        storeDomains = parsed;
      }
    } catch {
      // Invalid JSON, ignore it.
    }
  }

  // One-time migration: seed the list from the old single-domain key until the list is
  // first saved. A saved empty list means the user removed every store.
  if (!storesJson) {
    const oldDomain = readStorage(keys.storefrontDomain);
    if (oldDomain) {
      storeDomains = [oldDomain];
    }
  }

  return {
    sourceMode: readStorage(keys.sourceMode) === "manual" ? "manual" : "build",
    storefrontDomain: readStorage(keys.storefrontDomain),
    storeDomains,
    environment: readStorage(keys.environment) === "development" ? "development" : "production",
    buyerCountry: isBuyerCountry(buyerCountry) ? buyerCountry : "",
    // The Shop Pay button is on unless it was turned off.
    button: readStorage(keys.button) !== "off",
    target: readStorage(keys.target),
    logLevel: coerceLogLevel(readStorage(keys.logLevel)),
    settingsCollapsed: readStorage(keys.settingsCollapsed) === "1",
    eventsCollapsed: readStorage(keys.eventsCollapsed) === "1",
  };
}

export function persistSettings(
  prefix: string = DEFAULT_PREFIX,
  settings: Partial<PersistedSettings>,
): void {
  const keys = makeStorageKeys(prefix);
  const values: Partial<Record<string, string>> = {
    sourceMode: settings.sourceMode,
    environment: settings.environment,
    buyerCountry: settings.buyerCountry,
    button: settings.button === undefined ? undefined : settings.button ? "" : "off",
    target: settings.target,
    logLevel: settings.logLevel,
    settingsCollapsed:
      settings.settingsCollapsed === undefined ? undefined : settings.settingsCollapsed ? "1" : "",
    eventsCollapsed:
      settings.eventsCollapsed === undefined ? undefined : settings.eventsCollapsed ? "1" : "",
  };

  if (settings.storeDomains !== undefined) {
    writeStorage(keys.stores, JSON.stringify(settings.storeDomains));
  }

  for (const [storageKey, value] of Object.entries(values)) {
    if (value !== undefined && storageKey in keys) {
      writeStorage(keys[storageKey as keyof typeof keys], value);
    }
  }
}
