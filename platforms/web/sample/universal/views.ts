import { cartLineTotalQuantity, type CartLine, type ProductVariantOption } from "../cart";
import { $, quantityButton } from "../dom";
import {
  invalidCartLines,
  selectCartReadiness,
  selectQuantity,
  selectShopCartPreview,
  type ShopState,
  type UniversalState,
} from "./state";

export interface UniversalRefs {
  layout: HTMLElement;
  settingsPanel: HTMLElement;
  runtimePanel: HTMLElement;
  resizeLeft: HTMLElement;
  resizeRight: HTMLElement;
  form: HTMLFormElement;
  domainInput: HTMLInputElement;
  addError: HTMLParagraphElement;
  settingsToggle: HTMLButtonElement;
  eventsToggle: HTMLButtonElement;
  targetInput: HTMLSelectElement;
  appearanceInput: HTMLSelectElement;
  logLevelInput: HTMLSelectElement;
  environmentInput: HTMLSelectElement;
  buyerCountryInput: HTMLSelectElement;
  shopList: HTMLDivElement;
  shopsEmpty: HTMLDivElement;
  shopCount: HTMLSpanElement;
  itemCount: HTMLSpanElement;
  cartSummary: HTMLParagraphElement;
  selectedShops: HTMLUListElement;
  readiness: HTMLParagraphElement;
  prepareButton: HTMLButtonElement;
  preparationStatus: HTMLParagraphElement;
  runtimeNotice: HTMLParagraphElement;
}

export function queryUniversalRefs(): UniversalRefs {
  return {
    layout: $<HTMLElement>("#layout"),
    settingsPanel: $<HTMLElement>(".settings-panel"),
    runtimePanel: $<HTMLElement>(".runtime-panel"),
    resizeLeft: $<HTMLElement>("#resize-left"),
    resizeRight: $<HTMLElement>("#resize-right"),
    form: $<HTMLFormElement>("#options-form"),
    domainInput: $<HTMLInputElement>("#uc-domain"),
    addError: $<HTMLParagraphElement>("#uc-add-error"),
    settingsToggle: $<HTMLButtonElement>("#toggle-settings"),
    eventsToggle: $<HTMLButtonElement>("#toggle-events"),
    targetInput: $<HTMLSelectElement>("#uc-target"),
    appearanceInput: $<HTMLSelectElement>("#uc-appearance"),
    logLevelInput: $<HTMLSelectElement>("#uc-log-level"),
    environmentInput: $<HTMLSelectElement>("#uc-environment"),
    buyerCountryInput: $<HTMLSelectElement>("#uc-buyer-country"),
    shopList: $<HTMLDivElement>("#uc-shop-list"),
    shopsEmpty: $<HTMLDivElement>("#uc-shops-empty"),
    shopCount: $<HTMLSpanElement>("#uc-shop-count"),
    itemCount: $<HTMLSpanElement>("#uc-item-count"),
    cartSummary: $<HTMLParagraphElement>("#uc-cart-summary"),
    selectedShops: $<HTMLUListElement>("#uc-selected-shops"),
    readiness: $<HTMLParagraphElement>("#uc-readiness"),
    prepareButton: $<HTMLButtonElement>("#uc-prepare"),
    preparationStatus: $<HTMLParagraphElement>("#uc-preparation-status"),
    runtimeNotice: $<HTMLParagraphElement>("#uc-runtime-notice"),
  };
}

function appendImage(container: HTMLElement, imageUrl?: string): void {
  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (url.protocol === "https:") {
        const image = document.createElement("img");
        image.src = url.toString();
        image.alt = "";
        container.append(image);
        return;
      }
    } catch {
      // A missing or invalid image uses the same placeholder as the standard sample.
    }
  }
  container.textContent = "📦";
}

function priceLabel(variant: ProductVariantOption): string {
  return variant.price ? `${variant.price} · currency unavailable` : "Price unavailable";
}

