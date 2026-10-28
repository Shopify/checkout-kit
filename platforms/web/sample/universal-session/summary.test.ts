import type {
  ShopPayErrorEventEntry as ErrorEntry,
  ShopPayResourceEventEntry as ResourceEntry,
} from "@shopify/checkout-kit";
import { describe, expect, it } from "vitest";

import { describeEvent, redactSource, summarizeErrors } from "./summary";

function entry(overrides: Record<string, unknown> = {}): ResourceEntry {
  return {
    context: { sessionId: "session-1", revision: 1, shopId: "1001", status: "active" },
    checkout: {
      id: "checkout-1",
      status: "ready_for_complete",
      currency: "CAD",
      lineItems: [{ quantity: 2 }, { quantity: 1 }],
      totals: [
        { type: "subtotal", amount: 4500 },
        { type: "total", amount: 5400 },
      ],
      links: [],
      ...overrides,
    },
  } as unknown as ResourceEntry;
}

const ERRORS = [
  {
    context: { sessionId: "session-1", revision: 2, shopId: "1001", status: "failed" },
    error: { code: "payment_declined", message: "" },
  },
  { context: { sessionId: "session-1", revision: 2 }, error: { code: "expired", message: "" } },
] as unknown as ErrorEntry[];

describe("summarizeErrors", () => {
  it("lists codes and names the shop of a resource error", () => {
    expect(summarizeErrors(ERRORS)).toBe("payment_declined (shop 1001)\nexpired");
    expect(summarizeErrors([])).toBe("—");
  });
});

describe("describeEvent", () => {
  it("summarizes each event type", () => {
    expect(describeEvent(new CustomEvent("update", { detail: [entry(), entry()] }))).toBe(
      "2 checkouts: active/ready_for_complete, active/ready_for_complete",
    );
    expect(describeEvent(new CustomEvent("error", { detail: ERRORS }))).toBe(
      "payment_declined (shop 1001), expired",
    );
    expect(describeEvent(new CustomEvent("blocked", { detail: { code: "popup_blocked" } }))).toBe(
      "popup_blocked",
    );
    expect(describeEvent(new CustomEvent("close", { detail: null }))).toBe(
      "The checkout window closed.",
    );
  });
});

describe("redactSource", () => {
  it("hides the key", () => {
    const summary = redactSource("https://shop.app/checkouts/uc/session-1?key=synthetic-key");
    expect(summary).toBe("https://shop.app/checkouts/uc/session-1?… (key hidden)");
    expect(summary).not.toContain("synthetic-key");
  });

  it("shows an em dash without a source", () => {
    expect(redactSource("")).toBe("—");
  });
});
