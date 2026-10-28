import type {
  ShopifyUniversalCheckoutErrorEventEntry as ErrorEntry,
  ShopifyUniversalCheckoutResourceEventEntry as ResourceEntry,
  ShopifyUniversalCheckoutResourceStatus as ResourceStatus,
} from "@shopify/checkout-kit";
import { describe, expect, it } from "vitest";

import { UniversalSessionState } from "./session-state";

function entry(
  shopId: string,
  revision: number,
  status?: ResourceStatus,
  checkoutId = `${shopId}-checkout`,
): ResourceEntry {
  return {
    context: { sessionId: "session-1", revision, shopId, ...(status && { status }) },
    checkout: {
      id: checkoutId,
      status: "incomplete",
    } as ResourceEntry["checkout"],
  };
}

function failure(shopId: string | undefined, revision: number): ErrorEntry {
  return {
    context: { sessionId: "session-1", revision, ...(shopId && { shopId }) },
    error: { code: "unknown", message: "synthetic" },
  };
}

describe("UniversalSessionState", () => {
  it("keeps the latest entry per shop and the highest revision", () => {
    const state = new UniversalSessionState();
    expect(state.checkout).toBeUndefined();

    state.update("start", [entry("shop-1", 1), entry("shop-2", 1)]);
    state.update("update", [entry("shop-1", 2, "active")]);
    state.update("complete", [entry("shop-2", 3, "completed")]);

    expect(state.checkout).toEqual({
      revision: 3,
      resources: [
        {
          shopId: "shop-1",
          status: "active",
          checkout: { id: "shop-1-checkout", status: "incomplete" },
        },
        {
          shopId: "shop-2",
          status: "completed",
          checkout: { id: "shop-2-checkout", status: "incomplete" },
        },
      ],
    });
    state.update("update", [entry("shop-1", 4)]);
    expect(state.checkout?.resources[0]).not.toHaveProperty("status");
  });

  it("keeps one error per shop until a new checkout starts, and every session error", () => {
    const state = new UniversalSessionState();
    expect(state.error).toBeUndefined();

    state.update("start", [entry("shop-1", 1)]);
    state.fail([failure("shop-1", 2), failure("shop-1", 2)]);
    state.fail([{ error: { code: "sdk_error", message: "synthetic" } }]);
    expect(state.error).toEqual({
      revision: 2,
      errors: [failure("shop-1", 2), { error: { code: "sdk_error", message: "synthetic" } }],
    });

    state.update("update", [entry("shop-1", 3)]);
    expect(state.error?.errors).toHaveLength(2);
    state.update("start", [entry("shop-1", 4, undefined, "shop-1-replacement")]);
    expect(state.error).toEqual({
      revision: 2,
      errors: [{ error: { code: "sdk_error", message: "synthetic" } }],
    });
    state.fail([failure(undefined, 5)]);
    expect(state.error?.revision).toBe(5);
    expect(state.error?.errors).toHaveLength(2);
  });

  it("forgets everything on reset", () => {
    const state = new UniversalSessionState();
    state.update("start", [entry("shop-1", 1)]);
    state.fail([failure(undefined, 1)]);

    state.reset();

    expect(state.checkout).toBeUndefined();
    expect(state.error).toBeUndefined();
  });
});
