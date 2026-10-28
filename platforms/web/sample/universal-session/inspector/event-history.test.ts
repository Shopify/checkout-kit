import { describe, expect, it } from "vitest";

import {
  MAX_EVENT_DETAIL_ENTRIES,
  MAX_EVENT_ENTRIES,
  UniversalEventHistory,
} from "./event-history";

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
      {
        label: "Shop 1",
        status: "incomplete",
        checkoutStatus: "incomplete",
        lineItemCount: 1,
        currency: "USD",
      },
    ]);
    expect(snapshot.entries[0]!.detail).toContain('"shopId": "Shop 1"');
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
    expect(history.snapshot.entries.map((entry) => entry.label)).toEqual(["2 entries", "Shop 1"]);
    expect(history.snapshot.entries[0]?.status).toBe("1 incomplete · 1 ready_for_complete");
    expect(JSON.parse(history.snapshot.entries[0]!.detail)).toMatchObject({
      event: "start",
      entryCount: 2,
      entries: [
        { context: { shopId: "Shop 1", revision: 1 }, checkout: { status: "incomplete" } },
        { context: { shopId: "Shop 2", revision: 1 }, checkout: { status: "ready_for_complete" } },
      ],
    });
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
          error: {
            code: "invalid_cart",
            message: `Private buyer ${PRIVATE_EMAIL} at ${SECRET_URL}`,
          },
        },
      ],
      aggregate(),
      {
        sessionId: SESSION_ID,
        errors: [
          {
            shopId: SHOP_ID,
            error: { code: "invalid_cart", message: PRIVATE_EMAIL },
          },
        ],
      },
    );
    expect(history.snapshot.phase).toBe("active");
    expect(history.snapshot.errors).toEqual([{ resourceLabel: "Shop 1", code: "invalid_cart" }]);
    expect(history.snapshot.entries.at(-1)?.detail).toContain('"message": "[redacted]"');
    expect(JSON.stringify(history.snapshot)).not.toContain(PRIVATE_EMAIL);
    history.receive("close", undefined, aggregate(), undefined);
    expect(history.snapshot.phase).toBe("closed");
    expect(history.snapshot.errors).toEqual([{ resourceLabel: "Shop 1", code: "invalid_cart" }]);
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
      [{ context: { shopId: SHOP_ID }, error: { code: "invalid_cart" } }],
      aggregate(),
      {
        sessionId: SESSION_ID,
        errors: [{ shopId: SHOP_ID, error: { code: "invalid_cart" } }],
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
      [{ error: { code: "<script>", message: PRIVATE_EMAIL } }],
      undefined,
      undefined,
    );
    expect(history.snapshot.phase).toBe("failed");
    expect(history.snapshot.entries[0]?.label).toBe("Session");
    expect(history.snapshot.entries[0]?.detail).toContain('"code": "unknown"');
    expect(JSON.stringify(history.snapshot)).not.toContain(PRIVATE_EMAIL);
  });

  it("preserves callback boundaries and incoming order even for repeated shop entries", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const first = resourceEntry("ready_for_complete");
    const second = resourceEntry("complete_in_progress");
    second.context.revision = 2;
    history.receive("update", [first, second], aggregate("complete_in_progress"), undefined);
    history.receive("update", [resourceEntry("completed")], aggregate("completed"), undefined);
    first.checkout.status = "changed";
    second.context.revision = 99;

    expect(history.snapshot.entries).toHaveLength(2);
    expect(history.snapshot.entries.map(({ name }) => name)).toEqual(["update", "update"]);
    expect(history.snapshot.entries[0]?.label).toBe("2 entries");
    expect(JSON.parse(history.snapshot.entries[0]!.detail)).toMatchObject({
      event: "update",
      entryCount: 2,
      entries: [
        { context: { shopId: "Shop 1", revision: 1 }, checkout: { status: "ready_for_complete" } },
        {
          context: { shopId: "Shop 1", revision: 2 },
          checkout: { status: "complete_in_progress" },
        },
      ],
    });
    expect(history.snapshot.phase).toBe("active");
  });

  it("keeps one empty callback row and one close callback row", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    history.receive("start", [], undefined, undefined);
    history.receive("error", [], undefined, undefined);
    expect(history.snapshot.phase).toBe("opening");
    expect(history.snapshot.entries.map(({ label }) => label)).toEqual(["0 entries", "0 entries"]);
    history.receive("close", undefined, undefined, undefined);
    expect(history.snapshot.entries.map(({ name }) => name)).toEqual(["start", "error", "close"]);
    for (const event of history.snapshot.entries) {
      expect(JSON.parse(event.detail)).toMatchObject({
        event: event.name,
        entryCount: 0,
        entries: [],
      });
    }
    expect(history.snapshot.phase).toBe("closed");
  });

  it("groups mixed resource and session errors with readable safe codes", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    history.receive(
      "error",
      [
        {
          context: { sessionId: SESSION_ID, revision: 1, shopId: SHOP_ID },
          error: { code: "invalid_cart", message: PRIVATE_EMAIL },
        },
        {
          context: { sessionId: SESSION_ID, revision: 2 },
          error: { code: PRIVATE_EMAIL, message: SECRET_URL },
        },
      ],
      aggregate(),
      undefined,
    );

    expect(history.snapshot.entries).toHaveLength(1);
    expect(history.snapshot.entries[0]).toMatchObject({
      name: "error",
      label: "2 entries",
      status: "1 invalid_cart · 1 unknown",
    });
    expect(JSON.parse(history.snapshot.entries[0]!.detail)).toMatchObject({
      event: "error",
      entryCount: 2,
      entries: [
        {
          context: { sessionId: "[redacted]", shopId: "Shop 1", revision: 1 },
          error: { code: "invalid_cart", message: "[redacted]" },
        },
        {
          context: { sessionId: "[redacted]", revision: 2 },
          error: { code: "unknown", message: "[redacted]" },
        },
      ],
    });
    expect(history.snapshot.phase).toBe("failed");
    expect(JSON.stringify(history.snapshot)).not.toContain(PRIVATE_EMAIL);
    expect(JSON.stringify(history.snapshot)).not.toContain(SECRET_URL);
  });

  it("caps details at 50 entries while counting omitted statuses in the callback summary", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const entries = Array.from({ length: MAX_EVENT_DETAIL_ENTRIES + 2 }, (_, index) => ({
      context: {
        sessionId: SESSION_ID,
        revision: 1,
        shopId: `private-shop-${index}`,
        status: index === MAX_EVENT_DETAIL_ENTRIES + 1 ? "ejected" : "active",
      },
      checkout: checkout(),
    }));
    history.receive("update", entries, undefined, undefined);

    expect(history.snapshot.entries).toHaveLength(1);
    const event = history.snapshot.entries[0]!;
    const detail = JSON.parse(event.detail);
    expect(event.label).toBe("52 entries");
    expect(event.status).toBe("51 incomplete · 1 ejected");
    expect(detail.entryCount).toBe(52);
    expect(detail.entries).toHaveLength(MAX_EVENT_DETAIL_ENTRIES);
    expect(detail.additionalEntryCount).toBe(2);
    expect(detail.entries[0].context.shopId).toBe("Shop 1");
    expect(detail.entries.at(-1).context.shopId).toBe("Shop 50");
    for (const secret of ["private-shop-", PRIVATE_EMAIL, SECRET_URL, SESSION_ID, CHECKOUT_ID]) {
      expect(event.detail).not.toContain(secret);
    }
  });

  it("retains a session failure beyond the displayed error entries", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    history.receive(
      "error",
      [
        ...Array.from({ length: MAX_EVENT_DETAIL_ENTRIES }, () => ({
          context: { shopId: SHOP_ID },
          error: { code: "invalid_cart" },
        })),
        { error: { code: "cart_expired" } },
      ],
      aggregate(),
      undefined,
    );
    expect(history.snapshot.entries).toHaveLength(1);
    expect(history.snapshot.entries[0]?.status).toBe("50 invalid_cart · 1 cart_expired");
    expect(JSON.parse(history.snapshot.entries[0]!.detail)).toMatchObject({
      entryCount: 51,
      additionalEntryCount: 1,
    });
    expect(history.snapshot.phase).toBe("failed");
  });

  it("shares shop aliases with other views until the presentation resets", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    expect(history.labelFor(SHOP_ID)).toBe("Shop 1");
    expect(history.labelFor("other-private-shop")).toBe("Shop 2");
    history.receive("start", [resourceEntry()], aggregate(), undefined);
    expect(history.snapshot.entries[0]?.label).toBe("Shop 1");
    history.clear();
    expect(history.labelFor("other-private-shop")).toBe("Shop 2");
    expect(history.labelFor(undefined)).toBe("Unknown shop");
    history.beginPresentation();
    expect(history.labelFor("other-private-shop")).toBe("Shop 1");
    expect(history.labelFor(SHOP_ID)).toBe("Shop 2");
  });
});

