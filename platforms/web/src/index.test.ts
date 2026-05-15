/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

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
      pkg.ShopifyCheckoutLineItemsChangeEvent,
      pkg.ShopifyCheckoutBuyerChangeEvent,
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
