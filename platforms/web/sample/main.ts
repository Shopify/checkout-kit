import "@shopify/checkout-kit";
import type { ShopifyCheckout } from "@shopify/checkout-kit";

import {
  buildCartPermalink,
  cartLineTotalQuantity,
  fetchProductVariants,
  isLikelyStorefrontDomain,
  normalizeQuantity,
  normalizeStorefrontDomain,
  upsertCartLine,
  type CartLine,
  type ProductVariantOption,
} from "./cart";
import "./styles.css";

type SourceMode = "build" | "manual";
type NoticeTone = "info" | "success" | "error";

const PRODUCT_LOAD_DEBOUNCE_MS = 300;
const STORAGE_KEYS = {
  sourceMode: "checkout-kit:web-demo:source-mode",
  storefrontDomain: "checkout-kit:web-demo:storefront-domain",
  target: "checkout-kit:web-demo:target",
  debug: "checkout-kit:web-demo:debug",
  settingsCollapsed: "checkout-kit:web-demo:settings-collapsed",
};

function $<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`[playground] element not found: ${selector}`);
  }
  return el;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
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

function sourceMode(): SourceMode {
  const checked = form.querySelector<HTMLInputElement>("input[name='source-mode']:checked");
  return checked?.value === "manual" ? "manual" : "build";
}

function activeSourceUrl(): string {
  return sourceMode() === "manual" ? manualSrcInput.value.trim() : generatedCartUrl;
}

