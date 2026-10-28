import type { Checkout as ProtocolCheckout } from "@shopify/checkout-kit-protocol";

import { describe, expectTypeOf, it } from "vitest";

import type { Checkout } from "@shopify/checkout-kit-core/checkout/types";
import type {
  ShopPay,
  ShopPayCloseEvent,
  ShopPayCompleteEvent,
  ShopPayErrorEvent,
  ShopPayStartEvent,
  ShopPayUpdateEvent,
  ShopPayContext,
  ShopPayErrorEventDetail,
  ShopPayFailure,
  ShopPayResourceEventDetail,
  ShopPayResourceStatus,
  ShopPaySnapshot,
} from "./shop-pay";

describe("Universal Checkout public types", () => {
  it("keeps typed checkout fields while rejecting protocol metadata", () => {
    expectTypeOf<ShopPaySnapshot["lineItems"]>().not.toExtend<Checkout["lineItems"]>();
    expectTypeOf<ShopPaySnapshot["lineItems"][number]["quantity"]>().toEqualTypeOf<number>();
    expectTypeOf<ShopPaySnapshot["status"]>().toEqualTypeOf<Checkout["status"] | "unknown">();
    expectTypeOf<ShopPaySnapshot["ucp"]>().toEqualTypeOf<undefined>();
    expectTypeOf<ProtocolCheckout>().not.toExtend<ShopPaySnapshot>();
  });

  it("rejects mutations to nested snapshot data while preserving readable types", () => {
    expectTypeOf((snapshot: ShopPaySnapshot) => {
      expectTypeOf(snapshot.lineItems.map((item) => item.quantity)).toEqualTypeOf<number[]>();
      expectTypeOf(snapshot.buyer?.email).toEqualTypeOf<string | undefined>();
      expectTypeOf(snapshot.totals[0]!.lines?.[0]?.amount).toEqualTypeOf<number | undefined>();
      expectTypeOf(snapshot.attribution?.source).toEqualTypeOf<string | undefined>();
      expectTypeOf(snapshot.extensions).toBeUnknown();

      // @ts-expect-error Snapshot arrays are frozen.
      snapshot.lineItems.splice(0, 1);
      // @ts-expect-error Array elements are frozen too.
      snapshot.lineItems[0]!.quantity += 1;
      // @ts-expect-error Objects nested inside array elements are frozen.
      snapshot.lineItems[0]!.item.title = "Changed";
      // @ts-expect-error Optional nested objects are frozen.
      snapshot.buyer!.email = "changed@example.com";
      // @ts-expect-error Optional nested arrays are frozen.
      snapshot.totals[0]!.lines!.push({ amount: 1, displayText: "Changed" });
      // @ts-expect-error Elements of optional nested arrays are frozen.
      snapshot.totals[0]!.lines![0]!.amount = 1;
      // @ts-expect-error Snapshot dictionaries are frozen.
      snapshot.attribution!.source = "changed";
    }).toBeFunction();
  });

  it("keeps resource status separate from the child checkout status", () => {
    type EventEntry = ShopPayResourceEventDetail[number];

    expectTypeOf<ShopPayResourceStatus>().toEqualTypeOf<
      "active" | "completed" | "failed" | "ejected" | "unknown"
    >();
    expectTypeOf<ShopPayContext["status"]>().toEqualTypeOf<ShopPayResourceStatus | undefined>();
    expectTypeOf<EventEntry["context"]["status"]>().toEqualTypeOf<
      ShopPayResourceStatus | undefined
    >();
    expectTypeOf<EventEntry["checkout"]["status"]>().toEqualTypeOf<
      Checkout["status"] | "unknown"
    >();
  });

  it("preserves native and custom listeners alongside typed lifecycle events", () => {
    const checkout = document.createElement("shop-pay");

    checkout.addEventListener("click", (event) => {
      expectTypeOf(event).toEqualTypeOf<HTMLElementEventMap["click"]>();
    });
    checkout.addEventListener("keydown", (event) => {
      expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
    });

    const customType: string = "sample:refresh";
    checkout.addEventListener(customType, (event) => {
      expectTypeOf(event).toEqualTypeOf<Event>();
    });
    checkout.addEventListener(customType, {
      handleEvent(event) {
        expectTypeOf(event).toEqualTypeOf<Event>();
      },
    });
    checkout.addEventListener(customType, null);

    checkout.addEventListener("start", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopPayStartEvent>();
    });
    checkout.addEventListener("update", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopPayUpdateEvent>();
    });
    checkout.addEventListener("complete", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopPayCompleteEvent>();
    });
    checkout.addEventListener("error", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopPayErrorEvent>();
    });
    checkout.addEventListener("close", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopPayCloseEvent>();
    });
  });

  it("uses the public snapshot, context, and error types for events", () => {
    // Events are the element's only state surface; it has no checkout or error property.
    expectTypeOf<ShopPay>().not.toHaveProperty("checkout");
    expectTypeOf<ShopPay>().not.toHaveProperty("error");
    expectTypeOf<ShopPayStartEvent["detail"]>().toEqualTypeOf<ShopPayResourceEventDetail>();
    expectTypeOf<ShopPayErrorEvent["detail"]>().toEqualTypeOf<ShopPayErrorEventDetail>();
    expectTypeOf<
      ShopPayStartEvent["detail"][number]["checkout"]
    >().toEqualTypeOf<ShopPaySnapshot>();
    expectTypeOf<
      ShopPayUpdateEvent["detail"][number]["checkout"]
    >().toEqualTypeOf<ShopPaySnapshot>();
    expectTypeOf<
      ShopPayCompleteEvent["detail"][number]["checkout"]
    >().toEqualTypeOf<ShopPaySnapshot>();
    expectTypeOf<ShopPayUpdateEvent["detail"][number]["context"]>().toEqualTypeOf<ShopPayContext>();
    expectTypeOf<ShopPayErrorEvent["detail"][number]["error"]>().toEqualTypeOf<ShopPayFailure>();
    expectTypeOf<ShopPayErrorEvent["detail"][number]["checkout"]>().toEqualTypeOf<
      ShopPaySnapshot | undefined
    >();
  });
});
