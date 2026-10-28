import type { Checkout as ProtocolCheckout } from "@shopify/checkout-kit-protocol";

import { describe, expectTypeOf, it } from "vitest";

import type { Checkout } from "@shopify/checkout-kit-core/checkout/types";
import type {
  ShopifyUniversalCheckout,
  ShopifyUniversalCheckoutCloseEvent,
  ShopifyUniversalCheckoutCompleteEvent,
  ShopifyUniversalCheckoutErrorEvent,
  ShopifyUniversalCheckoutStartEvent,
  ShopifyUniversalCheckoutUpdateEvent,
  UniversalCheckoutContext,
  UniversalCheckoutErrorEventDetail,
  UniversalCheckoutFailure,
  UniversalCheckoutResourceEventDetail,
  UniversalCheckoutResourceStatus,
  UniversalCheckoutSnapshot,
} from "./shopify-universal-checkout";

describe("Universal Checkout public types", () => {
  it("keeps typed checkout fields while rejecting protocol metadata", () => {
    expectTypeOf<UniversalCheckoutSnapshot["lineItems"]>().not.toExtend<Checkout["lineItems"]>();
    expectTypeOf<
      UniversalCheckoutSnapshot["lineItems"][number]["quantity"]
    >().toEqualTypeOf<number>();
    expectTypeOf<UniversalCheckoutSnapshot["status"]>().toEqualTypeOf<
      Checkout["status"] | "unknown"
    >();
    expectTypeOf<UniversalCheckoutSnapshot["ucp"]>().toEqualTypeOf<undefined>();
    expectTypeOf<ProtocolCheckout>().not.toExtend<UniversalCheckoutSnapshot>();
  });

  it("rejects mutations to nested snapshot data while preserving readable types", () => {
    expectTypeOf((snapshot: UniversalCheckoutSnapshot) => {
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
    type EventEntry = UniversalCheckoutResourceEventDetail[number];

    expectTypeOf<UniversalCheckoutResourceStatus>().toEqualTypeOf<
      "active" | "completed" | "failed" | "ejected" | "unknown"
    >();
    expectTypeOf<UniversalCheckoutContext["status"]>().toEqualTypeOf<
      UniversalCheckoutResourceStatus | undefined
    >();
    expectTypeOf<EventEntry["context"]["status"]>().toEqualTypeOf<
      UniversalCheckoutResourceStatus | undefined
    >();
    expectTypeOf<EventEntry["checkout"]["status"]>().toEqualTypeOf<
      Checkout["status"] | "unknown"
    >();
  });

  it("preserves native and custom listeners alongside typed lifecycle events", () => {
    const checkout = document.createElement("shopify-universal-checkout");

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
      expectTypeOf(event).toEqualTypeOf<ShopifyUniversalCheckoutStartEvent>();
    });
    checkout.addEventListener("update", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopifyUniversalCheckoutUpdateEvent>();
    });
    checkout.addEventListener("complete", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopifyUniversalCheckoutCompleteEvent>();
    });
    checkout.addEventListener("error", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopifyUniversalCheckoutErrorEvent>();
    });
    checkout.addEventListener("close", (event) => {
      expectTypeOf(event).toEqualTypeOf<ShopifyUniversalCheckoutCloseEvent>();
    });
  });

  it("uses the public snapshot, context, and error types for events", () => {
    // Events are the element's only state surface; it has no checkout or error property.
    expectTypeOf<ShopifyUniversalCheckout>().not.toHaveProperty("checkout");
    expectTypeOf<ShopifyUniversalCheckout>().not.toHaveProperty("error");
    expectTypeOf<
      ShopifyUniversalCheckoutStartEvent["detail"]
    >().toEqualTypeOf<UniversalCheckoutResourceEventDetail>();
    expectTypeOf<
      ShopifyUniversalCheckoutErrorEvent["detail"]
    >().toEqualTypeOf<UniversalCheckoutErrorEventDetail>();
    expectTypeOf<
      ShopifyUniversalCheckoutStartEvent["detail"][number]["checkout"]
    >().toEqualTypeOf<UniversalCheckoutSnapshot>();
    expectTypeOf<
      ShopifyUniversalCheckoutUpdateEvent["detail"][number]["checkout"]
    >().toEqualTypeOf<UniversalCheckoutSnapshot>();
    expectTypeOf<
      ShopifyUniversalCheckoutCompleteEvent["detail"][number]["checkout"]
    >().toEqualTypeOf<UniversalCheckoutSnapshot>();
    expectTypeOf<
      ShopifyUniversalCheckoutUpdateEvent["detail"][number]["context"]
    >().toEqualTypeOf<UniversalCheckoutContext>();
    expectTypeOf<
      ShopifyUniversalCheckoutErrorEvent["detail"][number]["error"]
    >().toEqualTypeOf<UniversalCheckoutFailure>();
    expectTypeOf<ShopifyUniversalCheckoutErrorEvent["detail"][number]["checkout"]>().toEqualTypeOf<
      UniversalCheckoutSnapshot | undefined
    >();
  });
});
