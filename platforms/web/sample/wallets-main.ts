import "@shopify/checkout-kit/wallets";
import type { ShopifyAcceleratedCheckoutButtons } from "@shopify/checkout-kit/wallets";

import { normalizeQuantity, upsertCartLine, type CartLine } from "./cart";
import { createColumnResizer } from "./column-resizer";
import { parseColumnWidth } from "./columns";
import { timestamp } from "./dom";
import { createProductLoader } from "./product-loader";
import { type LogEntry } from "./state";
import { readStorage, writeStorage } from "./storage";
import { createStorefrontCart } from "./storefront-api";
import { queryWalletsRefs } from "./wallets-dom";
import { renderWalletsApp } from "./wallets-render";
import {
  createWalletsInitialState,
  createWalletsStore,
  type WalletsSettingsSlice,
} from "./wallets-state";
import {
  coerceWalletCount,
  loadWalletsPersistedSettings,
  persistWalletsSettings,
  WALLETS_STORAGE_KEYS,
  type WalletsPersistedSettings,
  type WalletsPurchaseSource,
} from "./wallets-storage";
import "./styles.css";

/**
 * Event names the playground listens for on the element.
 * Kept in one place so future additions require only one edit.
 */
const WALLETS_EVENT_TYPES = ["wallets.render", "wallets.error"] as const;

const refs = queryWalletsRefs();

const element = document.createElement(
  "shopify-accelerated-checkout-buttons",
) as ShopifyAcceleratedCheckoutButtons;
refs.elementWrapper.append(element);

const persisted = loadWalletsPersistedSettings();
hydrateForm(persisted);

const store = createWalletsStore(
  createWalletsInitialState(readSettings(persisted.settingsCollapsed, persisted.eventsCollapsed)),
);

const loader = createProductLoader({
  store,
  setDomainInputValue: (domain) => {
    refs.storefrontInput.value = domain;
  },
  persistDomain: (domain) => {
    persistWalletsSettings({ storefrontDomain: domain });
  },
});

const WALLETS_COL_KEYS: Record<string, string> = {
  left: WALLETS_STORAGE_KEYS.columnLeft,
  right: WALLETS_STORAGE_KEYS.columnRight,
};

const resizer = createColumnResizer({
  layout: refs.layout,
  leftPanel: refs.settingsPanel,
  rightPanel: refs.runtimePanel,
  leftHandle: refs.resizeLeft,
  rightHandle: refs.resizeRight,
  readPersisted: (side) => parseColumnWidth(readStorage(WALLETS_COL_KEYS[side] ?? "")),
  persist: (side, px) => writeStorage(WALLETS_COL_KEYS[side] ?? "", px === null ? "" : String(px)),
});

store.subscribe(() => {
  renderWalletsApp(refs, store.getState(), element);
  resizer.reposition();
});

attachListeners();
renderWalletsApp(refs, store.getState(), element);
resizer.applyWidths();
window.addEventListener("resize", resizer.reposition);

