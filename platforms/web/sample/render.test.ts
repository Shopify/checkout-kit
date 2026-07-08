import { beforeEach, describe, expect, it } from "vitest";

import type { ProductVariantOption } from "./cart";
import { queryRefs, type Refs } from "./dom";
import { renderApp } from "./render";
import { createInitialState, type AppState, type SettingsSlice } from "./state";
import { SAMPLE_SHELL } from "./shell";
import { renderCart } from "./views/cart";
import { renderLog } from "./views/log";
import { renderProducts } from "./views/products";
import { renderSettings } from "./views/settings";

function mountShell(): Refs {
  document.body.innerHTML = SAMPLE_SHELL;
  return queryRefs();
}

function settings(overrides: Partial<SettingsSlice> = {}): SettingsSlice {
  return {
    sourceMode: "build",
    storefrontDomain: "your-store.myshopify.com",
    target: "popup",
    appearance: "",
    debug: false,
    manualSrc: "",
    settingsCollapsed: false,
    ...overrides,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return { ...createInitialState(settings()), ...overrides };
}

function variant(overrides: Partial<ProductVariantOption> = {}): ProductVariantOption {
  return {
    id: "123",
    title: "Sample product",
    productTitle: "Sample product",
    variantTitle: "Default Title",
    vendor: "Acme",
    price: "10.00",
    available: true,
    ...overrides,
  };
}

let refs: Refs;
beforeEach(() => {
  refs = mountShell();
});

describe("renderProducts", () => {
  it("shows the empty state and load pill when there are no variants", () => {
    renderProducts(refs, state({ loadState: "Waiting for domain" }));
    expect(refs.productList.children).toHaveLength(0);
    expect(refs.productEmpty.style.display).toBe("");
    expect(refs.loadState.textContent).toBe("Waiting for domain");
  });

  it("renders a product card per variant and hides the empty state", () => {
    renderProducts(refs, state({ variants: [variant(), variant({ id: "456", title: "Second" })] }));
    expect(refs.productList.querySelectorAll(".product-card")).toHaveLength(2);
    expect(refs.productEmpty.style.display).toBe("none");
  });

  it("shows an add button for a variant not yet in the cart", () => {
    renderProducts(refs, state({ variants: [variant()] }));
    expect(refs.productList.querySelector("[data-cart-action='add']")).not.toBeNull();
  });

  it("shows quantity controls for a variant already in the cart", () => {
    renderProducts(
      refs,
      state({ variants: [variant()], cartLines: [{ variantId: "123", quantity: 3 }] }),
    );
    const input = refs.productList.querySelector<HTMLInputElement>(".cart-line-quantity");
    expect(input?.value).toBe("3");
  });

  it("reflects the cart status tone", () => {
    renderProducts(refs, state({ cartStatus: { message: "Products loaded.", tone: "success" } }));
    expect(refs.cartStatus.hidden).toBe(true);
    expect(refs.cartStatus.dataset["tone"]).toBe("success");
  });
});

describe("renderCart", () => {
  it("shows the empty prompt and empty permalink when the cart is empty", () => {
    renderCart(refs, state());
    expect(refs.cartCount.textContent).toBe("0 items");
    expect(refs.cartSummaryText.textContent).toBe("Add products to start a multi-item cart.");
    expect(refs.generatedSrcLink.dataset["empty"]).toBe("true");
    expect(refs.generatedSrcLink.hasAttribute("href")).toBe(false);
  });

  it("renders cart lines and the derived permalink", () => {
    renderCart(
      refs,
      state({
        variants: [variant()],
        cartLines: [{ variantId: "123", quantity: 2 }],
      }),
    );
    expect(refs.selectedLines.querySelectorAll(".cart-line")).toHaveLength(1);
    expect(refs.cartCount.textContent).toBe("2 items");
    expect(refs.generatedSrcLink.dataset["empty"]).toBe("false");
    expect(refs.generatedSrcLink.getAttribute("href")).toBe(
      "https://your-store.myshopify.com/cart/123:2",
    );
  });
});

describe("renderSettings", () => {
  it("shows the build workspace in build mode", () => {
    const checkout = document.createElement("div");
    renderSettings(refs, state({ cartLines: [{ variantId: "123", quantity: 1 }] }), checkout);
    expect(refs.buildWorkspace.hidden).toBe(false);
    expect(refs.manualWorkspace.hidden).toBe(true);
    expect(refs.cartCheckoutButton.disabled).toBe(false);
    expect(checkout.getAttribute("src")).toBe("https://your-store.myshopify.com/cart/123:1");
    expect(checkout.getAttribute("target")).toBe("popup");
  });

  it("shows the manual workspace and toggles the debug attribute", () => {
    const checkout = document.createElement("div");
    renderSettings(
      refs,
      state({
        sourceMode: "manual",
        manualSrc: "https://your-store.myshopify.com/cart/1:1",
        debug: true,
      }),
      checkout,
    );
    expect(refs.storefrontSourceFields.hidden).toBe(true);
    expect(refs.manualWorkspace.hidden).toBe(false);
    expect(refs.manualCheckoutButton.disabled).toBe(false);
    expect(checkout.hasAttribute("debug")).toBe(true);
  });

  it("applies the appearance attribute when set and removes it when empty", () => {
    const checkout = document.createElement("div");
    renderSettings(refs, state({ appearance: "app:dark" }), checkout);
    expect(checkout.getAttribute("appearance")).toBe("app:dark");

    renderSettings(refs, state({ appearance: "" }), checkout);
    expect(checkout.hasAttribute("appearance")).toBe(false);
  });

  it("flags an invalid storefront domain in build mode", () => {
    const checkout = document.createElement("div");
    renderSettings(refs, state({ storefrontDomain: "" }), checkout);
    expect(refs.storefrontInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("collapses the settings panel", () => {
    const checkout = document.createElement("div");
    renderSettings(refs, state({ settingsCollapsed: true }), checkout);
    expect(refs.layout.classList.contains("settings-collapsed")).toBe(true);
    expect(refs.settingsToggle.textContent).toBe("Show");
  });
});

describe("renderLog", () => {
  it("formats the component state panel", () => {
    renderLog(
      refs,
      state({
        target: "auto",
        appearance: "app:dark",
        debug: true,
        component: { checkout: undefined, error: "boom" },
      }),
    );
    expect(refs.stateTarget.textContent).toBe("auto");
    expect(refs.stateAppearance.textContent).toBe("app:dark");
    expect(refs.stateDebug.textContent).toBe("true");
    expect(refs.stateCheckout.textContent).toBe("—");
    expect(refs.stateError.textContent).toBe("boom");
  });

  it("renders log entries in stored order", () => {
    renderLog(
      refs,
      state({
        log: [
          { type: "ec.close", time: "00:00:02.000", snapshot: "{}" },
          { type: "ec.start", time: "00:00:01.000", snapshot: "{}" },
        ],
      }),
    );
    const names = [...refs.eventLog.querySelectorAll(".event-entry-name")].map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["ec.close", "ec.start"]);
  });
});

describe("renderApp", () => {
  it("renders every panel from a single state object", () => {
    const checkout = document.createElement("div");
    renderApp(
      refs,
      state({ variants: [variant()], cartLines: [{ variantId: "123", quantity: 1 }] }),
      checkout,
    );
    expect(refs.productList.querySelectorAll(".product-card")).toHaveLength(1);
    expect(refs.selectedLines.querySelectorAll(".cart-line")).toHaveLength(1);
    expect(checkout.getAttribute("src")).toBe("https://your-store.myshopify.com/cart/123:1");
  });
});