describe("per-shop completion", () => {
  it.each(["active", "failed", "completed"])(
    "waits for a sibling's completion event when its resource status is %s",
    (status) => {
      const history = new UniversalEventHistory();
      history.beginPresentation();
      const first = resourceEntry("completed");
      const second = {
        context: { ...first.context, shopId: "second-synthetic-shop", status },
        checkout: checkout(status === "completed" ? "completed" : "complete_in_progress"),
      };
      const current = {
        ...aggregate(),
        resources: [first, second].map(({ context, checkout: snapshot }) => ({
          shopId: context.shopId,
          checkout: snapshot,
        })),
      };
      Object.assign(current.resources[1]!, { status });
      history.receive("start", [first, second], current, undefined);
      history.receive("complete", [first], current, undefined);
      expect(history.snapshot.phase).toBe("active");
      expect(history.snapshot.notice).not.toContain("All received shops");

      // Clearing visible history must not discard the first shop's completion.
      history.clear();
      history.receive("complete", [second], current, undefined);
      expect(history.snapshot.phase).toBe("complete");

      history.beginPresentation();
      history.receive("start", [first, second], current, undefined);
      history.receive("complete", [second], current, undefined);
      expect(history.snapshot.phase).toBe("active");
    },
  );

  it("does not report session completion when closing after only one shop completes", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const current = aggregate("completed");
    current.resources.push({ id: "second-checkout", shopId: "second-shop", checkout: checkout() });
    history.receive("complete", [resourceEntry("completed")], current, undefined);
    history.receive("close", undefined, current, undefined);
    expect(history.snapshot.notice).not.toContain("after completion");
  });

  it("waits for a shop beyond the display cap and records all members of a completion batch", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const entries = Array.from({ length: 52 }, (_, index) => ({
      context: { shopId: `synthetic-shop-${index}` },
      checkout: checkout("completed"),
    }));
    const current = {
      resources: entries.map(({ context, checkout: snapshot }) => ({
        shopId: context.shopId,
        checkout: snapshot,
      })),
    };
    history.receive("complete", entries.slice(0, 51), current, undefined);
    expect(history.snapshot.resources).toHaveLength(50);
    expect(history.snapshot.phase).toBe("active");
    history.receive("complete", [entries[51]], current, undefined);
    expect(history.snapshot.phase).toBe("complete");
  });
});

