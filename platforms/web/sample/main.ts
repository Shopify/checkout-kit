import "@shopify/checkout-kit";
import type { ShopifyCheckout } from "@shopify/checkout-kit";

import { normalizeQuantity, normalizeStorefrontDomain, upsertCartLine } from "./cart";
import { createColumnResizer } from "./column-resizer";
import { queryRefs, timestamp } from "./dom";
import { createProductLoader } from "./product-loader";
import { renderApp } from "./render";
import {
  createInitialState,
  createStore,
  type ComponentSnapshot,
  type SettingsSlice,
  type SourceMode,
} from "./state";
import {
  coerceLogLevel,
  loadPersistedSettings,
  persistSettings,
  type PersistedSettings,
} from "./storage";
import "./styles.css";

const EVENT_TYPES = [
  "ec.start",
  "ec.complete",
  "ec.close",
  "ec.error",
  "ec.fulfillment.change",
  "ec.line_items.change",
  "ec.totals.change",
  "ec.messages.change",
] as const;

const refs = queryRefs();

const checkout = document.createElement("shopify-checkout") as ShopifyCheckout;
document.body.append(checkout);

const persisted = loadPersistedSettings();
hydrateSettingsForm(persisted);

const store = createStore(
  createInitialState(readSettings(persisted.settingsCollapsed, persisted.eventsCollapsed)),
);
const loader = createProductLoader({
  store,
  setDomainInputValue: (domain) => {
    refs.storefrontInput.value = domain;
  },
});

const resizer = createColumnResizer({
  layout: refs.layout,
  leftPanel: refs.settingsPanel,
  rightPanel: refs.runtimePanel,
  leftHandle: refs.resizeLeft,
  rightHandle: refs.resizeRight,
});

store.subscribe(() => {
  renderApp(refs, store.getState(), checkout);
  resizer.reposition();
});

attachListeners();
renderApp(refs, store.getState(), checkout);
resizer.applyWidths();
window.addEventListener("resize", resizer.reposition);

if (store.getState().sourceMode === "build" && store.getState().storefrontDomain) {
  loader.schedule(store.getState().storefrontDomain);
}

function currentSourceMode(): SourceMode {
  const checked = refs.form.querySelector<HTMLInputElement>("input[name='source-mode']:checked");
  return checked?.value === "manual" ? "manual" : "build";
}

function readSettings(settingsCollapsed: boolean, eventsCollapsed: boolean): SettingsSlice {
  const data = new FormData(refs.form);
  return {
    sourceMode: currentSourceMode(),
    storefrontDomain: refs.storefrontInput.value,
    target: String(data.get("target") ?? "popup"),
    appearance: String(data.get("appearance") ?? ""),
    logLevel: coerceLogLevel(String(data.get("log-level") ?? "")),
    manualSrc: refs.manualSrcInput.value,
    settingsCollapsed,
    eventsCollapsed,
  };
}

function hydrateSettingsForm(settings: PersistedSettings): void {
  const modeInput = refs.form.querySelector<HTMLInputElement>(
    `input[name='source-mode'][value='${settings.sourceMode}']`,
  );
  if (modeInput) modeInput.checked = true;

  refs.storefrontInput.value = settings.storefrontDomain;
  if (settings.target) refs.checkoutTarget.value = settings.target;
  if (settings.appearance) refs.checkoutAppearance.value = settings.appearance;
  refs.checkoutLogLevel.value = settings.logLevel;
}

function captureSettings(): void {
  const settings = readSettings(
    store.getState().settingsCollapsed,
    store.getState().eventsCollapsed,
  );
  store.setState(settings);
  persistSettings({
    sourceMode: settings.sourceMode,
    target: settings.target,
    appearance: settings.appearance,
    logLevel: settings.logLevel,
  });
}

function productQuantity(variantId: string): number {
  return store.getState().cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

function updateCartLine(variantId: string, quantity: unknown): void {
  store.setState({ cartLines: upsertCartLine(store.getState().cartLines, variantId, quantity) });
}

function openCheckout(): void {
  checkout.open();
}

function recordEvent(type: string): void {
  const snapshot: ComponentSnapshot = { checkout: checkout.checkout, error: checkout.error };
  const json = JSON.stringify(
    {
      checkout: checkout.checkout,
      error: checkout.error,
      target: checkout.target,
      appearance: checkout.appearance,
      logLevel: checkout.logLevel,
    },
    null,
    2,
  );
  store.setState({
    component: snapshot,
    log: [{ type, time: timestamp(), snapshot: json }, ...store.getState().log],
  });
}

function attachListeners(): void {
  refs.storefrontInput.addEventListener("input", () => {
    loader.schedule(refs.storefrontInput.value);
  });
  refs.manualSrcInput.addEventListener("input", captureSettings);

  refs.settingsToggle.addEventListener("click", () => {
    store.setState({ settingsCollapsed: !store.getState().settingsCollapsed });
    persistSettings({ settingsCollapsed: store.getState().settingsCollapsed });
  });

  refs.eventsToggle.addEventListener("click", () => {
    store.setState({ eventsCollapsed: !store.getState().eventsCollapsed });
    persistSettings({ eventsCollapsed: store.getState().eventsCollapsed });
  });

  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  refs.form.addEventListener("input", captureSettings);
  refs.form.addEventListener("change", (event) => {
    captureSettings();

    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "source-mode") {
      if (store.getState().sourceMode === "manual") {
        loader.cancel();
        return;
      }

      if (
        store.getState().variants.length === 0 &&
        normalizeStorefrontDomain(refs.storefrontInput.value)
      ) {
        loader.schedule(refs.storefrontInput.value);
      }
    }
  });

  refs.cartCheckoutButton.addEventListener("click", openCheckout);
  refs.manualCheckoutButton.addEventListener("click", openCheckout);

  refs.productList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>("button[data-cart-action]");
    if (!button) return;

    const productCard = button.closest<HTMLLIElement>(".product-card");
    const variantId = productCard?.dataset["variantId"];
    if (!variantId) return;

    const currentQuantity = productQuantity(variantId);
    switch (button.dataset["cartAction"]) {
      case "add":
        updateCartLine(variantId, 1);
        break;
      case "increment":
        updateCartLine(variantId, currentQuantity + 1);
        break;
      case "decrement":
        updateCartLine(variantId, currentQuantity - 1);
        break;
      default:
        break;
    }
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

  refs.selectedLines.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>("button[data-cart-action]");
    if (!button) return;

    const cartLine = button.closest<HTMLLIElement>(".cart-line");
    const variantId = cartLine?.dataset["variantId"];
    if (!variantId) return;

    const currentQuantity = productQuantity(variantId);
    switch (button.dataset["cartAction"]) {
      case "increment":
        updateCartLine(variantId, currentQuantity + 1);
        break;
      case "decrement":
        updateCartLine(variantId, currentQuantity - 1);
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

  refs.clearLogButton.addEventListener("click", () => {
    store.setState({ log: [] });
  });

  const checkoutEl: HTMLElement = checkout;
  for (const type of EVENT_TYPES) {
    checkoutEl.addEventListener(type, () => {
      recordEvent(type);
    });
  }
}
