export type Refs = {
  layout: HTMLElement;
  settingsPanel: HTMLElement;
  runtimePanel: HTMLElement;
  resizeLeft: HTMLElement;
  resizeRight: HTMLElement;
  form: HTMLFormElement;
  eventLog: HTMLUListElement;
  clearLogButton: HTMLButtonElement;
  settingsToggle: HTMLButtonElement;
  storefrontSourceFields: HTMLFieldSetElement;
  buildWorkspace: HTMLDivElement;
  manualWorkspace: HTMLDivElement;
  storefrontInput: HTMLInputElement;
  checkoutTarget: HTMLSelectElement;
  checkoutAppearance: HTMLSelectElement;
  debugToggle: HTMLInputElement;
  manualSrcInput: HTMLInputElement;
  manualCheckoutButton: HTMLButtonElement;
  productEmpty: HTMLDivElement;
  productList: HTMLUListElement;
  cartStatus: HTMLParagraphElement;
  cartCount: HTMLSpanElement;
  cartSummaryText: HTMLParagraphElement;
  selectedLines: HTMLOListElement;
  generatedSrcLink: HTMLAnchorElement;
  cartCheckoutButton: HTMLButtonElement;
  cartCheckoutHint: HTMLParagraphElement;
  loadState: HTMLSpanElement;
  stateCheckout: HTMLElement;
  stateError: HTMLElement;
  stateTarget: HTMLElement;
  stateAppearance: HTMLElement;
  stateDebug: HTMLElement;
};

export function $<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`[playground] element not found: ${selector}`);
  }
  return el;
}

export function queryRefs(): Refs {
  return {
    layout: $<HTMLElement>("#layout"),
    settingsPanel: $<HTMLElement>(".settings-panel"),
    runtimePanel: $<HTMLElement>(".runtime-panel"),
    resizeLeft: $<HTMLElement>("#resize-left"),
    resizeRight: $<HTMLElement>("#resize-right"),
    form: $<HTMLFormElement>("#options-form"),
    eventLog: $<HTMLUListElement>("#event-log"),
    clearLogButton: $<HTMLButtonElement>("#clear-log"),
    settingsToggle: $<HTMLButtonElement>("#toggle-settings"),
    storefrontSourceFields: $<HTMLFieldSetElement>("#storefront-source-fields"),
    buildWorkspace: $<HTMLDivElement>("#build-workspace"),
    manualWorkspace: $<HTMLDivElement>("#manual-workspace"),
    storefrontInput: $<HTMLInputElement>("#storefront-domain"),
    checkoutTarget: $<HTMLSelectElement>("#checkout-target"),
    checkoutAppearance: $<HTMLSelectElement>("#checkout-appearance"),
    debugToggle: $<HTMLInputElement>("#debug-toggle"),
    manualSrcInput: $<HTMLInputElement>("#manual-src"),
    manualCheckoutButton: $<HTMLButtonElement>("#manual-checkout"),
    productEmpty: $<HTMLDivElement>("#product-empty"),
    productList: $<HTMLUListElement>("#product-list"),
    cartStatus: $<HTMLParagraphElement>("#cart-status"),
    cartCount: $<HTMLSpanElement>("#cart-count"),
    cartSummaryText: $<HTMLParagraphElement>("#cart-summary-text"),
    selectedLines: $<HTMLOListElement>("#selected-lines"),
    generatedSrcLink: $<HTMLAnchorElement>("#generated-src"),
    cartCheckoutButton: $<HTMLButtonElement>("#cart-checkout"),
    cartCheckoutHint: $<HTMLParagraphElement>("#cart-checkout-hint"),
    loadState: $<HTMLSpanElement>("#load-state"),
    stateCheckout: $<HTMLElement>("#state-checkout"),
    stateError: $<HTMLElement>("#state-error"),
    stateTarget: $<HTMLElement>("#state-target"),
    stateAppearance: $<HTMLElement>("#state-appearance"),
    stateDebug: $<HTMLElement>("#state-debug"),
  };
}

export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function setStringAttribute(
  el: HTMLElement,
  name: string,
  value: FormDataEntryValue | string | null,
): void {
  if (typeof value === "string" && value.length > 0) {
    el.setAttribute(name, value);
  } else {
    el.removeAttribute(name);
  }
}

export function quantityButton(label: string, action: string, title: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quantity-button";
  button.dataset["cartAction"] = action;
  button.textContent = label;
  button.setAttribute("aria-label", `${label === "+" ? "Increase" : "Decrease"} ${title}`);
  return button;
}