if (store.getState().storefrontDomain) {
  loader.schedule(store.getState().storefrontDomain);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function currentPurchaseSource(): WalletsPurchaseSource {
  const checked = refs.form.querySelector<HTMLInputElement>(
    "input[name='purchase-source']:checked",
  );
  return checked?.value === "buynow" ? "buynow" : "cart";
}

function readSettings(settingsCollapsed: boolean, eventsCollapsed: boolean): WalletsSettingsSlice {
  return {
    storefrontDomain: refs.storefrontInput.value,
    storefrontAccessToken: refs.accessTokenInput.value,
    country: refs.countryInput.value,
    language: refs.languageInput.value,
    purchaseSource: currentPurchaseSource(),
    cartId: refs.cartIdInput.value,
    variantId: refs.variantIdInput.value,
    sellingPlanId: refs.sellingPlanIdInput.value,
    walletCount: coerceWalletCount(refs.walletCountInput.value),
    layout: refs.layoutSelect.value,
    settingsCollapsed,
    eventsCollapsed,
  };
}

function hydrateForm(settings: WalletsPersistedSettings): void {
  const sourceInput = refs.form.querySelector<HTMLInputElement>(
    `input[name='purchase-source'][value='${settings.purchaseSource}']`,
  );
  if (sourceInput) sourceInput.checked = true;

  refs.storefrontInput.value = settings.storefrontDomain;
  refs.accessTokenInput.value = settings.storefrontAccessToken;
  refs.countryInput.value = settings.country;
  refs.languageInput.value = settings.language;
  refs.cartIdInput.value = settings.cartId;
  refs.variantIdInput.value = settings.variantId;
  refs.sellingPlanIdInput.value = settings.sellingPlanId;
  refs.walletCountInput.value = String(settings.walletCount);
  if (settings.layout) refs.layoutSelect.value = settings.layout;
}

function captureSettings(): void {
  const state = store.getState();
  const settings = readSettings(state.settingsCollapsed, state.eventsCollapsed);
  store.setState(settings);
  persistWalletsSettings(settings);
  logPropertyWrites(settings);
}

function productQuantity(variantId: string): number {
  return store.getState().cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

function updateCartLine(variantId: string, quantity: unknown): void {
  store.setState({
    cartLines: upsertCartLine(store.getState().cartLines, variantId, quantity),
  });
}

async function createCart(lines: readonly CartLine[]): Promise<void> {
  const state = store.getState();
  if (!state.storefrontDomain || !state.storefrontAccessToken || lines.length === 0) return;

  // Log the attempt.
  const requestJson = JSON.stringify(
    { lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })) },
    null,
    2,
  );
  store.setState({
    log: [
      { type: "cart.creating", time: timestamp(), snapshot: requestJson },
      ...store.getState().log,
    ],
  });

  try {
    const result = await createStorefrontCart(
      state.storefrontDomain,
      state.storefrontAccessToken,
      lines,
    );

    // Write the GID into the cart-id input and push it to the element.
    refs.cartIdInput.value = result.cartId;
    captureSettings();

    const successJson = JSON.stringify({ cartId: result.cartId }, null, 2);
    store.setState({
      log: [
        { type: "cart.created", time: timestamp(), snapshot: successJson },
        ...store.getState().log,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create cart.";
    const errorJson = JSON.stringify({ error: message }, null, 2);
    store.setState({
      log: [
        { type: "cart.error", time: timestamp(), snapshot: errorJson },
        ...store.getState().log,
      ],
    });
  }
}

function logPropertyWrites(settings: WalletsSettingsSlice): void {
  const isBuynow = settings.purchaseSource === "buynow";

  const writes: Record<string, string | number | undefined> = {
    storeDomain: settings.storefrontDomain || undefined,
    country: settings.country || undefined,
    language: settings.language || undefined,
    walletCount: settings.walletCount,
    layout: settings.layout || undefined,
    cartId: isBuynow ? undefined : settings.cartId || undefined,
    variantId: isBuynow ? settings.variantId || undefined : undefined,
    sellingPlanId: isBuynow ? settings.sellingPlanId || undefined : undefined,
  };

  const reflected: Record<string, string | null> = {
    "store-domain": element.getAttribute("store-domain"),
    country: element.getAttribute("country"),
    language: element.getAttribute("language"),
    "wallet-count": element.getAttribute("wallet-count"),
    layout: element.getAttribute("layout"),
    "cart-id": element.getAttribute("cart-id"),
    "variant-id": element.getAttribute("variant-id"),
    "selling-plan-id": element.getAttribute("selling-plan-id"),
  };

  const json = JSON.stringify({ propertyWrites: writes, reflectedAttributes: reflected }, null, 2);
  const entry: LogEntry = { type: "settings.update", time: timestamp(), snapshot: json };
  store.setState({ log: [entry, ...store.getState().log] });
}

function recordEvent(type: string, detail: unknown): void {
  const json = JSON.stringify(
    {
      type,
      detail,
      element: {
        storeDomain: element.storeDomain,
        country: element.country,
        language: element.language,
        cartId: element.cartId,
        variantId: element.variantId,
        sellingPlanId: element.sellingPlanId,
        walletCount: element.walletCount,
      },
    },
    null,
    2,
  );
  store.setState({
    log: [{ type, time: timestamp(), snapshot: json }, ...store.getState().log],
  });
}

function attachListeners(): void {
  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  refs.form.addEventListener("input", captureSettings);
  refs.form.addEventListener("change", () => {
    captureSettings();
  });

  refs.storefrontInput.addEventListener("input", () => {
    loader.schedule(refs.storefrontInput.value);
  });

  refs.settingsToggle.addEventListener("click", () => {
    store.setState({ settingsCollapsed: !store.getState().settingsCollapsed });
    persistWalletsSettings({ settingsCollapsed: store.getState().settingsCollapsed });
  });

  // --- Create cart button -----------------------------------------------
  refs.createCartButton.addEventListener("click", () => {
    createCart(store.getState().cartLines);
  });

  refs.eventsToggle.addEventListener("click", () => {
    store.setState({ eventsCollapsed: !store.getState().eventsCollapsed });
    persistWalletsSettings({ eventsCollapsed: store.getState().eventsCollapsed });
  });

  refs.clearLogButton.addEventListener("click", () => {
    store.setState({ log: [] });
  });

  // --- Product grid clicks (mode-aware) --------------------------------
  refs.productList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // In buynow / select mode only available (role="button") cards are selectable.
    if (store.getState().purchaseSource === "buynow") {
      const card = target.closest<HTMLLIElement>(".product-card[role='button'][data-variant-id]");
      const variantId = card?.dataset["variantId"];
      if (variantId) {
        refs.variantIdInput.value = variantId;
        captureSettings();
      }
      return;
    }

    // Cart mode: delegate to the action button inside the card.
    const button = target.closest<HTMLButtonElement>("button[data-cart-action]");
    if (!button) return;

    const productCard = button.closest<HTMLLIElement>(".product-card");
    const variantId = productCard?.dataset["variantId"];
    if (!variantId) return;

    const currentQty = productQuantity(variantId);
    switch (button.dataset["cartAction"]) {
      case "add":
        updateCartLine(variantId, 1);
        break;
      case "increment":
        updateCartLine(variantId, currentQty + 1);
        break;
      case "decrement":
        updateCartLine(variantId, currentQty - 1);
        break;
      default:
        break;
    }
  });

  // Keyboard support for selectable cards (Enter / Space).
  refs.productList.addEventListener("keydown", (event) => {
    if (store.getState().purchaseSource !== "buynow") return;
    if (event.key !== "Enter" && event.key !== " ") return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const card = target.closest<HTMLLIElement>(".product-card[role='button'][data-variant-id]");
    const variantId = card?.dataset["variantId"];
    if (!variantId) return;

    event.preventDefault();
    refs.variantIdInput.value = variantId;
    captureSettings();
  });

  refs.productList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains("cart-line-quantity")) {
      return;
    }

    const productCard = target.closest<HTMLLIElement>(".product-card");
    const variantId = productCard?.dataset["variantId"];
    if (!variantId) return;

    const quantity = normalizeQuantity(target.value);
    target.value = String(quantity);
    updateCartLine(variantId, quantity);
  });

  // --- Cart mode: cart banner line controls ----------------------------
  refs.selectedLines.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>("button[data-cart-action]");
    if (!button) return;

    const cartLine = button.closest<HTMLLIElement>(".cart-line");
    const variantId = cartLine?.dataset["variantId"];
    if (!variantId) return;

    const currentQty = productQuantity(variantId);
    switch (button.dataset["cartAction"]) {
      case "increment":
        updateCartLine(variantId, currentQty + 1);
        break;
      case "decrement":
        updateCartLine(variantId, currentQty - 1);
        break;
      case "remove":
        updateCartLine(variantId, 0);
        break;
      default:
        break;
    }
  });

  refs.selectedLines.addEventListener("change", (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.classList.contains("cart-line-summary-quantity")
    ) {
      return;
    }

    const cartLine = target.closest<HTMLLIElement>(".cart-line");
    const variantId = cartLine?.dataset["variantId"];
    if (!variantId) return;

    const quantity = normalizeQuantity(target.value);
    target.value = String(quantity);
    updateCartLine(variantId, quantity);
  });

  // --- Element events --------------------------------------------------
  const el: HTMLElement = element;
  for (const type of WALLETS_EVENT_TYPES) {
    el.addEventListener(type, ((event: CustomEvent) => {
      recordEvent(type, event.detail ?? null);
    }) as EventListener);
  }
}
