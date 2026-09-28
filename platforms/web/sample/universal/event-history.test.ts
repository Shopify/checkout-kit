import { describe, expect, it } from "vitest";

import { MAX_EVENT_ENTRIES, UniversalEventHistory } from "./event-history";

const CHECKOUT_ID = "gid://shopify/Checkout/secret-123";
const SHOP_ID = "gid://shopify/Shop/secret-456";
const SESSION_ID = "secret-session-789";
const SECRET_URL = "https://shop.app/checkout?token=private-token";
const PRIVATE_EMAIL = "buyer@example.test";

function checkout(status = "incomplete") {
  return {
    id: CHECKOUT_ID,
    status,
    currency: "USD",
    lineItems: [{ id: "line-secret", buyer: { email: PRIVATE_EMAIL } }],
    buyer: { email: PRIVATE_EMAIL },
    continueUrl: SECRET_URL,
    messages: [{ content: '<img src=x onerror="alert(1)">' }],
    order: undefined,
  };
}

function aggregate(status = "incomplete") {
  return {
    sessionId: SESSION_ID,
    revision: 1,
    resources: [{ id: CHECKOUT_ID, shopId: SHOP_ID, checkout: checkout(status) }],
  };
}

function resourceEntry(status = "incomplete") {
  return {
    context: { sessionId: SESSION_ID, revision: 1, shopId: SHOP_ID },
    checkout: checkout(status),
  };
}

describe("Universal event history", () => {
  it("projects detail and aggregate immediately without keeping IDs, URLs, PII or HTML", () => {
    const history = new UniversalEventHistory(() => new Date("2026-09-25T12:00:00Z"));
    history.beginPresentation();
    const event = resourceEntry();
    const current = aggregate();
    history.receive("start", [event], current, undefined);
    event.checkout.buyer.email = "changed@example.test";
    current.resources[0]!.checkout.buyer.email = "changed@example.test";

    const snapshot = history.snapshot;
    expect(snapshot.phase).toBe("active");
    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.entries[0]).toMatchObject({
      name: "start",
      label: "Shop 1",
      status: "incomplete",
    });
    expect(snapshot.resources).toEqual([
      { label: "Shop 1", status: "incomplete", lineItemCount: 1, currency: "USD" },
    ]);
    expect(snapshot.entries[0]!.detail).toContain('"resource": "Shop 1"');
    expect(snapshot.entries[0]!.detail).toContain('"order": "absent"');
    const safeState = JSON.stringify(snapshot);
    for (const sensitive of [
      CHECKOUT_ID,
      SHOP_ID,
      SESSION_ID,
      SECRET_URL,
      PRIVATE_EMAIL,
      "changed@example.test",
      "<img",
      "private-token",
    ]) {
      expect(safeState).not.toContain(sensitive);
    }
  });

  it("keeps labels stable across an array batch and does not infer a selected domain", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const secondShop = "gid://shopify/Shop/second-secret";
    const second = {
      context: { sessionId: SESSION_ID, revision: 1, shopId: secondShop },
      checkout: { ...checkout(), status: "ready_for_complete" },
    };
    history.receive(
      "start",
      [resourceEntry(), second],
      {
        sessionId: SESSION_ID,
        revision: 1,
        resources: [
          { id: CHECKOUT_ID, shopId: SHOP_ID, checkout: checkout() },
          { id: "second-checkout-secret", shopId: secondShop, checkout: second.checkout },
        ],
      },
      undefined,
    );
    history.receive("update", resourceEntry("completed"), aggregate("completed"), undefined);
    expect(history.snapshot.entries.map((entry) => entry.label)).toEqual([
      "Shop 1",
      "Shop 2",
      "Shop 1",
    ]);
    expect(history.snapshot.resources[0]?.status).toBe("completed");
    expect(JSON.stringify(history.snapshot)).not.toContain(secondShop);
  });

  it("bounds each presentation to 200 entries and keeps checkout state after Clear", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    for (let revision = 1; revision <= MAX_EVENT_ENTRIES + 1; revision += 1) {
      history.receive(
        "update",
        [{ ...resourceEntry(), context: { sessionId: SESSION_ID, revision, shopId: SHOP_ID } }],
        aggregate(),
        undefined,
      );
    }
    expect(history.snapshot.entries).toHaveLength(MAX_EVENT_ENTRIES);
    expect(history.snapshot.entries[0]?.detail).toContain('"revision": 2');
    history.clear();
    expect(history.snapshot.entries).toHaveLength(0);
    expect(history.snapshot.resources).toHaveLength(1);
    expect(history.snapshot.phase).toBe("active");
  });

  it("keeps resource errors local, redacts messages and records close before reset", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    history.receive("start", [resourceEntry()], aggregate(), undefined);
    history.receive(
      "error",
      [
        {
          context: { sessionId: SESSION_ID, revision: 2, shopId: SHOP_ID },
          scope: "resource",
          error: {
            code: "invalid_cart",
            message: `Private buyer ${PRIVATE_EMAIL} at ${SECRET_URL}`,
            httpStatusCode: 422,
          },
        },
      ],
      aggregate(),
      {
        sessionId: SESSION_ID,
        errors: [
          {
            scope: "resource",
            shopId: SHOP_ID,
            error: { code: "invalid_cart", message: PRIVATE_EMAIL },
          },
        ],
      },
    );
    expect(history.snapshot.phase).toBe("active");
    expect(history.snapshot.errors).toEqual([
      { label: "Shop 1", scope: "resource", code: "invalid_cart" },
    ]);
    expect(history.snapshot.entries.at(-1)?.detail).toContain('"message": "[redacted]"');
    expect(JSON.stringify(history.snapshot)).not.toContain(PRIVATE_EMAIL);
    history.receive("close", undefined, aggregate(), undefined);
    expect(history.snapshot.phase).toBe("closed");
    expect(history.snapshot.errors).toEqual([
      { label: "Shop 1", scope: "resource", code: "invalid_cart" },
    ]);
    expect(history.snapshot.entries.at(-1)?.name).toBe("close");
    history.receive("update", [resourceEntry()], aggregate(), undefined);
    expect(history.snapshot.entries.at(-1)?.name).toBe("close");

    history.beginPresentation();
    expect(history.snapshot.presentation).toBe(2);
    expect(history.snapshot.phase).toBe("opening");
    expect(history.snapshot.entries).toHaveLength(0);
    expect(history.snapshot.resources).toHaveLength(0);
  });

  it("clears a recovered resource's error badge when Kit has no current error aggregate", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    history.receive(
      "error",
      [{ scope: "resource", context: { shopId: SHOP_ID }, error: { code: "invalid_cart" } }],
      aggregate(),
      {
        sessionId: SESSION_ID,
        errors: [{ scope: "resource", shopId: SHOP_ID, error: { code: "invalid_cart" } }],
      },
    );
    expect(history.snapshot.errors).toHaveLength(1);

    history.receive("start", [resourceEntry()], aggregate(), undefined);

    expect(history.snapshot.errors).toEqual([]);
    expect(history.snapshot.entries.at(-1)?.name).toBe("start");
  });

  it("treats a session failure as a failure without exposing arbitrary error text or codes", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    history.receive(
      "error",
      [{ scope: "session", error: { code: "<script>", message: PRIVATE_EMAIL } }],
      undefined,
      undefined,
    );
    expect(history.snapshot.phase).toBe("failed");
    expect(history.snapshot.entries[0]?.label).toBe("Session");
    expect(history.snapshot.entries[0]?.detail).toContain('"code": "unknown"');
    expect(JSON.stringify(history.snapshot)).not.toContain(PRIVATE_EMAIL);
  });
});
