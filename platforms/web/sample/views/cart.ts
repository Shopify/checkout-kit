import { cartLineTotalQuantity, type CartLine, type ProductVariantOption } from "../cart";
import { quantityButton, type Refs } from "../dom";
import { selectGeneratedCartUrl, type AppState } from "../state";

function variantForLine(state: AppState, line: CartLine): ProductVariantOption | undefined {
  return state.variants.find((variant) => variant.id === line.variantId);
}

function renderGeneratedPermalink(refs: Refs, state: AppState): void {
  const url = selectGeneratedCartUrl(state);
  if (url) {
    refs.generatedSrcLink.href = url;
    refs.generatedSrcLink.textContent = url;
    refs.generatedSrcLink.dataset["empty"] = "false";
  } else {
    refs.generatedSrcLink.removeAttribute("href");
    refs.generatedSrcLink.textContent = "Add products to derive a cart permalink";
    refs.generatedSrcLink.dataset["empty"] = "true";
  }
}

export function renderCart(refs: Refs, state: AppState): void {
  const lines = state.cartLines;
  const totalQuantity = cartLineTotalQuantity(lines);

  refs.cartCount.textContent = totalQuantity === 1 ? "1 item" : `${totalQuantity} items`;
  refs.selectedLines.replaceChildren();

  if (lines.length === 0) {
    refs.cartSummaryText.textContent = "Add products to start a multi-item cart.";
    renderGeneratedPermalink(refs, state);
    return;
  }

  refs.cartSummaryText.textContent = `${lines.length} ${lines.length === 1 ? "variant" : "variants"}, ${totalQuantity} total`;

  for (const line of lines) {
    const variant = variantForLine(state, line);
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

    refs.selectedLines.append(item);
  }

  renderGeneratedPermalink(refs, state);
}