function productCard(shop: ShopState, variant: ProductVariantOption): HTMLLIElement {
  const quantity = selectQuantity(shop, variant.id);
  const item = document.createElement("li");
  item.className = "product-card";
  item.dataset["shopKey"] = shop.key;
  item.dataset["variantId"] = variant.id;

  const image = document.createElement("div");
  image.className = "product-image";
  appendImage(image, variant.imageUrl);

  const details = document.createElement("div");
  details.className = "product-info";
  const vendor = document.createElement("p");
  vendor.className = "product-vendor";
  vendor.textContent = variant.vendor || "Storefront product";
  const title = document.createElement("h4");
  title.className = "product-title";
  title.textContent = variant.title;
  const meta = document.createElement("p");
  meta.className = "product-meta";
  meta.textContent = `Variant ID: ${variant.id}`;
  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = priceLabel(variant);
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
    input.setAttribute("aria-label", `Quantity for ${variant.title} at ${shop.domain}`);
    controls.append(input, quantityButton("+", "increment", variant.title));
    actions.append(controls);
  } else {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "secondary-action";
    add.dataset["cartAction"] = "add";
    add.textContent = "Add to cart";
    actions.append(add);
  }

  details.append(vendor, title, meta, price, actions);
  item.append(image, details);
  return item;
}

