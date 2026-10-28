import { expect, it } from "vitest";
import { ShopifyCheckoutCloseEvent } from "./checkout-events";

it("creates close events with null detail and without bubbling", () => {
  const event = new ShopifyCheckoutCloseEvent();
  expect(event.detail).toBeNull();
  expect(event.bubbles).toBe(false);
});
