import { isLikelyStorefrontDomain, normalizeStorefrontDomain } from "../cart";
import { quantityButton, type Refs } from "../dom";
import type { AppState } from "../state";

function productQuantity(state: AppState, variantId: string): number {
  return state.cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

export function renderProducts(refs: Refs, state: AppState): void {
  refs.loadState.textContent = state.loadState;

  refs.cartStatus.hidden = state.cartStatus.tone === "success";
  refs.cartStatus.textContent = state.cartStatus.message;
  refs.cartStatus.dataset["tone"] = state.cartStatus.tone;

  const domain = normalizeStorefrontDomain(state.storefrontDomain);
  refs.buildWorkspace.dataset["ready"] = String(
    state.variants.length > 0 || isLikelyStorefrontDomain(domain),
  );

  refs.productList.replaceChildren();
  refs.productEmpty.style.display = state.variants.length > 0 ? "none" : "";

  for (const variant of state.variants) {
    const quantity = productQuantity(state, variant.id);
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
    refs.productList.append(item);
  }
}