function cartLine(shop: ShopState, line: CartLine): HTMLLIElement {
  const variant = shop.variants.find((entry) => entry.id === line.variantId);
  const item = document.createElement("li");
  item.className = "cart-line";
  item.dataset["shopKey"] = shop.key;
  item.dataset["variantId"] = line.variantId;

  const image = document.createElement("div");
  image.className = "cart-line-image";
  appendImage(image, variant?.imageUrl);
  const details = document.createElement("div");
  details.className = "cart-line-details";
  const title = document.createElement("strong");
  title.className = "cart-line-title";
  title.textContent = variant?.title ?? `Variant ${line.variantId}`;
  const meta = document.createElement("span");
  meta.className = "cart-line-meta";
  meta.textContent =
    !variant || !variant.available
      ? "Unavailable or no longer in the catalog"
      : priceLabel(variant);
  details.append(title, meta);

  const controls = document.createElement("div");
  controls.className = "cart-line-controls";
  if (shop.catalogStatus === "ready" && variant?.available) {
    controls.append(quantityButton("−", "decrement", title.textContent));
    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.className = "cart-line-summary-quantity";
    quantity.min = "1";
    quantity.max = "999";
    quantity.value = String(line.quantity);
    quantity.setAttribute("aria-label", `Quantity for ${title.textContent} at ${shop.domain}`);
    controls.append(quantity, quantityButton("+", "increment", title.textContent));
  } else {
    controls.textContent = `${line.quantity} selected`;
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-line-button";
  remove.dataset["cartAction"] = "remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove ${title.textContent} from ${shop.domain}`);
  item.append(image, details, controls, remove);
  return item;
}

function renderShop(shop: ShopState): HTMLElement {
  const section = document.createElement("section");
  section.className = "uc-shop";
  section.dataset["shopKey"] = shop.key;
  const headingId = `uc-shop-heading-${shop.key}`;
  section.setAttribute("aria-labelledby", headingId);

  const header = document.createElement("div");
  header.className = "uc-shop-header";
  const heading = document.createElement("h3");
  heading.id = headingId;
  heading.textContent = shop.domain;
  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent =
    shop.catalogStatus === "ready"
      ? `${shop.variants.length} variants`
      : shop.catalogStatus === "loading"
        ? "Loading"
        : "Load failed";
  const actions = document.createElement("div");
  actions.className = "uc-shop-actions";
  if (shop.catalogStatus === "error") {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.dataset["shopAction"] = "retry";
    retry.textContent = "Retry";
    retry.setAttribute("aria-label", `Retry products from ${shop.domain}`);
    actions.append(retry);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.dataset["shopAction"] = "remove";
  remove.textContent = "Remove shop";
  remove.setAttribute("aria-label", `Remove ${shop.domain}`);
  actions.append(remove);
  header.append(heading, status, actions);

  const cart = document.createElement("div");
  cart.className = "uc-shop-cart";
  const cartHeading = document.createElement("h4");
  const selectedQuantity = cartLineTotalQuantity(shop.cartLines);
  cartHeading.textContent =
    selectedQuantity === 1 ? "Cart · 1 item" : `Cart · ${selectedQuantity} items`;
  const lines = document.createElement("ol");
  lines.className = "cart-lines";
  for (const line of shop.cartLines) lines.append(cartLine(shop, line));
  const cartHint = document.createElement("p");
  cartHint.className = "muted";
  cartHint.textContent =
    invalidCartLines(shop).length > 0
      ? "Remove unavailable lines before creating a checkout URL."
      : "Add available products to this shop’s cart.";
  cartHint.hidden = shop.cartLines.length > 0 && invalidCartLines(shop).length === 0;
  const source = document.createElement("div");
  source.className = "computed-source";
  const sourceLabel = document.createElement("span");
  sourceLabel.textContent = "Individual cart preview";
  const preview = document.createElement("a");
  preview.className = "permalink-link";
  preview.target = "_blank";
  preview.rel = "noopener noreferrer";
  const previewUrl = selectShopCartPreview(shop);
  if (previewUrl) {
    preview.href = previewUrl;
    preview.textContent = "Open this shop’s cart permalink";
    preview.dataset["empty"] = "false";
  } else {
    preview.textContent = "Add available products to preview this shop’s cart";
    preview.dataset["empty"] = "true";
  }
  source.append(sourceLabel, preview);
  cart.append(cartHeading, lines, cartHint, source);

  const catalog = document.createElement("div");
  catalog.className = "uc-shop-catalog";
  if (shop.catalogStatus === "loading" || shop.catalogStatus === "error") {
    const notice = document.createElement("p");
    notice.className = "notice";
    notice.dataset["tone"] = shop.catalogStatus === "error" ? "error" : "info";
    notice.setAttribute("role", shop.catalogStatus === "error" ? "alert" : "status");
    notice.textContent =
      shop.catalogStatus === "error" ? shop.catalogError : "Loading public products…";
    catalog.append(notice);
  } else {
    const grid = document.createElement("ul");
    grid.className = "product-grid";
    for (const variant of shop.variants) grid.append(productCard(shop, variant));
    catalog.append(grid);
  }

  section.append(header, cart, catalog);
  return section;
}

export function renderShopList(
  refs: UniversalRefs,
  state: UniversalState,
  previous?: UniversalState,
): void {
  refs.shopsEmpty.hidden = state.shops.length > 0;
  const currentByKey = new Map<string, HTMLElement>();
  for (const section of refs.shopList.children) {
    if (section instanceof HTMLElement && section.dataset["shopKey"]) {
      currentByKey.set(section.dataset["shopKey"], section);
    }
  }
  const previousByKey = new Map((previous?.shops ?? []).map((shop) => [shop.key, shop] as const));
  const selectedKeys = new Set(state.shops.map((shop) => shop.key));
  for (const [key, section] of currentByKey) {
    if (!selectedKeys.has(key)) section.remove();
  }

  // Keep an unchanged shop mounted while another shop loads or changes its cart.
  const sections = state.shops.map((shop) => {
    const current = currentByKey.get(shop.key);
    if (current && previousByKey.get(shop.key) === shop) return current;
    const section = renderShop(shop);
    if (current) current.replaceWith(section);
    else refs.shopList.append(section);
    return section;
  });
  for (const [index, section] of sections.entries()) {
    const atIndex = refs.shopList.children.item(index);
    if (atIndex !== section) refs.shopList.insertBefore(section, atIndex);
  }
  while (refs.shopList.children.length > sections.length) refs.shopList.lastElementChild?.remove();
}

export function renderSummary(refs: UniversalRefs, state: UniversalState): void {
  const summary = selectCartReadiness(state);
  refs.shopCount.textContent = summary.shopCount === 1 ? "1 shop" : `${summary.shopCount} shops`;
  refs.itemCount.textContent = summary.itemCount === 1 ? "1 item" : `${summary.itemCount} items`;
  refs.cartSummary.textContent =
    summary.shopCount === 0
      ? "Add shops and choose products to build independent carts."
      : `${summary.shopCount} selected ${summary.shopCount === 1 ? "shop" : "shops"} · ${summary.itemCount} selected ${summary.itemCount === 1 ? "item" : "items"}`;
  refs.readiness.textContent = summary.hint;
  refs.readiness.dataset["tone"] = summary.ready ? "success" : "info";
  if (state.preparation.phase === "ready") {
    refs.readiness.textContent = "Universal Checkout URL ready for the selected carts.";
  }
  refs.selectedShops.replaceChildren();
  for (const shop of state.shops) {
    const item = document.createElement("li");
    const count = cartLineTotalQuantity(shop.cartLines);
    const cart = state.preparation.carts[shop.key];
    const progress =
      cart?.phase === "ready"
        ? ` · cart created (${cart.currencyCode})`
        : cart?.phase === "error"
          ? " · cart failed"
          : cart?.phase === "creating"
            ? " · creating cart…"
            : "";
    item.textContent = `${shop.domain}: ${count} ${count === 1 ? "item" : "items"}${progress}`;
    refs.selectedShops.append(item);
  }
}

export function renderPreparation(refs: UniversalRefs, state: UniversalState): void {
  const summary = selectCartReadiness(state);
  const preparation = state.preparation;
  refs.prepareButton.disabled =
    !summary.ready ||
    preparation.phase === "creatingCarts" ||
    preparation.phase === "creatingSession";
  refs.prepareButton.textContent =
    preparation.phase === "ready"
      ? "Regenerate Universal Checkout URL"
      : "Create Universal Checkout URL";

  switch (preparation.phase) {
    case "creatingCarts":
      refs.preparationStatus.textContent = "Creating a Storefront cart for each shop…";
      refs.preparationStatus.dataset["tone"] = "info";
      break;
    case "creatingSession":
      refs.preparationStatus.textContent = "Creating the Universal Checkout session…";
      refs.preparationStatus.dataset["tone"] = "info";
      break;
    case "ready":
      refs.preparationStatus.textContent =
        "Checkout URL ready. The next step can open it with Checkout Kit.";
      refs.preparationStatus.dataset["tone"] = "success";
      break;
    case "error":
      refs.preparationStatus.textContent = preparation.error;
      refs.preparationStatus.dataset["tone"] = "error";
      break;
    case "editing":
      refs.preparationStatus.textContent = summary.ready
        ? "All selected shop carts are ready for URL creation."
        : summary.hint;
      refs.preparationStatus.dataset["tone"] = "info";
      break;
  }
}

export function renderRuntime(refs: UniversalRefs, state: UniversalState): void {
  refs.runtimeNotice.textContent = state.runtime.notice;
}

export function renderSettings(refs: UniversalRefs, state: UniversalState): void {
  refs.addError.hidden = state.addShopError === "";
  refs.addError.textContent = state.addShopError;
  refs.domainInput.setAttribute("aria-invalid", String(state.addShopError !== ""));
  refs.layout.classList.toggle("settings-collapsed", state.display.settingsCollapsed);
  refs.layout.classList.toggle("events-collapsed", state.display.eventsCollapsed);
  refs.settingsToggle.setAttribute("aria-expanded", String(!state.display.settingsCollapsed));
  refs.eventsToggle.setAttribute("aria-expanded", String(!state.display.eventsCollapsed));
  refs.settingsToggle.setAttribute(
    "aria-label",
    state.display.settingsCollapsed ? "Show settings panel" : "Hide settings panel",
  );
  refs.eventsToggle.setAttribute(
    "aria-label",
    state.display.eventsCollapsed ? "Show events panel" : "Hide events panel",
  );
  refs.targetInput.value = state.display.target;
  refs.appearanceInput.value = state.display.appearance;
  refs.logLevelInput.value = state.display.logLevel;
  refs.environmentInput.value = state.environment;
  refs.buyerCountryInput.value = state.buyerCountry;
}

export function renderUniversalApp(refs: UniversalRefs, state: UniversalState): void {
  renderSettings(refs, state);
  renderShopList(refs, state);
  renderSummary(refs, state);
  renderPreparation(refs, state);
  renderRuntime(refs, state);
}

/** Received events only touch Runtime; product inputs and the Add shop draft stay mounted. */
export function renderUniversalChange(
  refs: UniversalRefs,
  state: UniversalState,
  previous: UniversalState,
): void {
  if (state.shops !== previous.shops) {
    renderShopList(refs, state, previous);
    renderSummary(refs, state);
    renderPreparation(refs, state);
  } else if (state.preparation !== previous.preparation) {
    renderSummary(refs, state);
    renderPreparation(refs, state);
  }
  if (
    state.display !== previous.display ||
    state.addShopError !== previous.addShopError ||
    state.environment !== previous.environment ||
    state.buyerCountry !== previous.buyerCountry
  ) {
    renderSettings(refs, state);
  }
  if (state.runtime !== previous.runtime) renderRuntime(refs, state);
}