function setStringAttribute(
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

function selectedCartLines(): CartLine[] {
  return cartLines;
}

function variantForLine(line: CartLine): ProductVariantOption | undefined {
  return variants.find((variant) => variant.id === line.variantId);
}

function showCartStatus(message: string, tone: NoticeTone = "info"): void {
  cartStatus.hidden = tone === "success";
  cartStatus.textContent = message;
  cartStatus.dataset["tone"] = tone;
}

function setSettingsCollapsed(collapsed: boolean): void {
  layout.classList.toggle("settings-collapsed", collapsed);
  settingsToggle.setAttribute("aria-expanded", String(!collapsed));
  settingsToggle.textContent = collapsed ? "Show" : "Hide";
  writeStorage(STORAGE_KEYS.settingsCollapsed, collapsed ? "1" : "");
}

function syncAttributes(): void {
  const data = new FormData(form);
  const target = String(data.get("target") ?? "popup");

  setStringAttribute(checkout, "src", activeSourceUrl());
  setStringAttribute(checkout, "target", target);

  if (data.has("debug")) {
    checkout.setAttribute("debug", "");
  } else {
    checkout.removeAttribute("debug");
  }

  writeStorage(STORAGE_KEYS.sourceMode, sourceMode());
  writeStorage(STORAGE_KEYS.target, target);
  writeStorage(STORAGE_KEYS.debug, data.has("debug") ? "1" : "");

  updateSourceVisibility();
  refreshCheckoutButtons();
  refreshState();
}

function updateSourceVisibility(): void {
  const isManual = sourceMode() === "manual";
  storefrontSourceFields.hidden = isManual;
  buildWorkspace.hidden = isManual;
  manualWorkspace.hidden = !isManual;
  updateStorefrontValidation();
}

function updateStorefrontValidation(): void {
  const isInvalid =
    sourceMode() === "build" && normalizeStorefrontDomain(storefrontInput.value) === "";
  storefrontSourceFields.dataset["invalid"] = String(isInvalid);
  storefrontInput.setAttribute("aria-invalid", String(isInvalid));
}

function refreshCheckoutButtons(): void {
  const hasSrc = activeSourceUrl().length > 0;
  cartCheckoutButton.disabled = sourceMode() !== "build" || !hasSrc;
  manualCheckoutButton.disabled = sourceMode() !== "manual" || !hasSrc;
  cartCheckoutHint.hidden = cartCheckoutButton.disabled === false;
  manualCheckoutHint.hidden = manualCheckoutButton.disabled === false;
}

function clearGeneratedCart(): void {
  generatedCartUrl = "";
  generatedSrcLink.removeAttribute("href");
  generatedSrcLink.textContent = "Add products to derive a cart permalink";
  generatedSrcLink.dataset["empty"] = "true";
}

function updateDerivedCartPermalink(): void {
  const lines = selectedCartLines();
  if (lines.length === 0) {
    clearGeneratedCart();
    syncAttributes();
    return;
  }

  try {
    generatedCartUrl = buildCartPermalink(storefrontInput.value, lines);
    generatedSrcLink.href = generatedCartUrl;
    generatedSrcLink.textContent = generatedCartUrl;
    generatedSrcLink.dataset["empty"] = "false";
  } catch {
    clearGeneratedCart();
  }

  syncAttributes();
}

function resetCart(): void {
  cartLines = [];
  clearGeneratedCart();
}

function resetLoadedProducts(): void {
  resetCart();
  variants = [];
  renderProducts();
  refreshBuildState();
}

function cancelScheduledProductLoad(): void {
  if (productLoadTimer !== undefined) {
    window.clearTimeout(productLoadTimer);
    productLoadTimer = undefined;
  }
  productLoadRequestId += 1;
}

function scheduleProductLoad(): void {
  cancelScheduledProductLoad();
  resetLoadedProducts();

  const domain = normalizeStorefrontDomain(storefrontInput.value);
  writeStorage(STORAGE_KEYS.storefrontDomain, domain);

  updateStorefrontValidation();

  if (!domain) {
    loadState.textContent = "Waiting for domain";
    showCartStatus("Enter a storefront domain to load products automatically.");
    return;
  }

  if (!isLikelyStorefrontDomain(domain)) {
    loadState.textContent = "Waiting for domain";
    showCartStatus("Keep typing a full storefront domain, for example your-store.myshopify.com.");
    return;
  }

  const requestId = productLoadRequestId;
  loadState.textContent = "Loading soon";
  showCartStatus(`Waiting to load products from https://${domain}/products.json...`);
  productLoadTimer = window.setTimeout(() => {
    void loadProducts(domain, requestId);
  }, PRODUCT_LOAD_DEBOUNCE_MS);
}

function productQuantity(variantId: string): number {
  return cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

function renderProducts(): void {
  productList.replaceChildren();
  productEmpty.style.display = variants.length > 0 ? "none" : "";

  for (const variant of variants) {
    const quantity = productQuantity(variant.id);
    const item = document.createElement("li");
    item.className = "product-card";
    item.dataset["variantId"] = variant.id;

    const image = document.createElement("div");
    image.className = "product-image";
    if (variant.imageUrl) {
      const img = document.createElement("img");
      img.src = variant.imageUrl;
      img.alt = "";
      image.append(img);
    } else {
      image.textContent = "📦";
    }

    const details = document.createElement("div");
    details.className = "product-info";

    const vendor = document.createElement("p");
    vendor.className = "product-vendor";
    vendor.textContent = variant.vendor || "Storefront product";
    details.append(vendor);

    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = variant.title;
    details.append(title);

    const meta = document.createElement("p");
    meta.className = "product-meta";
    meta.textContent = `Variant ID: ${variant.id}`;
    details.append(meta);

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = variant.price ? `$${variant.price}` : "—";
    details.append(price);

    const actions = document.createElement("div");
    actions.className = "product-card-actions";

    if (!variant.available) {
      const unavailable = document.createElement("span");
      unavailable.className = "unavailable";
      unavailable.textContent = "Unavailable";
      actions.append(unavailable);
    } else if (quantity > 0) {
      const controls = document.createElement("div");
      controls.className = "quantity-controls";
      controls.append(quantityButton("−", "decrement", variant.title));

      const input = document.createElement("input");
      input.type = "number";
      input.className = "cart-line-quantity";
      input.min = "1";
      input.max = "999";
      input.value = String(quantity);
      input.setAttribute("aria-label", `Quantity for ${variant.title}`);
      controls.append(input);

      controls.append(quantityButton("+", "increment", variant.title));
      actions.append(controls);
    } else {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "secondary-action";
      addButton.dataset["cartAction"] = "add";
      addButton.textContent = "Add to cart";
      actions.append(addButton);
    }

    details.append(actions);
    item.append(image, details);
    productList.append(item);
  }
}

function quantityButton(label: string, action: string, title: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quantity-button";
  button.dataset["cartAction"] = action;
  button.textContent = label;
  button.setAttribute("aria-label", `${label === "+" ? "Increase" : "Decrease"} ${title}`);
  return button;
}

function renderCartSummary(): void {
  const lines = selectedCartLines();
  const totalQuantity = cartLineTotalQuantity(lines);

  cartCount.textContent = totalQuantity === 1 ? "1 item" : `${totalQuantity} items`;
  selectedLines.replaceChildren();

  if (lines.length === 0) {
    cartSummaryText.textContent = "Add products to start a multi-item cart.";
    return;
  }

  cartSummaryText.textContent = `${lines.length} ${lines.length === 1 ? "variant" : "variants"}, ${totalQuantity} total`;

  for (const line of lines) {
    const variant = variantForLine(line);
    const item = document.createElement("li");
    item.className = "cart-line";
    item.dataset["variantId"] = line.variantId;

    const image = document.createElement("div");
    image.className = "cart-line-image";
    if (variant?.imageUrl) {
      const img = document.createElement("img");
      img.src = variant.imageUrl;
      img.alt = "";
      image.append(img);
    } else {
      image.textContent = "📦";
    }
    item.append(image);

    const details = document.createElement("div");
    details.className = "cart-line-details";

    const name = document.createElement("strong");
    name.className = "cart-line-title";
    name.textContent = variant?.title ?? line.variantId;
    details.append(name);

    const meta = document.createElement("span");
    meta.className = "cart-line-meta";
    meta.textContent = variant?.price ? `$${variant.price}` : `Variant ID: ${line.variantId}`;
    details.append(meta);
    item.append(details);

    const controls = document.createElement("div");
    controls.className = "cart-line-controls";
    controls.append(quantityButton("−", "decrement", variant?.title ?? line.variantId));

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.className = "cart-line-summary-quantity";
    quantityInput.min = "1";
    quantityInput.max = "999";
    quantityInput.value = String(line.quantity);
    quantityInput.setAttribute("aria-label", `Quantity for ${variant?.title ?? line.variantId}`);
    controls.append(quantityInput);

    controls.append(quantityButton("+", "increment", variant?.title ?? line.variantId));
    item.append(controls);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-line-button";
    removeButton.dataset["cartAction"] = "remove";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove ${variant?.title ?? line.variantId}`);
    item.append(removeButton);

    selectedLines.append(item);
  }
}

function refreshBuildState(): void {
  renderCartSummary();
  updateDerivedCartPermalink();
}

async function loadProducts(domain: string, requestId: number): Promise<void> {
  if (requestId !== productLoadRequestId) return;

  storefrontInput.value = domain;
  productLoadTimer = undefined;
  loadState.textContent = "Loading";
  showCartStatus(`Loading products from https://${domain}/products.json...`);

  try {
    const loadedVariants = await fetchProductVariants(domain);
    if (requestId !== productLoadRequestId) return;

    variants = loadedVariants;
    loadState.textContent = `${variants.length} loaded`;
    showCartStatus("Products loaded.", "success");
  } catch (error) {
    if (requestId !== productLoadRequestId) return;

    loadState.textContent = "Load failed";
    const message = error instanceof Error ? error.message : "Products could not be loaded.";
    showCartStatus(message, "error");
  } finally {
    if (requestId === productLoadRequestId) {
      renderProducts();
      refreshBuildState();
    }
  }
}

function updateCartLine(variantId: string, quantity: unknown): void {
  cartLines = upsertCartLine(cartLines, variantId, quantity);
  renderProducts();
  refreshBuildState();
}

function openCheckout(): void {
  checkout.open();
}

function restoreSettings(): void {
  const storedMode = readStorage(STORAGE_KEYS.sourceMode);
  const mode = storedMode === "manual" ? "manual" : "build";
  const modeInput = form.querySelector<HTMLInputElement>(
    `input[name='source-mode'][value='${mode}']`,
  );
  if (modeInput) modeInput.checked = true;

  storefrontInput.value = readStorage(STORAGE_KEYS.storefrontDomain);

  const storedTarget = readStorage(STORAGE_KEYS.target);
  if (storedTarget) checkoutTarget.value = storedTarget;

  debugToggle.checked = readStorage(STORAGE_KEYS.debug) === "1";
  setSettingsCollapsed(readStorage(STORAGE_KEYS.settingsCollapsed) === "1");
}

const layout = $<HTMLElement>("#layout");
const form = $<HTMLFormElement>("#options-form");
const eventLog = $<HTMLUListElement>("#event-log");
const clearLogButton = $<HTMLButtonElement>("#clear-log");
const settingsToggle = $<HTMLButtonElement>("#toggle-settings");
const storefrontSourceFields = $<HTMLFieldSetElement>("#storefront-source-fields");
const buildWorkspace = $<HTMLDivElement>("#build-workspace");
const manualWorkspace = $<HTMLDivElement>("#manual-workspace");
const storefrontInput = $<HTMLInputElement>("#storefront-domain");
const checkoutTarget = $<HTMLSelectElement>("#checkout-target");
const debugToggle = $<HTMLInputElement>("#debug-toggle");
const manualSrcInput = $<HTMLInputElement>("#manual-src");
const manualCheckoutButton = $<HTMLButtonElement>("#manual-checkout");
const manualCheckoutHint = $<HTMLParagraphElement>("#manual-checkout-hint");
const productEmpty = $<HTMLDivElement>("#product-empty");
const productList = $<HTMLUListElement>("#product-list");
const cartStatus = $<HTMLParagraphElement>("#cart-status");
const cartCount = $<HTMLSpanElement>("#cart-count");
const cartSummaryText = $<HTMLParagraphElement>("#cart-summary-text");
const selectedLines = $<HTMLOListElement>("#selected-lines");
const generatedSrcLink = $<HTMLAnchorElement>("#generated-src");
const cartCheckoutButton = $<HTMLButtonElement>("#cart-checkout");
const cartCheckoutHint = $<HTMLParagraphElement>("#cart-checkout-hint");
const loadState = $<HTMLSpanElement>("#load-state");

const stateNodes = {
  checkout: $<HTMLElement>("#state-checkout"),
  error: $<HTMLElement>("#state-error"),
  target: $<HTMLElement>("#state-target"),
  debug: $<HTMLElement>("#state-debug"),
};

const checkout = document.createElement("shopify-checkout") as ShopifyCheckout;
document.body.append(checkout);

const checkoutEl: HTMLElement = checkout;
let variants: ProductVariantOption[] = [];
let cartLines: CartLine[] = [];
let generatedCartUrl = "";
let productLoadTimer: number | undefined;
let productLoadRequestId = 0;

restoreSettings();

storefrontInput.addEventListener("input", scheduleProductLoad);

settingsToggle.addEventListener("click", () => {
  setSettingsCollapsed(!layout.classList.contains("settings-collapsed"));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

form.addEventListener("input", syncAttributes);
form.addEventListener("change", (event) => {
  syncAttributes();

  const target = event.target;
  if (target instanceof HTMLInputElement && target.name === "source-mode") {
    if (sourceMode() === "manual") {
      cancelScheduledProductLoad();
      return;
    }

    if (variants.length === 0 && normalizeStorefrontDomain(storefrontInput.value)) {
      scheduleProductLoad();
    }
  }
});

cartCheckoutButton.addEventListener("click", openCheckout);
manualCheckoutButton.addEventListener("click", openCheckout);

productList.addEventListener("click", (event) => {
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

productList.addEventListener("change", (event) => {
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

selectedLines.addEventListener("click", (event) => {
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

selectedLines.addEventListener("change", (event) => {
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

const EVENT_TYPES = [
  "ec.start",
  "ec.complete",
  "ec.close",
  "ec.error",
  "ec.line_items.change",
  "ec.totals.change",
  "ec.messages.change",
] as const;

for (const type of EVENT_TYPES) {
  checkoutEl.addEventListener(type, () => {
    appendLog(type);
    refreshState();
  });
}

clearLogButton.addEventListener("click", () => {
  eventLog.replaceChildren();
});

function snapshotState(): Record<string, unknown> {
  return {
    checkout: checkout.checkout,
    error: checkout.error,
    target: checkout.target,
    debug: checkout.debug,
  };
}

function refreshState(): void {
  stateNodes.checkout.textContent = formatValue(checkout.checkout);
  stateNodes.error.textContent = formatValue(checkout.error);
  stateNodes.target.textContent = formatValue(checkout.target);
  stateNodes.debug.textContent = formatValue(checkout.debug);
}

function appendLog(type: string): void {
  const li = document.createElement("li");
  li.className = "event-entry";

  const header = document.createElement("header");
  header.className = "event-entry-header";

  const name = document.createElement("span");
  name.className = "event-entry-name";
  name.textContent = type;
  header.append(name);

  const time = document.createElement("time");
  time.className = "event-entry-time";
  time.textContent = timestamp();
  header.append(time);

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(snapshotState(), null, 2);

  li.append(header, pre);
  eventLog.prepend(li);
}

renderProducts();
refreshBuildState();
syncAttributes();
if (sourceMode() === "build" && storefrontInput.value) {
  scheduleProductLoad();
}
