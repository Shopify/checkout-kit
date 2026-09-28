import "@shopify/checkout-kit/universal";

import { normalizeQuantity } from "./cart";
import { createColumnResizer } from "./column-resizer";
import { $ } from "./dom";
import {
  isConfiguredContinuationUrl,
  setDevelopmentContinuationHost,
} from "./universal/browser-policy";
import { loadSampleConfiguration } from "./universal/configuration";
import { UniversalController } from "./universal/controller";
import { mountUniversalOverlay } from "./universal/overlay";
import { createSessionPreparationController } from "./universal/preparation";
import { isBuyerCountry, isCheckoutEnvironment } from "./universal/policy";
import { createSourceSelection } from "./universal/source-selection";
import { querySourceViewRefs, renderSourceView } from "./universal/source-view";
import {
  createInitialState,
  createUniversalStore,
  selectQuantity,
  selectShop,
  type DisplayState,
} from "./universal/state";
import {
  loadUniversalDisplay,
  persistUniversalDisplay,
  persistUniversalWidth,
  readUniversalWidth,
} from "./universal/storage";
import { queryUniversalRefs, renderUniversalApp, renderUniversalChange } from "./universal/views";
import "./styles.css";

const refs = queryUniversalRefs();
const sourceRefs = querySourceViewRefs();
const store = createUniversalStore(createInitialState(loadUniversalDisplay()));
const controller = new UniversalController({ store });
const preparation = createSessionPreparationController({ store });
const sourceSelection = createSourceSelection(isConfiguredContinuationUrl);
const overlay = mountUniversalOverlay({
  parent: document.body,
  hostLog: $<HTMLElement>("#event-log"),
  hostHeader: $<HTMLElement>(".events-header"),
  hostNotice: refs.runtimeNotice,
  validateSource: (value) =>
    isConfiguredContinuationUrl(value, store.getState().environment) ? value : undefined,
  onChange: (snapshot) => {
    if (store.getState().runtime.notice !== snapshot.notice) {
      controller.setRuntimeNotice(snapshot.notice);
    }
  },
});
const resizer = createColumnResizer({
  layout: refs.layout,
  leftPanel: refs.settingsPanel,
  rightPanel: refs.runtimePanel,
  leftHandle: refs.resizeLeft,
  rightHandle: refs.resizeRight,
  readPersisted: readUniversalWidth,
  persist: persistUniversalWidth,
});

const unsubscribe = store.subscribe((state, previous) => {
  renderUniversalChange(refs, state, previous);
  syncSelectedSource();
  resizer.reposition();
});

function syncSelectedSource(): void {
  const state = store.getState();
  const selected = sourceSelection.select(state.preparation, state.environment);
  renderSourceView(sourceRefs, sourceSelection.mode, sourceSelection.pastedDraft, selected);
  overlay.configure({
    src: selected.url,
    target: state.display.target,
    appearance: state.display.appearance,
    logLevel: state.display.logLevel,
  });
}

function updateDisplay(partial: Partial<DisplayState>): void {
  const display = { ...store.getState().display, ...partial };
  store.update((state) => ({ ...state, display }));
  persistUniversalDisplay(display);
}

refs.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (controller.addShop(refs.domainInput.value)) {
    refs.domainInput.value = "";
    refs.domainInput.focus();
  }
});

refs.domainInput.addEventListener("input", controller.clearAddError);

sourceRefs.generatedInput.addEventListener("change", () => {
  if (!sourceRefs.generatedInput.checked) return;
  sourceSelection.setMode("generated");
  syncSelectedSource();
});

sourceRefs.pastedInput.addEventListener("change", () => {
  if (!sourceRefs.pastedInput.checked) return;
  sourceSelection.setMode("pasted");
  syncSelectedSource();
  sourceRefs.pastedUrl.focus();
});

sourceRefs.pastedUrl.addEventListener("input", () => {
  sourceSelection.setPastedDraft(sourceRefs.pastedUrl.value);
  syncSelectedSource();
});

