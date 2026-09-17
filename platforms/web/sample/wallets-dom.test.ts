import { beforeEach, describe, expect, it } from "vitest";

import { queryWalletsRefs } from "./wallets-dom";
import { WALLETS_SHELL } from "./wallets-shell";

beforeEach(() => {
  document.body.innerHTML = WALLETS_SHELL;
});

describe("queryWalletsRefs", () => {
  it("returns all required refs without throwing", () => {
    const refs = queryWalletsRefs();
    expect(refs.layout.id).toBe("layout");
    expect(refs.form.id).toBe("wallets-form");
    expect(refs.storefrontInput.id).toBe("wallets-storefront-domain");
    expect(refs.accessTokenInput.id).toBe("wallets-access-token");
    expect(refs.countryInput.id).toBe("wallets-country");
    expect(refs.languageInput.id).toBe("wallets-language");
    expect(refs.walletCountInput.id).toBe("wallets-wallet-count");
    expect(refs.layoutSelect.id).toBe("wallets-layout");
    expect(refs.cartSourceFields.id).toBe("wallets-cart-source");
    expect(refs.buynowSourceFields.id).toBe("wallets-buynow-source");
    expect(refs.cartIdInput.id).toBe("wallets-cart-id");
    expect(refs.variantIdInput.id).toBe("wallets-variant-id");
    expect(refs.sellingPlanIdInput.id).toBe("wallets-selling-plan-id");

    // Cart banner
    expect(refs.cartBanner.id).toBe("wallets-cart-banner");
    expect(refs.createCartButton.id).toBe("wallets-create-cart");
    expect(refs.selectedLines.id).toBe("wallets-selected-lines");
    expect(refs.generatedSrcLink.id).toBe("wallets-generated-src");
    expect(refs.cartCount.id).toBe("wallets-cart-count");
    expect(refs.cartSummaryText.id).toBe("wallets-cart-summary-text");

    // Product grid
    expect(refs.buildWorkspace.id).toBe("wallets-build-workspace");
    expect(refs.productList.id).toBe("wallets-product-list");
    expect(refs.productEmpty.id).toBe("wallets-product-empty");
    expect(refs.loadState.id).toBe("wallets-load-state");
    expect(refs.cartStatus.id).toBe("wallets-cart-status");

    // Element + runtime
    expect(refs.elementWrapper.id).toBe("wallets-element-wrapper");
    expect(refs.elementAttrs.id).toBe("wallets-element-attrs");
    expect(refs.stateLayout.id).toBe("wallets-state-layout");
    expect(refs.eventLog.id).toBe("event-log");
    expect(refs.clearLogButton.id).toBe("clear-log");
  });
});
