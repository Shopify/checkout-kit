import { $ } from "./dom";

export type WalletsRefs = {
  layout: HTMLElement;
  settingsPanel: HTMLElement;
  runtimePanel: HTMLElement;
  resizeLeft: HTMLElement;
  resizeRight: HTMLElement;
  form: HTMLFormElement;
  settingsToggle: HTMLButtonElement;
  eventsToggle: HTMLButtonElement;
  storefrontInput: HTMLInputElement;
  accessTokenInput: HTMLInputElement;
  countryInput: HTMLInputElement;
  languageInput: HTMLInputElement;
  walletCountInput: HTMLInputElement;
  layoutSelect: HTMLSelectElement;
  cartSourceFields: HTMLFieldSetElement;
  buynowSourceFields: HTMLFieldSetElement;
  cartIdInput: HTMLInputElement;
  variantIdInput: HTMLInputElement;
  sellingPlanIdInput: HTMLInputElement;

  // Cart banner (visible in cart mode only)
  cartBanner: HTMLElement;
  createCartButton: HTMLButtonElement;
  cartCount: HTMLElement;
  selectedLines: HTMLElement;
  cartSummaryText: HTMLElement;
  generatedSrcLink: HTMLAnchorElement;

  // Product grid (always visible)
  buildWorkspace: HTMLElement;
  loadState: HTMLElement;
  cartStatus: HTMLElement;
  productList: HTMLUListElement;
  productEmpty: HTMLElement;

  // Element mount (always visible)
  elementWrapper: HTMLDivElement;
  elementAttrs: HTMLPreElement;

  // Runtime panel
  stateStoreDomain: HTMLElement;
  stateCountry: HTMLElement;
  stateLanguage: HTMLElement;
  stateCartId: HTMLElement;
  stateVariantId: HTMLElement;
  stateSellingPlanId: HTMLElement;
  stateWalletCount: HTMLElement;
  stateLayout: HTMLElement;
  eventLog: HTMLUListElement;
  clearLogButton: HTMLButtonElement;
};

export function queryWalletsRefs(): WalletsRefs {
  return {
    layout: $<HTMLElement>("#layout"),
    settingsPanel: $<HTMLElement>(".settings-panel"),
    runtimePanel: $<HTMLElement>(".runtime-panel"),
    resizeLeft: $<HTMLElement>("#resize-left"),
    resizeRight: $<HTMLElement>("#resize-right"),
    form: $<HTMLFormElement>("#wallets-form"),
    settingsToggle: $<HTMLButtonElement>("#toggle-settings"),
    eventsToggle: $<HTMLButtonElement>("#toggle-events"),
    storefrontInput: $<HTMLInputElement>("#wallets-storefront-domain"),
    accessTokenInput: $<HTMLInputElement>("#wallets-access-token"),
    countryInput: $<HTMLInputElement>("#wallets-country"),
    languageInput: $<HTMLInputElement>("#wallets-language"),
    walletCountInput: $<HTMLInputElement>("#wallets-wallet-count"),
    layoutSelect: $<HTMLSelectElement>("#wallets-layout"),
    cartSourceFields: $<HTMLFieldSetElement>("#wallets-cart-source"),
    buynowSourceFields: $<HTMLFieldSetElement>("#wallets-buynow-source"),
    cartIdInput: $<HTMLInputElement>("#wallets-cart-id"),
    variantIdInput: $<HTMLInputElement>("#wallets-variant-id"),
    sellingPlanIdInput: $<HTMLInputElement>("#wallets-selling-plan-id"),

    cartBanner: $<HTMLElement>("#wallets-cart-banner"),
    createCartButton: $<HTMLButtonElement>("#wallets-create-cart"),
    cartCount: $<HTMLElement>("#wallets-cart-count"),
    selectedLines: $<HTMLElement>("#wallets-selected-lines"),
    cartSummaryText: $<HTMLElement>("#wallets-cart-summary-text"),
    generatedSrcLink: $<HTMLAnchorElement>("#wallets-generated-src"),

    buildWorkspace: $<HTMLElement>("#wallets-build-workspace"),
    loadState: $<HTMLElement>("#wallets-load-state"),
    cartStatus: $<HTMLElement>("#wallets-cart-status"),
    productList: $<HTMLUListElement>("#wallets-product-list"),
    productEmpty: $<HTMLElement>("#wallets-product-empty"),

    elementWrapper: $<HTMLDivElement>("#wallets-element-wrapper"),
    elementAttrs: $<HTMLPreElement>("#wallets-element-attrs"),

    stateStoreDomain: $<HTMLElement>("#wallets-state-store-domain"),
    stateCountry: $<HTMLElement>("#wallets-state-country"),
    stateLanguage: $<HTMLElement>("#wallets-state-language"),
    stateCartId: $<HTMLElement>("#wallets-state-cart-id"),
    stateVariantId: $<HTMLElement>("#wallets-state-variant-id"),
    stateSellingPlanId: $<HTMLElement>("#wallets-state-selling-plan-id"),
    stateWalletCount: $<HTMLElement>("#wallets-state-wallet-count"),
    stateLayout: $<HTMLElement>("#wallets-state-layout"),
    eventLog: $<HTMLUListElement>("#event-log"),
    clearLogButton: $<HTMLButtonElement>("#clear-log"),
  };
}
