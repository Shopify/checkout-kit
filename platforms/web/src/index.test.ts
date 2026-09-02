import { describe, expect, it } from "vitest";

import * as pkg from "./index";

describe("@shopify/checkout-kit public entry", () => {
  it("exports ShopifyCheckout as a constructor", () => {
    expect(typeof pkg.ShopifyCheckout).toBe("function");
    expect(pkg.ShopifyCheckout.prototype).toBeInstanceOf(HTMLElement);
  });

  it("exports event classes as constructors that produce CustomEvents", () => {
    const eventCtors = [
      pkg.ShopifyCheckoutStartEvent,
      pkg.ShopifyCheckoutCompleteEvent,
      pkg.ShopifyCheckoutCloseEvent,
      pkg.ShopifyCheckoutErrorEvent,
      pkg.ShopifyCheckoutFulfillmentChangeEvent,
      pkg.ShopifyCheckoutLineItemsChangeEvent,
      pkg.ShopifyCheckoutTotalsChangeEvent,
      pkg.ShopifyCheckoutMessagesChangeEvent,
    ];
    for (const ctor of eventCtors) {
      expect(typeof ctor).toBe("function");
      expect(ctor.prototype).toBeInstanceOf(CustomEvent);
    }
  });

  it("registers <shopify-checkout> as a side effect of importing the entry", () => {
    expect(customElements.get("shopify-checkout")).toBe(pkg.ShopifyCheckout);
  });
});