describe("Universal resource status display", () => {
  function receive(
    history: UniversalEventHistory,
    status: unknown,
    childStatus = "complete_in_progress",
    name: "start" | "update" | "complete" = "update",
  ) {
    const entry = resourceEntry(childStatus);
    const current = aggregate(childStatus);
    history.receive(
      name,
      [{ ...entry, context: { ...entry.context, status } }],
      {
        ...current,
        resources: current.resources.map((resource) => ({ ...resource, status })),
      },
      undefined,
    );
  }

  it("shows retryable failure and recovery without replacing the child snapshot status", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    receive(history, "active", "complete_in_progress", "start");
    receive(history, "failed");
    expect(history.snapshot.entries.at(-1)?.status).toBe("failed");
    expect(history.snapshot.entries.at(-1)?.detail).toContain('"status": "complete_in_progress"');
    expect(history.snapshot.resources[0]).toMatchObject({
      status: "failed",
      checkoutStatus: "complete_in_progress",
      resourceStatus: "failed",
    });
    expect(history.snapshot.phase).toBe("active");
    expect(history.snapshot.errors).toEqual([]);

    receive(history, "active");
    expect(history.snapshot.resources[0]?.status).toBe("complete_in_progress");
    receive(history, "failed");
    receive(history, undefined);
    expect(history.snapshot.resources[0]?.status).toBe("complete_in_progress");
    expect(history.snapshot.resources[0]?.resourceStatus).toBeUndefined();
  });

  it("keeps pre-start ejection visible without claiming completion and accepts a later active shop", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    receive(history, "ejected", "incomplete");
    expect(history.snapshot.phase).toBe("inactive");
    expect(history.snapshot.notice).toContain("No completion event");
    expect(history.snapshot.entries.map((entry) => entry.name)).toEqual(["update"]);
    expect(history.snapshot.resources[0]).toMatchObject({
      status: "ejected",
      checkoutStatus: "incomplete",
    });

    const second = {
      context: {
        sessionId: SESSION_ID,
        revision: 2,
        shopId: "second-synthetic-shop",
        status: "active",
      },
      checkout: checkout("ready_for_complete"),
    };
    history.receive(
      "start",
      [second],
      {
        ...aggregate(),
        resources: [
          { ...aggregate().resources[0]!, status: "ejected" },
          {
            id: "second-checkout",
            shopId: second.context.shopId,
            status: "active",
            checkout: second.checkout,
          },
        ],
      },
      undefined,
    );
    expect(history.snapshot.phase).toBe("active");
    expect(history.snapshot.resources.map((resource) => resource.status)).toEqual([
      "ejected",
      "ready_for_complete",
    ]);
  });

  it("keeps ejected and completed shops distinct in final completion", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const first = {
      ...resourceEntry(),
      context: { ...resourceEntry().context, status: "ejected" },
    };
    const second = {
      context: {
        sessionId: SESSION_ID,
        revision: 1,
        shopId: "second-synthetic-shop",
        status: "active",
      },
      checkout: checkout("completed"),
    };
    history.receive(
      "complete",
      [first, second],
      {
        ...aggregate(),
        resources: [
          { ...aggregate().resources[0]!, status: "ejected" },
          {
            id: "second-checkout",
            shopId: second.context.shopId,
            status: "active",
            checkout: second.checkout,
          },
        ],
      },
      {
        sessionId: SESSION_ID,
        errors: [{ shopId: SHOP_ID, error: { code: "invalid_cart" } }],
      },
    );
    expect(history.snapshot.errors).toEqual([{ resourceLabel: "Shop 1", code: "invalid_cart" }]);
    expect(history.snapshot.phase).toBe("complete");
    expect(history.snapshot.resources.map((resource) => resource.status)).toEqual([
      "ejected",
      "completed",
    ]);
    expect(history.snapshot.entries).toHaveLength(1);
    expect(history.snapshot.entries[0]?.status).toBe("1 ejected · 1 completed");
    expect(JSON.parse(history.snapshot.entries[0]!.detail)).toMatchObject({
      event: "complete",
      entryCount: 2,
      entries: [
        { context: { shopId: "Shop 1", status: "ejected" }, checkout: { status: "incomplete" } },
        { context: { shopId: "Shop 2", status: "active" }, checkout: { status: "completed" } },
      ],
    });
  });

  it("redacts unrecognized facade statuses", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    receive(history, PRIVATE_EMAIL);
    expect(history.snapshot.entries[0]?.status).toBe("unknown");
    expect(history.snapshot.resources[0]?.resourceStatus).toBe("unknown");
    expect(JSON.stringify(history.snapshot)).not.toContain(PRIVATE_EMAIL);
  });
});

