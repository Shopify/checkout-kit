import { cartLineTotalQuantity, type CartLine, type ProductVariantOption } from "../../cart";
import { quantityButton, type Refs } from "../dom";
import type { SamplePage } from "../page";
import type { AppState, StoreState } from "../state";
import { selectCurrencyStatus, selectStoreCurrency, selectTotalCartLines } from "../state";

function variantForLine(store: StoreState, line: CartLine): ProductVariantOption | undefined {
  return store.variants.find((variant) => variant.id === line.variantId);
}

function renderLine(store: StoreState, line: CartLine): HTMLLIElement {
  const variant = variantForLine(store, line);
  const title = variant?.title ?? line.variantId;
  const item = document.createElement("li");
  item.className = "cart-line";
  item.dataset["variantId"] = line.variantId;
  item.dataset["domain"] = store.domain;

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
  name.textContent = title;
  details.append(name);

  const meta = document.createElement("span");
  meta.className = "cart-line-meta";
  meta.textContent = variant?.price ? `$${variant.price}` : `Variant ID: ${line.variantId}`;
  details.append(meta);
  item.append(details);

  const controls = document.createElement("div");
  controls.className = "cart-line-controls";
  controls.append(quantityButton("−", "decrement", title));

  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.className = "cart-line-summary-quantity";
  quantityInput.min = "1";
  quantityInput.max = "999";
  quantityInput.value = String(line.quantity);
  quantityInput.setAttribute("aria-label", `Quantity for ${title}`);
  controls.append(quantityInput);

  controls.append(quantityButton("+", "increment", title));
  item.append(controls);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-line-button";
  removeButton.dataset["cartAction"] = "remove";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", `Remove ${title}`);
  item.append(removeButton);

  return item;
}

/** The checkout card: the cart when building one, or the pasted session's URL. */
export function renderCart(refs: Refs, state: AppState, _page: SamplePage): void {
  const isManual = state.sourceMode === "manual";
  refs.manualSource.hidden = !isManual;
  refs.selectedLines.replaceChildren();

  if (isManual) {
    refs.checkoutHeading.textContent = "Existing session";
    refs.checkoutSummary.textContent = "Open a Universal session that your server already created.";
    refs.cartCount.hidden = true;
    return;
  }

  refs.cartCount.hidden = false;

  // Group cart lines by store and render.
  const storesWithLines = state.stores.filter((store) => store.cartLines.length > 0);
  const totalLines = selectTotalCartLines(state);
  const totalQuantity = state.stores.reduce(
    (sum, store) => sum + cartLineTotalQuantity(store.cartLines),
    0,
  );

  refs.checkoutHeading.textContent = "Cart";
  refs.cartCount.textContent = totalQuantity === 1 ? "1 item" : `${totalQuantity} items`;

  if (storesWithLines.length === 0) {
    refs.checkoutSummary.textContent = "Add products to start a cart.";
    return;
  }

  // Show currency status if available.
  const currencyStatus = selectCurrencyStatus(state);
  if (currencyStatus) {
    refs.checkoutSummary.textContent = currencyStatus.message;
    refs.checkoutSummary.dataset["tone"] = currencyStatus.tone;
  } else {
    refs.checkoutSummary.textContent = `${totalLines} ${totalLines === 1 ? "variant" : "variants"}, ${totalQuantity} total`;
    delete refs.checkoutSummary.dataset["tone"];
  }

  for (const store of storesWithLines) {
    const storeGroup = document.createElement("li");
    storeGroup.className = "cart-store-group";
    storeGroup.dataset["domain"] = store.domain;

    const heading = document.createElement("h3");
    heading.className = "cart-store-heading";
    const domainText = document.createElement("span");
    domainText.textContent = store.domain;
    heading.append(domainText);

    // Show currency in cart heading.
    const preview = selectStoreCurrency(state, store.domain);
    if (preview?.phase === "ready" && preview.currencyCode) {
      const currencySpan = document.createElement("span");
      currencySpan.className = "cart-store-currency";
      currencySpan.textContent = preview.currencyCode;
      heading.append(currencySpan);
    }

    storeGroup.append(heading);

    const linesList = document.createElement("ul");
    linesList.className = "cart-store-lines";

    for (const line of store.cartLines) {
      linesList.append(renderLine(store, line));
    }

    storeGroup.append(linesList);
    refs.selectedLines.append(storeGroup);
  }
}
