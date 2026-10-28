import type { ShopPayErrorEventEntry as ErrorEntry } from "@shopify/checkout-kit";

import { isBuyerCountry } from "./api";
import {
  fetchProductVariants,
  normalizeCartLines,
  normalizeQuantity,
  normalizeStorefrontDomain,
  upsertCartLine,
} from "../cart";
import { createColumnResizer } from "../column-resizer";
import { $, queryRefs, timestamp } from "./dom";
import { renderApp } from "./render";
import {
  describeSessionFailure,
  loadSampleConfiguration,
  requestUniversalSession,
} from "./session-client";
import {
  createInitialState,
  createStore,
  selectCanPrepare,
  selectOutcome,
  selectSessionInputKey,
  selectStoresWithLines,
  validateAddStore,
  type Notice,
  type PresentationOutcome,
  type SettingsSlice,
  type SourceMode,
  type StoreState,
} from "./state";
import {
  coerceLogLevel,
  loadPersistedSettings,
  persistSettings,
  makeStorageKeys,
  type PersistedSettings,
} from "./storage";
import { describeEvent } from "./summary";
import { createCurrencyPreviewController } from "./currency-preview";
import { renderLayout, type SamplePage } from "./page";
import { createSessionInspector, type SessionElement } from "./inspector/index";
import "../styles.css";
import "./styles.css";

declare const CHECKOUT_KIT_PACKAGE_VERSION: string;

const EVENT_TYPES = ["start", "update", "complete", "error", "blocked", "close"] as const;