describe("stable SDK error codes", () => {
  it("preserves unsupported-browser guidance while redacting its message", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const failure = {
      error: { code: "unsupported_browser", message: "sensitive detail" },
    };
    history.receive("error", [failure], undefined, { errors: [failure] });
    expect(history.snapshot.entries.at(-1)?.detail).toContain("unsupported_browser");
    expect(history.snapshot.errors[0]?.code).toBe("unsupported_browser");
    expect(JSON.stringify(history.snapshot)).not.toContain("sensitive detail");
  });
});

describe("large resource aggregates", () => {
  it("keeps hidden active resources in the lifecycle decision", () => {
    const history = new UniversalEventHistory();
    history.beginPresentation();
    const resources = Array.from({ length: 51 }, (_, index) => ({
      shopId: `synthetic-${index}`,
      status: index === 50 ? "active" : "ejected",
      checkout: checkout(),
    }));
    const detail = [
      { context: { shopId: "synthetic-0", status: "ejected" }, checkout: checkout() },
    ];
    history.receive("update", detail, { resources }, undefined);
    expect(history.snapshot.resources).toHaveLength(50);
    expect(history.snapshot.phase).toBe("active");
    history.receive("update", detail, undefined, undefined);
    expect(history.snapshot.phase).toBe("active");
    resources[50]!.status = "ejected";
    history.receive("update", detail, { resources }, undefined);
    expect(history.snapshot.phase).toBe("inactive");
    resources[50]!.status = "active";
    history.receive("update", detail, { resources }, undefined);
    expect(history.snapshot.phase).toBe("active");
  });
});
