import { describe, expect, expectTypeOf, it } from "vitest";
import {
  decodeProtocolPayload,
  type Buyer,
  type Checkout as ProtocolCheckout,
  type CheckoutStatus,
  type LineItem,
} from "@shopify/checkout-kit-protocol";

import { checkoutComparisonKey, toCheckout, type Checkout } from "./checkout";

function protocolCheckout(overrides: Partial<ProtocolCheckout> = {}): ProtocolCheckout {
  return {
    id: "checkout-123",
    currency: "USD",
    lineItems: [],
    links: [],
    status: "incomplete",
    totals: [],
    ucp: { version: "2026-04-08", paymentHandlers: {} },
    ...overrides,
  };
}

describe("toCheckout", () => {
  it("removes only top-level protocol metadata without modifying the protocol checkout", () => {
    const original = protocolCheckout({
      attribution: { campaign: "sample-campaign" },
      buyer: { firstName: "Sample", email: "buyer@example.com" },
      context: { addressCountry: "US" },
      continueUrl: "https://example.com/checkout",
      discounts: { codes: ["SAMPLE"] },
      expiresAt: "2026-09-14T12:00:00Z",
      fulfillment: { methods: [], availableMethods: [] },
      links: [{ type: "privacy_policy", url: "https://example.com/privacy" }],
      messages: [{ type: "info", content: "Sample message" }],
      order: { id: "order-123", permalinkUrl: "https://example.com/orders/sample" },
      payment: { instruments: [] },
      signals: { "com.example.device": { nested_key: "value" } },
      totals: [{ type: "total", amount: 2500 }],
      "com.example.extension": { ucp: { preserved: true }, nested_key: null },
    });

    const snapshot = toCheckout(original);

    expect(snapshot).not.toBe(original);
    expect(snapshot).not.toHaveProperty("ucp");
    expect({ ...snapshot, ucp: original.ucp }).toEqual(original);
    expect(original.ucp).toEqual({ version: "2026-04-08", paymentHandlers: {} });
    expect(snapshot["com.example.extension"]).toEqual({
      ucp: { preserved: true },
      nested_key: null,
    });
  });

  it("preserves decoded camelCase properties and unknown extension spelling", () => {
    const decoded = decodeProtocolPayload("ec.start", {
      id: "checkout-123",
      currency: "USD",
      status: "incomplete",
      links: [],
      totals: [],
      line_items: [
        {
          id: "line-1",
          parent_id: "parent-1",
          item: {
            id: "item-1",
            title: "Sample item",
            price: 2500,
            image_url: "https://example.com/item.png",
            custom_item_data: { original_key: true },
          },
          quantity: 1,
          totals: [],
          custom_line_data: { original_key: 7 },
        },
      ],
      buyer: { first_name: "Sample", custom_buyer_data: { original_key: false } },
      ucp: { version: "2026-04-08" },
      custom_checkout_data: { original_key: [1, null, "sample"] },
    });

    const snapshot = toCheckout(decoded);

    expect(snapshot.lineItems[0]?.parentId).toBe("parent-1");
    expect(snapshot.lineItems[0]?.item.imageUrl).toBe("https://example.com/item.png");
    expect(snapshot.buyer?.firstName).toBe("Sample");
    expect(snapshot.lineItems[0]?.custom_line_data).toEqual({ original_key: 7 });
    expect(snapshot.lineItems[0]?.item.custom_item_data).toEqual({ original_key: true });
    expect(snapshot.buyer?.custom_buyer_data).toEqual({ original_key: false });
    expect(snapshot.custom_checkout_data).toEqual({ original_key: [1, null, "sample"] });
    expect(snapshot).not.toHaveProperty("line_items");
    expect(snapshot).not.toHaveProperty("customCheckoutData");
  });

  it("does not introduce optional fields absent from the protocol snapshot", () => {
    const snapshot = toCheckout(protocolCheckout());

    expect(snapshot).toEqual({
      id: "checkout-123",
      currency: "USD",
      lineItems: [],
      links: [],
      status: "incomplete",
      totals: [],
    });
  });

  it("retains explicit known-field types while keeping extensions unknown", () => {
    expectTypeOf<Checkout["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Checkout["lineItems"]>().toEqualTypeOf<LineItem[]>();
    expectTypeOf<Checkout["buyer"]>().toEqualTypeOf<Buyer | undefined>();
    expectTypeOf<Checkout["status"]>().toEqualTypeOf<CheckoutStatus>();
    expectTypeOf<Checkout["expiresAt"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Checkout["custom_extension"]>().toBeUnknown();
    expectTypeOf<Checkout["ucp"]>().toBeUnknown();
    expectTypeOf<Checkout>().not.toExtend<ProtocolCheckout>();
  });
});

describe("checkoutComparisonKey", () => {
  it("ignores object key ordering at every depth, including extension objects inside arrays", () => {
    const first = toCheckout(
      protocolCheckout({
        buyer: { firstName: "Sample", lastName: "Buyer" },
        custom_extension: { first: 1, nested: [{ left: true, right: null }] },
      }),
    );
    const second = toCheckout(
      protocolCheckout({
        custom_extension: { nested: [{ right: null, left: true }], first: 1 },
        buyer: { lastName: "Buyer", firstName: "Sample" },
      }),
    );

    expect(checkoutComparisonKey(first)).toBe(checkoutComparisonKey(second));
  });

  it("ignores protocol metadata changes after adaptation", () => {
    const first = toCheckout(protocolCheckout());
    const second = toCheckout(
      protocolCheckout({
        ucp: { version: "2099-01-01", paymentHandlers: {}, custom_metadata: true },
      }),
    );

    expect(checkoutComparisonKey(first)).toBe(checkoutComparisonKey(second));
  });

  it("detects changed extension values and preserves array order", () => {
    const snapshot = toCheckout(protocolCheckout({ custom_extension: { values: [1, 2] } }));
    const changedValue = { ...snapshot, custom_extension: { values: [1, 3] } };
    const changedOrder = { ...snapshot, custom_extension: { values: [2, 1] } };

    expect(checkoutComparisonKey(snapshot)).not.toBe(checkoutComparisonKey(changedValue));
    expect(checkoutComparisonKey(snapshot)).not.toBe(checkoutComparisonKey(changedOrder));
  });

  it("uses JSON semantics for omitted optional fields while preserving null and primitive types", () => {
    const snapshot = toCheckout(protocolCheckout());

    expect(checkoutComparisonKey(snapshot)).toBe(
      checkoutComparisonKey({ ...snapshot, buyer: undefined }),
    );
    expect(checkoutComparisonKey(snapshot)).not.toBe(
      checkoutComparisonKey({ ...snapshot, custom_extension: null }),
    );
    expect(checkoutComparisonKey({ ...snapshot, custom_extension: 1 })).not.toBe(
      checkoutComparisonKey({ ...snapshot, custom_extension: "1" }),
    );
  });
});
