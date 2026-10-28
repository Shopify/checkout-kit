import { quantityButton, type Refs } from "../dom";
import { selectStoreCurrency, type AppState, type StoreState } from "../state";

function productQuantity(store: StoreState, variantId: string): number {
  return store.cartLines.find((line) => line.variantId === variantId)?.quantity ?? 0;
}

export function renderProducts(refs: Refs, state: AppState): void {
  refs.workspace.dataset["ready"] = String(
    state.sourceMode === "manual" || state.stores.length > 0,
  );

  refs.productList.replaceChildren();
  const productCount = state.stores.reduce((total, store) => total + store.variants.length, 0);
  refs.loadState.textContent = state.stores.length
    ? `${state.stores.length} ${state.stores.length === 1 ? "store" : "stores"} · ${productCount} ${productCount === 1 ? "product" : "products"}`
    : "No stores";

  refs.productEmpty.hidden = state.stores.length > 0;
  if (state.stores.length === 0) return;

  // Render products grouped by store.
  for (const store of state.stores) {
    const storeSection = document.createElement("section");
    storeSection.className = "store-products-section";
    storeSection.dataset["domain"] = store.domain;

    const heading = document.createElement("h3");
    heading.className = "store-products-heading";

    const domainText = document.createElement("span");
    domainText.textContent = store.domain;
    heading.append(domainText);

    // Show currency preview if available.
    const preview = selectStoreCurrency(state, store.domain);
    if (preview) {
      const currencySpan = document.createElement("span");
      currencySpan.className = "store-currency";
      if (preview.phase === "loading") {
        currencySpan.textContent = "Checking currency…";
      } else if (preview.phase === "ready" && preview.currencyCode) {
        currencySpan.textContent = preview.currencyCode;
      }
      heading.append(currencySpan);
    }

    storeSection.append(heading);

    if (store.loadState === "loading") {
      const loading = document.createElement("p");
      loading.className = "store-loading";
      loading.textContent = "Loading products…";
      storeSection.append(loading);
    } else if (store.loadState === "failed") {
      const error = document.createElement("p");
      error.className = "store-error";
      error.textContent = store.loadMessage || "Could not load products.";
      storeSection.append(error);
    } else if (store.variants.length === 0) {
      const empty = document.createElement("p");
      empty.className = "store-empty";
      empty.textContent = "No products available.";
      storeSection.append(empty);
    } else {
      const grid = document.createElement("ul");
      grid.className = "product-grid";

      for (const variant of store.variants) {
        const quantity = productQuantity(store, variant.id);
        const item = document.createElement("li");
        item.className = "product-card";
        item.dataset["variantId"] = variant.id;
        item.dataset["domain"] = store.domain;

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
        grid.append(item);
      }

      storeSection.append(grid);
    }

    refs.productList.append(storeSection);
  }
}
