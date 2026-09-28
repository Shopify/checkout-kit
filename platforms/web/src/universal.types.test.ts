import type { Checkout as ProtocolCheckout } from "@shopify/checkout-kit-protocol";

import { describe, expectTypeOf, it } from "vitest";

import type { Checkout } from "./checkout.types";
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
  UniversalCheckoutSnapshot,
} from "./universal";

describe("Universal Checkout public types", () => {
  it("keeps typed checkout fields while rejecting protocol metadata", () => {
    expectTypeOf<UniversalCheckoutSnapshot["lineItems"]>().toEqualTypeOf<Checkout["lineItems"]>();
    expectTypeOf<UniversalCheckoutSnapshot["status"]>().toEqualTypeOf<
      Checkout["status"] | "unknown"
    >();
    expectTypeOf<UniversalCheckoutSnapshot["ucp"]>().toEqualTypeOf<undefined>();
    expectTypeOf<ProtocolCheckout>().not.toExtend<UniversalCheckoutSnapshot>();
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

  it("uses the public snapshot, context, and error types for events and element state", () => {
    type StateSnapshot = NonNullable<
      ShopifyUniversalCheckout["checkout"]
    >["resources"][number]["checkout"];
    type StateError = NonNullable<ShopifyUniversalCheckout["error"]>["errors"][number]["error"];

    expectTypeOf<StateSnapshot>().toEqualTypeOf<UniversalCheckoutSnapshot>();
    expectTypeOf<StateError>().toEqualTypeOf<UniversalCheckoutFailure>();
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
    expectTypeOf<ShopifyUniversalCheckoutErrorEvent["detail"][number]["scope"]>().toEqualTypeOf<
      "resource" | "session"
    >();
  });
});