function productQuantity(storeState: StoreState, variantId: string): number {
  return storeState.cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

export function startSessionSample(page: SamplePage): void {
  // The page provides an empty <main id="layout">; the shared layout fills it.
  $("#layout").innerHTML = renderLayout(page);
  const refs = queryRefs();
  refs.checkoutKitProvenance.textContent = `Local source · ${CHECKOUT_KIT_PACKAGE_VERSION}`;

  // The element sits where a storefront puts its express checkout buttons. With the
  // `button` attribute it renders its button; its overlay covers the page.
  const element = document.createElement(page.tag) as SessionElement;
  refs.shopPaySlot.prepend(element);

  // Protocol inspector: records Kit events and protocol messages.
  const inspector = createSessionInspector({
    element,
    productName: page.productName,
    hostProtocolSection: refs.protocolSection,
  });

  const storageKeys = makeStorageKeys(page.storagePrefix);
  const persisted = loadPersistedSettings(page.storagePrefix);
  hydrateSettingsForm(persisted, page);

  const store = createStore(
    createInitialState({
      ...readSettings(refs, page),
      settingsCollapsed: persisted.settingsCollapsed,
      eventsCollapsed: persisted.eventsCollapsed,
      storeDomains: persisted.storeDomains,
    }),
  );

  createCurrencyPreviewController({ store });

  const resizer = createColumnResizer({
    layout: refs.layout,
    leftPanel: refs.settingsPanel,
    rightPanel: refs.runtimePanel,
    leftHandle: refs.resizeLeft,
    rightHandle: refs.resizeRight,
    storageKeys: { left: storageKeys.columnLeft, right: storageKeys.columnRight },
  });

  store.subscribe(() => {
    renderApp(refs, store.getState(), element, page);
    resizer.reposition();
  });

  attachListeners();
  renderApp(refs, store.getState(), element, page);
  resizer.applyWidths();
  window.addEventListener("resize", resizer.reposition);

  // Restore the saved stores; the configured stores only seed an empty list.
  for (const domain of persisted.storeDomains) addStore(domain);
  void loadConfiguration();

  function sourceModeInputs(): HTMLInputElement[] {
    return [...refs.form.querySelectorAll<HTMLInputElement>("input[name='source-mode']")];
  }

  function currentSourceMode(): SourceMode {
    return sourceModeInputs().find((input) => input.checked)?.value === "manual"
      ? "manual"
      : "build";
  }

  function readSettings(
    refsArg: ReturnType<typeof queryRefs>,
    pageArg: SamplePage,
  ): Omit<SettingsSlice, "settingsCollapsed" | "eventsCollapsed" | "storeDomains"> {
    const { buyerCountryInput, buttonInput, environmentInput, targetInput, logLevelInput } =
      refsArg;
    const buyerCountry = buyerCountryInput.value;
    const button = pageArg.button ? (buttonInput?.checked ?? false) : false;
    return {
      sourceMode: currentSourceMode(),
      storefrontDomain: "",
      environment: environmentInput.value === "development" ? "development" : "production",
      buyerCountry: isBuyerCountry(buyerCountry) ? buyerCountry : "",
      button,
      target: targetInput.value,
      logLevel: coerceLogLevel(logLevelInput.value),
      manualSrc: refs.manualSrcInput.value,
    };
  }

  function hydrateSettingsForm(settings: PersistedSettings, pageArg: SamplePage): void {
    for (const input of sourceModeInputs()) input.checked = input.value === settings.sourceMode;

    refs.environmentInput.value = settings.environment;
    refs.buyerCountryInput.value = settings.buyerCountry;
    if (pageArg.button && refs.buttonInput) {
      refs.buttonInput.checked = settings.button;
    }
    if (settings.target) refs.targetInput.value = settings.target;
    refs.logLevelInput.value = settings.logLevel;
  }

  function captureSettings(): void {
    const settings = readSettings(refs, page);
    store.setState(settings);
    // Never store storefrontDomain or manualSrc (the pasted URL).
    persistSettings(page.storagePrefix, {
      sourceMode: settings.sourceMode,
      environment: settings.environment,
      buyerCountry: settings.buyerCountry,
      // Only a page that offers the button attribute has a button setting to keep.
      ...(page.button ? { button: settings.button } : {}),
      target: settings.target,
      logLevel: settings.logLevel,
    });
  }

  async function loadConfiguration(): Promise<void> {
    try {
      const configuration = await loadSampleConfiguration();
      store.setState({
        configuration: {
          status: "loaded",
          environments: configuration.environments,
          storeDomains: configuration.storeDomains,
        },
      });

      // Seed stores from configuration if the saved list is empty.
      const state = store.getState();
      if (state.stores.length === 0 && configuration.storeDomains.length > 0) {
        for (const domain of configuration.storeDomains) {
          addStore(domain);
        }
      }
    } catch {
      store.setState({ configuration: { status: "unavailable" } });
    }
  }

  /** Add a store and start loading its products. */
  function addStore(domain: string): void {
    const normalized = normalizeStorefrontDomain(domain);
    const state = store.getState();
    const validation = validateAddStore(state, domain);

    if (!validation.valid) {
      refs.addStoreError.textContent = validation.message;
      refs.addStoreError.hidden = false;
      return;
    }

    refs.addStoreError.hidden = true;
    refs.storefrontInput.value = "";

    const newStore: StoreState = {
      domain: normalized,
      variants: [],
      cartLines: [],
      loadState: "loading",
    };

    const stores = [...state.stores, newStore];
    store.setState({ stores });
    persistSettings(page.storagePrefix, { storeDomains: stores.map((s) => s.domain) });

    // Load products for the new store.
    void loadStoreProducts(normalized);
  }

  /** Remove a store and its cart lines. */
  function removeStore(domain: string): void {
    const state = store.getState();
    const stores = state.stores.filter((s) => s.domain !== domain);
    store.setState({ stores });
    persistSettings(page.storagePrefix, { storeDomains: stores.map((s) => s.domain) });
  }

  /** Load products for a specific store. */
  async function loadStoreProducts(domain: string): Promise<void> {
    const startDomain = domain;

    try {
      const variants = await fetchProductVariants(domain);
      const state = store.getState();
      const storeIndex = state.stores.findIndex((s) => s.domain === startDomain);
      const currentStore = state.stores[storeIndex];

      // Ignore if the store was removed while loading.
      if (!currentStore) return;

      const stores = [...state.stores];
      stores[storeIndex] = {
        ...currentStore,
        variants,
        loadState: "loaded",
      };

      store.setState({ stores });
    } catch (error) {
      const state = store.getState();
      const storeIndex = state.stores.findIndex((s) => s.domain === startDomain);
      const currentStore = state.stores[storeIndex];

      // Ignore if the store was removed while loading.
      if (!currentStore) return;

      const stores = [...state.stores];
      stores[storeIndex] = {
        ...currentStore,
        loadState: "failed",
        loadMessage: error instanceof Error ? error.message : "Could not load products.",
      };

      store.setState({ stores });
    }
  }

  async function prepareSession(): Promise<void> {
    const state = store.getState();
    if (!selectCanPrepare(state)) return;

    const inputKey = selectSessionInputKey(state);
    store.setState({ session: { status: "preparing", inputKey } });

    const storesWithLines = selectStoresWithLines(state);
    const outcome = await requestUniversalSession({
      environment: state.environment,
      ...(state.buyerCountry ? { countryCode: state.buyerCountry } : {}),
      stores: storesWithLines.map((s) => ({
        domain: normalizeStorefrontDomain(s.domain),
        lines: normalizeCartLines(s.cartLines),
      })),
    });

    // A newer preparation, or a changed cart, replaces this result.
    const { session } = store.getState();
    if (session.status !== "preparing" || session.inputKey !== inputKey) return;
    store.setState({
      session: outcome.ok
        ? {
            status: "ready",
            inputKey,
            continueUrl: outcome.continueUrl,
            currencyCode: outcome.currencyCode,
          }
        : {
            status: "failed",
            inputKey,
            message: describeSessionFailure(outcome, state.environment),
          },
    });
  }

  function nextOutcome(event: Event): PresentationOutcome | undefined {
    const { outcome } = store.getState();
    const src = element.src;
    switch (event.type) {
      case "start":
        return undefined;
      case "complete":
        return { src, kind: "completed" };
      case "error": {
        const detail = (event as CustomEvent<readonly ErrorEntry[]>).detail;
        // A resource error names its shop and leaves the session open; any other error ends it.
        const terminal = detail.find((entry) => entry.context?.shopId === undefined);
        if (!terminal || (outcome?.src === src && outcome.kind === "completed")) return outcome;
        return { src, kind: "ended", code: terminal.error.code };
      }
      default:
        return outcome;
    }
  }

  /** After a finished session closes, let the buyer prepare a new one from the same cart. */
  function finishedSessionNotice(outcome: PresentationOutcome): Notice {
    return outcome.kind === "completed"
      ? {
          message: `${page.productName} completed the last session. Prepare again for a new order.`,
          tone: "success",
        }
      : {
          message: `The last session ended with ${outcome.code}. Prepare again to start a new one.`,
          tone: "error",
        };
  }

  function recordEvent(event: Event): void {
    const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
    const snapshot = JSON.stringify(detail ?? null, null, 2);
    const entry = { type: event.type, time: timestamp(), summary: describeEvent(event), snapshot };
    const outcome = nextOutcome(event);
    const state = { ...store.getState(), outcome };
    const finished = event.type === "close" && state.sourceMode === "build" && selectOutcome(state);

    store.setState({
      outcome: finished ? undefined : outcome,
      ...(finished ? { session: { status: "idle", notice: finishedSessionNotice(finished) } } : {}),
      log: [entry, ...store.getState().log],
    });
  }

  function updateCartLine(domain: string, variantId: string, quantity: unknown): void {
    const state = store.getState();
    const storeIndex = state.stores.findIndex((s) => s.domain === domain);
    const currentStore = state.stores[storeIndex];
    if (!currentStore) return;

    const stores = [...state.stores];
    stores[storeIndex] = {
      ...currentStore,
      cartLines: upsertCartLine(currentStore.cartLines, variantId, quantity),
    };

    store.setState({ stores });
  }

  function handleCartAction(button: HTMLButtonElement, domain: string, variantId: string): void {
    const state = store.getState();
    const currentStoreState = state.stores.find((s) => s.domain === domain);
    if (!currentStoreState) return;

    const currentQuantity = productQuantity(currentStoreState, variantId);
    switch (button.dataset["cartAction"]) {
      case "add":
        updateCartLine(domain, variantId, 1);
        break;
      case "increment":
        updateCartLine(domain, variantId, currentQuantity + 1);
        break;
      case "decrement":
        updateCartLine(domain, variantId, currentQuantity - 1);
        break;
      case "remove":
        updateCartLine(domain, variantId, 0);
        break;
      default:
        break;
    }
  }

  function attachCartListeners(
    list: HTMLElement,
    itemSelector: string,
    quantityClass: string,
  ): void {
    list.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLButtonElement>("button[data-cart-action]");
      const item = button?.closest<HTMLElement>(itemSelector);
      const variantId = item?.dataset["variantId"];
      const domain = item?.dataset["domain"];
      if (button && variantId && domain) {
        handleCartAction(button, domain, variantId);
      }
    });

    list.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains(quantityClass))
        return;
      const item = target.closest<HTMLElement>(itemSelector);
      const variantId = item?.dataset["variantId"];
      const domain = item?.dataset["domain"];
      if (!variantId || !domain) return;
      const quantity = normalizeQuantity(target.value);
      target.value = String(quantity);
      updateCartLine(domain, variantId, quantity);
    });
  }

  function attachListeners(): void {
    refs.addStoreButton.addEventListener("click", () => {
      const domain = refs.storefrontInput.value.trim();
      if (!domain) return;
      addStore(domain);
    });

    refs.storefrontInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const domain = refs.storefrontInput.value.trim();
        if (!domain) return;
        addStore(domain);
      }
    });

    refs.storefrontInput.addEventListener("input", () => {
      // Clear error when user starts typing.
      refs.addStoreError.hidden = true;
    });

    refs.storesList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLButtonElement>("button[data-store-action='remove']");
      if (!button) return;
      const domain = button.closest<HTMLElement>(".store-item")?.dataset["domain"];
      if (domain) removeStore(domain);
    });

    refs.manualSrcInput.addEventListener("input", captureSettings);

    refs.settingsToggle.addEventListener("click", () => {
      store.setState({ settingsCollapsed: !store.getState().settingsCollapsed });
      persistSettings(page.storagePrefix, {
        settingsCollapsed: store.getState().settingsCollapsed,
      });
    });

    refs.eventsToggle.addEventListener("click", () => {
      store.setState({ eventsCollapsed: !store.getState().eventsCollapsed });
      persistSettings(page.storagePrefix, { eventsCollapsed: store.getState().eventsCollapsed });
    });

    refs.form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
    refs.form.addEventListener("input", captureSettings);
    refs.form.addEventListener("change", captureSettings);

    refs.prepareButton.addEventListener("click", () => {
      void prepareSession();
    });
    // With the `button` attribute off, the page's own button opens the checkout.
    refs.hostPayButton.addEventListener("click", () => {
      const src = element.src;
      if (src) inspector.begin(src);
      element.open();
    });

    // When the element's button is enabled, intercept clicks on it to begin
    // recording before open() runs. Use capture phase to run before the element's handler.
    if (page.button) {
      element.addEventListener(
        "click",
        (event) => {
          // Check if the click targeted the element's built-in Shop Pay button.
          const path = event.composedPath();
          const button = path.find(
            (el): el is Element =>
              el instanceof Element && el.classList.contains("shop-pay-button"),
          );
          if (button && element.src) {
            inspector.begin(element.src);
          }
        },
        { capture: true },
      );
    }

    attachCartListeners(refs.productList, ".product-card", "cart-line-quantity");
    attachCartListeners(refs.selectedLines, ".cart-line", "cart-line-summary-quantity");

    refs.clearLogButton.addEventListener("click", () => {
      store.setState({ log: [] });
      inspector.clearHistory();
    });

    for (const type of EVENT_TYPES) {
      element.addEventListener(type, recordEvent);
    }
  }
}
