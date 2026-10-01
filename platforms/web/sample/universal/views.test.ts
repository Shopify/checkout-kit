import { beforeEach, describe, expect, it } from "vitest";

import page from "../universal.html?raw";
import type { ProductVariantOption } from "../cart";
import { UniversalController } from "./controller";
import { createInitialState, createUniversalStore, type ShopState } from "./state";
import { queryUniversalRefs, renderUniversalApp, renderUniversalChange } from "./views";

function fixture(): void {
  const start = page.indexOf('<main id="layout">');
  const end = page.indexOf("</main>", start);
  document.body.innerHTML = page.slice(start, end + "</main>".length);
}

function variant(id: string, available = true): ProductVariantOption {
  return {
    id,
    title: `Product ${id}`,
    productTitle: `Product ${id}`,
    variantTitle: "Default Title",
    vendor: "Synthetic shop",
    price: "10.00",
    available,
  };
}

function shop(): ShopState {
  return {
    key: "shop-1",
    domain: "shop-one.example.com",
    catalogStatus: "ready",
    catalogError: "",
    variants: [variant("123"), variant("456", false)],
    cartLines: [{ variantId: "123", quantity: 2 }],
    cartRevision: 1,
  };
}

beforeEach(fixture);

describe("Universal sample views", () => {
  it("clears the domain error when the controller is used as an input listener", () => {
    const refs = queryUniversalRefs();
    const store = createUniversalStore(createInitialState());
    const controller = new UniversalController({ store });
    refs.domainInput.addEventListener("input", controller.clearAddError);

    expect(controller.addShop("not a domain")).toBe(false);
    expect(store.getState().addShopError).not.toBe("");
    refs.domainInput.dispatchEvent(new Event("input"));
    expect(store.getState().addShopError).toBe("");

    refs.domainInput.removeEventListener("input", controller.clearAddError);
    controller.dispose();
  });

  it("renders independent shop cards, cart controls, and neutral price text", () => {
    const refs = queryUniversalRefs();
    renderUniversalApp(refs, { ...createInitialState(), shops: [shop()] });

    expect(refs.shopList.querySelectorAll(".product-card")).toHaveLength(2);
    expect(refs.shopList.querySelectorAll(".cart-line")).toHaveLength(1);
    expect(refs.shopList.querySelector(".product-card")?.getAttribute("data-shop-key")).toBe(
      "shop-1",
    );
    expect(refs.shopList.querySelector(".cart-line")?.getAttribute("data-variant-id")).toBe("123");
    expect(refs.itemCount.textContent).toBe("2 items");
    expect(refs.shopCount.textContent).toBe("1 shop");
    expect(refs.shopList.querySelector(".product-price")?.textContent).toBe(
      "10.00 · currency unavailable",
    );
    expect(
      refs.shopList.querySelector('[data-variant-id="456"] [data-cart-action="add"]'),
    ).toBeNull();
    expect(refs.shopList.querySelector(".permalink-link")?.getAttribute("href")).toBe(
      "https://shop-one.example.com/cart/123:2",
    );
  });

  it("updates runtime without rebuilding product controls or losing the shop draft focus", () => {
    const refs = queryUniversalRefs();
    const store = createUniversalStore({ ...createInitialState(), shops: [shop()] });
    const controller = new UniversalController({ store });
    renderUniversalApp(refs, store.getState());
    const unsubscribe = store.subscribe((state, previous) =>
      renderUniversalChange(refs, state, previous),
    );
    const card = refs.shopList.querySelector(".product-card");
    const quantity = refs.shopList.querySelector<HTMLInputElement>(".cart-line-quantity");
    refs.domainInput.value = "partially-typed.example.com";
    refs.domainInput.focus();

    controller.setRuntimeNotice("Received ec.update");

    expect(refs.shopList.querySelector(".product-card")).toBe(card);
    expect(refs.shopList.querySelector(".cart-line-quantity")).toBe(quantity);
    expect(document.activeElement).toBe(refs.domainInput);
    expect(refs.domainInput.value).toBe("partially-typed.example.com");
    expect(refs.runtimeNotice.textContent).toBe("Received ec.update");
    unsubscribe();
    controller.dispose();
  });

  it("preserves an uncommitted quantity draft while another shop changes", () => {
    const refs = queryUniversalRefs();
    const loadingShop: ShopState = {
      ...shop(),
      key: "shop-2",
      domain: "shop-two.example.com",
      catalogStatus: "loading",
      variants: [],
      cartLines: [],
    };
    const store = createUniversalStore({ ...createInitialState(), shops: [shop(), loadingShop] });
    renderUniversalApp(refs, store.getState());
    const unsubscribe = store.subscribe((state, previous) =>
      renderUniversalChange(refs, state, previous),
    );

    const productQuantity = refs.shopList.querySelector<HTMLInputElement>(
      '[data-shop-key="shop-1"] .cart-line-quantity',
    );
    expect(productQuantity).not.toBeNull();
    productQuantity!.focus();
    productQuantity!.value = "27";

    store.update((state) => ({
      ...state,
      shops: state.shops.map((entry) =>
        entry.key === "shop-2"
          ? { ...entry, catalogStatus: "ready", variants: [variant("789")] }
          : entry,
      ),
    }));

    expect(refs.shopList.querySelector('[data-shop-key="shop-1"] .cart-line-quantity')).toBe(
      productQuantity,
    );
    expect(document.activeElement).toBe(productQuantity);
    expect(productQuantity!.value).toBe("27");
    expect(refs.shopList.querySelector('[data-shop-key="shop-2"] .product-card')).not.toBeNull();

    const summaryQuantity = refs.shopList.querySelector<HTMLInputElement>(
      '[data-shop-key="shop-1"] .cart-line-summary-quantity',
    );
    expect(summaryQuantity).not.toBeNull();
    summaryQuantity!.focus();
    summaryQuantity!.value = "14";

    store.update((state) => ({
      ...state,
      shops: state.shops.map((entry) =>
        entry.key === "shop-2"
          ? { ...entry, cartLines: [{ variantId: "789", quantity: 1 }] }
          : entry,
      ),
    }));

    expect(
      refs.shopList.querySelector('[data-shop-key="shop-1"] .cart-line-summary-quantity'),
    ).toBe(summaryQuantity);
    expect(document.activeElement).toBe(summaryQuantity);
    expect(summaryQuantity!.value).toBe("14");
    unsubscribe();
  });

  it("shows stale lines and a blocking correction message after catalog changes", () => {
    const refs = queryUniversalRefs();
    const stale = { ...shop(), variants: [variant("replacement")] };
    renderUniversalApp(refs, { ...createInitialState(), shops: [stale] });

    expect(refs.shopList.querySelector(".cart-line")?.textContent).toContain("Unavailable");
    expect(refs.shopList.querySelector(".permalink-link")?.hasAttribute("href")).toBe(false);
    expect(refs.readiness.textContent).toContain("Remove unavailable");
  });
});
