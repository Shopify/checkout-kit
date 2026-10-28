import { $ } from "../dom";

// Generic helpers are shared with the Checkout playground; the refs are this page's own.
export { $, formatValue, quantityButton, setStringAttribute, timestamp } from "../dom";

export type Refs = {
  layout: HTMLElement;
  settingsPanel: HTMLElement;
  runtimePanel: HTMLElement;
  resizeLeft: HTMLElement;
  resizeRight: HTMLElement;
  form: HTMLFormElement;
  settingsToggle: HTMLButtonElement;
  eventsToggle: HTMLButtonElement;
  storefrontFields: HTMLFieldSetElement;
  sessionFields: HTMLFieldSetElement;
  storefrontInput: HTMLInputElement;
  addStoreButton: HTMLButtonElement;
  addStoreError: HTMLParagraphElement;
  storesList: HTMLOListElement;
  environmentInput: HTMLSelectElement;
  buyerCountryInput: HTMLSelectElement;
  buttonInput: HTMLInputElement | null;
  targetInput: HTMLSelectElement;
  logLevelInput: HTMLSelectElement;
  workspace: HTMLDivElement;
  checkoutHeading: HTMLElement;
  checkoutSummary: HTMLParagraphElement;
  cartCount: HTMLSpanElement;
  selectedLines: HTMLOListElement;
  manualSource: HTMLDivElement;
  manualSrcInput: HTMLInputElement;
  prepareButton: HTMLButtonElement;
  shopPaySlot: HTMLDivElement;
  hostPayButton: HTMLButtonElement;
  shopPayPlaceholder: HTMLParagraphElement;
  sessionStatus: HTMLParagraphElement;
  loadState: HTMLSpanElement;
  productEmpty: HTMLDivElement;
  productList: HTMLDivElement;
  stateSrc: HTMLElement;
  stateButton: HTMLElement | null;
  stateTarget: HTMLElement;
  stateLogLevel: HTMLElement;
  eventLog: HTMLUListElement;
  protocolSection: HTMLElement;
  clearLogButton: HTMLButtonElement;
  checkoutKitProvenance: HTMLElement;
};

export function queryRefs(): Refs {
  return {
    layout: $<HTMLElement>("#layout"),
    settingsPanel: $<HTMLElement>(".settings-panel"),
    runtimePanel: $<HTMLElement>(".runtime-panel"),
    resizeLeft: $<HTMLElement>("#resize-left"),
    resizeRight: $<HTMLElement>("#resize-right"),
    form: $<HTMLFormElement>("#options-form"),
    settingsToggle: $<HTMLButtonElement>("#toggle-settings"),
    eventsToggle: $<HTMLButtonElement>("#toggle-events"),
    storefrontFields: $<HTMLFieldSetElement>("#storefront-fields"),
    sessionFields: $<HTMLFieldSetElement>("#session-fields"),
    storefrontInput: $<HTMLInputElement>("#storefront-domain"),
    addStoreButton: $<HTMLButtonElement>("#add-store-button"),
    addStoreError: $<HTMLParagraphElement>("#add-store-error"),
    storesList: $<HTMLOListElement>("#stores-list"),
    environmentInput: $<HTMLSelectElement>("#session-environment"),
    buyerCountryInput: $<HTMLSelectElement>("#buyer-country"),
    buttonInput: document.querySelector<HTMLInputElement>("#shop-pay-button"),
    targetInput: $<HTMLSelectElement>("#checkout-target"),
    logLevelInput: $<HTMLSelectElement>("#checkout-log-level"),
    workspace: $<HTMLDivElement>("#workspace"),
    checkoutHeading: $<HTMLElement>("#checkout-heading"),
    checkoutSummary: $<HTMLParagraphElement>("#checkout-summary"),
    cartCount: $<HTMLSpanElement>("#cart-count"),
    selectedLines: $<HTMLOListElement>("#selected-lines"),
    manualSource: $<HTMLDivElement>("#manual-source"),
    manualSrcInput: $<HTMLInputElement>("#manual-src"),
    prepareButton: $<HTMLButtonElement>("#prepare-session"),
    shopPaySlot: $<HTMLDivElement>("#shop-pay-slot"),
    hostPayButton: $<HTMLButtonElement>("#host-pay"),
    shopPayPlaceholder: $<HTMLParagraphElement>("#shop-pay-placeholder"),
    sessionStatus: $<HTMLParagraphElement>("#session-status"),
    loadState: $<HTMLSpanElement>("#load-state"),
    productEmpty: $<HTMLDivElement>("#product-empty"),
    productList: $<HTMLDivElement>("#product-list"),
    stateSrc: $<HTMLElement>("#state-src"),
    stateButton: document.querySelector<HTMLElement>("#state-button"),
    stateTarget: $<HTMLElement>("#state-target"),
    stateLogLevel: $<HTMLElement>("#state-log-level"),
    eventLog: $<HTMLUListElement>("#event-log"),
    protocolSection: $<HTMLElement>("#protocol-section"),
    clearLogButton: $<HTMLButtonElement>("#clear-log"),
    checkoutKitProvenance: $<HTMLElement>("#checkout-kit-provenance"),
  };
}