sourceRefs.openButton.addEventListener("click", () => {
  const state = store.getState();
  if (!sourceSelection.select(state.preparation, state.environment).ready) return;
  overlay.attemptOpen();
});

refs.form.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target === refs.targetInput) {
    updateDisplay({ target: target.value === "auto" ? "auto" : "popup" });
  } else if (target === refs.environmentInput) {
    if (isCheckoutEnvironment(target.value)) preparation.setEnvironment(target.value);
  } else if (target === refs.buyerCountryInput) {
    if (isBuyerCountry(target.value)) preparation.setBuyerCountry(target.value);
  } else if (target === refs.appearanceInput) {
    updateDisplay({ appearance: target.value });
  } else if (target === refs.logLevelInput) {
    const logLevel = target.value;
    if (
      logLevel === "debug" ||
      logLevel === "warn" ||
      logLevel === "error" ||
      logLevel === "none"
    ) {
      updateDisplay({ logLevel });
    }
  }
});

refs.prepareButton.addEventListener("click", () => {
  void preparation.prepare();
});

refs.settingsToggle.addEventListener("click", () => {
  updateDisplay({ settingsCollapsed: !store.getState().display.settingsCollapsed });
});

refs.eventsToggle.addEventListener("click", () => {
  updateDisplay({ eventsCollapsed: !store.getState().display.eventsCollapsed });
});

refs.shopList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const shopButton = target.closest<HTMLButtonElement>("button[data-shop-action]");
  if (shopButton) {
    const shopKey = shopButton.closest<HTMLElement>("[data-shop-key]")?.dataset["shopKey"];
    if (!shopKey) return;
    if (shopButton.dataset["shopAction"] === "remove") controller.removeShop(shopKey);
    if (shopButton.dataset["shopAction"] === "retry") controller.retryShop(shopKey);
    return;
  }

  const cartButton = target.closest<HTMLButtonElement>("button[data-cart-action]");
  const item = cartButton?.closest<HTMLElement>("[data-shop-key][data-variant-id]");
  const shopKey = item?.dataset["shopKey"];
  const variantId = item?.dataset["variantId"];
  if (!cartButton || !shopKey || !variantId) return;
  const shop = selectShop(store.getState(), shopKey);
  if (!shop) return;
  const quantity = selectQuantity(shop, variantId);
  switch (cartButton.dataset["cartAction"]) {
    case "add":
      controller.setQuantity(shopKey, variantId, 1);
      break;
    case "increment":
      controller.setQuantity(shopKey, variantId, quantity + 1);
      break;
    case "decrement":
      controller.setQuantity(shopKey, variantId, quantity - 1);
      break;
    case "remove":
      controller.setQuantity(shopKey, variantId, 0);
      break;
    default:
      break;
  }
});

refs.shopList.addEventListener("change", (event) => {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) ||
    (!target.classList.contains("cart-line-quantity") &&
      !target.classList.contains("cart-line-summary-quantity"))
  ) {
    return;
  }
  const item = target.closest<HTMLElement>("[data-shop-key][data-variant-id]");
  const shopKey = item?.dataset["shopKey"];
  const variantId = item?.dataset["variantId"];
  if (!shopKey || !variantId) return;
  const quantity = normalizeQuantity(target.value);
  target.value = String(quantity);
  controller.setQuantity(shopKey, variantId, quantity);
});

renderUniversalApp(refs, store.getState());
syncSelectedSource();
resizer.applyWidths();
void loadSampleConfiguration()
  .then((configuration) => {
    setDevelopmentContinuationHost(configuration.developmentContinuationHost);
    for (const domain of configuration.shopDomains) {
      if (!store.getState().shops.some((shop) => shop.domain === domain))
        controller.addShop(domain);
    }
    syncSelectedSource();
    return undefined;
  })
  .catch(() => {
    controller.setRuntimeNotice(
      "Could not load sample configuration. Start the local sample server, then reload the page.",
    );
  });
window.addEventListener("resize", resizer.reposition);
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  unsubscribe();
  overlay.dispose();
  controller.dispose();
  preparation.dispose();
  window.removeEventListener("resize", resizer.reposition);
});
