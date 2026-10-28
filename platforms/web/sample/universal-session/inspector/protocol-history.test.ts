import { describe, expect, it, vi } from "vitest";

import {
  MAX_PROTOCOL_ENTRIES,
  MAX_PROTOCOL_MEMBERS,
  MAX_PROTOCOL_SOURCE_LABELS,
  UniversalProtocolHistory,
} from "./protocol-history";

const SECRET = "private-payload-123";
const SHOP_A = "gid://shopify/Shop/synthetic-a";
const SHOP_B = "gid://shopify/Shop/synthetic-b";
const labelFor = (value: unknown): string =>
  value === SHOP_A ? "Shop 1" : value === SHOP_B ? "Shop 2" : "Unknown shop";
const now = () => new Date("2026-10-02T12:00:00Z");
const resource = (method = "ec.update", shop = SHOP_A, status = "active") => ({
  jsonrpc: "2.0",
  method,
  params: {
    context: { session_id: SECRET, shop_id: shop, revision: 3, status },
    checkout: {
      id: SECRET,
      status: "complete_in_progress",
      currency: "CAD",
      line_items: [{ id: SECRET }],
      order: undefined,
      fulfillment: { address: SECRET },
      buyer: { email: SECRET },
      payment: { card: SECRET },
      continue_url: `https://example.com/${SECRET}`,
    },
  },
});

describe("UniversalProtocolHistory", () => {
  it("keeps one entry per incoming batch and preserves ordered members and shared shop labels", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    const first = resource("ec.update", SHOP_B, "ejected");
    const second = resource("ec.update", SHOP_A, "failed");
    expect(history.receive([first, second])).toBe(true);
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      name: "ec.update",
      label: "2 members",
      status: "ejected · failed",
    });
    const detail = JSON.parse(history.entries[0]!.detail);
    expect(detail).toMatchObject({
      transport: "batch",
      memberCount: 2,
      members: [
        {
          index: 0,
          method: "ec.update",
          params: { context: { shop_id: "Shop 2", status: "ejected", revision: 3 } },
        },
        {
          index: 1,
          method: "ec.update",
          params: { context: { shop_id: "Shop 1", status: "failed", revision: 3 } },
        },
      ],
    });
  });

  it("shows ordered distinct status types and bounds long summaries", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive([
      resource("ec.update", SHOP_A, "ejected"),
      resource("ec.update", SHOP_A, "failed"),
      resource("ec.update", SHOP_A, "ejected"),
      resource(),
      { jsonrpc: "2.0", method: "ec.ready" },
      { jsonrpc: "2.0", method: "ec.unsupported" },
    ]);
    expect(history.entries[0]!.status).toBe(
      "ejected · failed · complete_in_progress · received · +1 status types",
    );
  });

  it("distinguishes a mixed request/notification batch without retaining request IDs", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive([
      { jsonrpc: "2.0", id: SECRET, method: "ec.ready", params: { secret: SECRET } },
      resource("ec.start"),
    ]);
    expect(history.entries[0]).toMatchObject({ name: "mixed batch", label: "2 members" });
    const detail = JSON.parse(history.entries[0]!.detail);
    expect(detail.members[0]).toMatchObject({ method: "ec.ready", id: "present", kind: "request" });
    expect(detail.members[1]).toMatchObject({
      method: "ec.start",
      id: "absent",
      kind: "notification",
    });
    expect(history.entries[0]!.detail).not.toContain(SECRET);
  });

  it("projects checkout fields and retains no IDs, URLs, buyer data or raw object references", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    const incoming = resource();
    history.receive(incoming);
    incoming.params.checkout.status = "completed";
    expect(JSON.parse(history.entries[0]!.detail).members[0].params.checkout).toEqual({
      status: "complete_in_progress",
      currency: "CAD",
      lineItemCount: 1,
      order: "absent",
      fulfillment: "present",
    });
    const output = JSON.stringify(history.entries);
    for (const value of [SECRET, SHOP_A, "example.com", "email", "payment"])
      expect(output).not.toContain(value);
  });

  it("shows ejected and failed status without inventing an error or removal cause", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    for (const status of ["ejected", "failed", "active"])
      history.receive([resource("ec.update", SHOP_A, status)]);
    expect(history.entries.map((entry) => entry.status)).toEqual([
      "ejected",
      "failed",
      "complete_in_progress",
    ]);
    expect(history.entries[0]!.detail).not.toContain('"error"');
    expect(history.entries[0]!.detail).not.toContain("external");
  });

  it.each([
    "session_error",
    "currency_mismatch",
    "incompatible_flow",
    "iframe_unload",
    "unrecognized_data",
    "payment_failed",
    "cart_expired",
  ])("shows the actual ECP error code %s while redacting content and recovery URLs", (code) => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive({
      jsonrpc: "2.0",
      method: "ec.error",
      params: {
        context: { session_id: SECRET, shop_id: SHOP_A, revision: 4 },
        error: {
          ucp: { status: "error", version: SECRET },
          continue_url: `https://example.com/${SECRET}`,
          messages: [
            { type: "error", code, severity: "unrecoverable", content: SECRET, path: SECRET },
          ],
        },
      },
    });
    expect(history.entries[0]!.status).toBe(`error · ${code}`);
    expect(JSON.parse(history.entries[0]!.detail).members[0].params.error.messages[0]).toEqual({
      type: "error",
      code,
      severity: "unrecoverable",
      content: "[redacted]",
    });
    expect(history.entries[0]!.detail).not.toContain(SECRET);
  });

  it.each([
    {
      name: "session error with no shop",
      context: { scope: "session" },
      expected: { scope: "session" },
      aliasCalls: 0,
    },
    {
      name: "session error with an undefined shop",
      context: { scope: "session", shop_id: undefined },
      expected: { scope: "session" },
      aliasCalls: 0,
    },
    {
      name: "resource context without an explicit scope",
      context: { shop_id: SHOP_A },
      expected: { shop_id: "Shop 1" },
      aliasCalls: 1,
    },
    {
      name: "resource context with an explicit scope",
      context: { scope: "resource", shop_id: SHOP_A },
      expected: { scope: "resource", shop_id: "Shop 1" },
      aliasCalls: 1,
    },
    {
      name: "supplied shop alongside session scope",
      context: { scope: "session", shop_id: SHOP_B },
      expected: { scope: "session", shop_id: "Shop 2" },
      aliasCalls: 1,
    },
    {
      name: "unrecognized scope with no shop",
      context: { scope: SECRET },
      expected: { scope: "unknown" },
      aliasCalls: 0,
    },
  ])("preserves the wire distinction for $name", ({ context, expected, aliasCalls }) => {
    const labels = vi.fn(labelFor);
    const history = new UniversalProtocolHistory(labels, now);
    history.receive({
      jsonrpc: "2.0",
      method: "ec.error",
      params: {
        context: { session_id: SECRET, revision: 4, ...context },
        error: { messages: [{ code: "session_error" }] },
      },
    });
    expect(JSON.parse(history.entries[0]!.detail).members[0].params.context).toEqual({
      ...expected,
      session_id: "[redacted]",
      revision: 4,
    });
    expect(labels).toHaveBeenCalledTimes(aliasCalls);
    for (const value of [SECRET, SHOP_A, SHOP_B]) {
      expect(history.entries[0]!.detail).not.toContain(value);
    }
  });

  it("redacts arbitrary error codes, methods, statuses and malformed field values", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive([
      {
        ...resource(),
        params: {
          context: { status: SECRET, revision: SECRET },
          checkout: { status: SECRET, currency: SECRET, line_items: SECRET },
          error: { messages: [{ code: SECRET, type: SECRET, severity: SECRET, content: SECRET }] },
        },
      },
      {
        jsonrpc: "2.0",
        method: `ec.${SECRET}`,
        params: {
          context: { shop_id: SECRET },
          checkout: { currency: "USD" },
          error: { messages: [{ code: "iframe_unload" }] },
        },
      },
      { jsonrpc: SECRET, method: "ec.start", params: { checkout: { status: SECRET } } },
      null,
    ]);
    const detail = JSON.parse(history.entries[0]!.detail);
    expect(detail.members.map((entry: { assessment: string }) => entry.assessment)).toEqual([
      "observed",
      "unsupported",
      "malformed",
      "malformed",
    ]);
    expect(detail.members[1].params).toBeUndefined();
    expect(history.entries[0]!.detail).not.toContain(SECRET);
    expect(history.entries[0]!.detail).not.toContain("iframe_unload");
  });

  it("ignores unrelated messages and standalone responses", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    for (const value of [
      undefined,
      null,
      1,
      "not JSON",
      { method: "analytics.event" },
      { jsonrpc: "2.0", id: SECRET, result: {} },
      [{ jsonrpc: "2.0", id: SECRET, error: {} }],
    ]) {
      expect(history.receive(value)).toBe(false);
    }
    expect(history.entries).toHaveLength(0);
  });

  it("identifies empty or malformed envelopes without claiming Kit accepted them", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive([]);
    history.receive({ jsonrpc: "2.0" });
    expect(history.entries.map((entry) => entry.status)).toEqual(["malformed", "malformed"]);
    expect(JSON.parse(history.entries[1]!.detail).members[0].assessment).toBe("malformed");
  });

  it("keeps null IDs as request presence and treats explicit undefined as absent", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive([
      { jsonrpc: "2.0", method: "ec.ready", id: null },
      { jsonrpc: "2.0", method: "ec.update", id: undefined },
    ]);
    expect(
      JSON.parse(history.entries[0]!.detail).members.map((entry: { id: string }) => entry.id),
    ).toEqual(["present", "absent"]);
  });

  it("accepts bounded JSON-string messages and does not retain the original string", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    expect(history.receive(JSON.stringify([resource()]))).toBe(true);
    expect(JSON.parse(history.entries[0]!.detail).encoding).toBe("JSON string");
    expect(history.receive(" ".repeat(262_145))).toBe(false);
    expect(history.entries[0]!.detail).not.toContain(SECRET);
  });

  it("bounds entries, batch members and error messages and labels truncation", () => {
    const labels = vi.fn(labelFor);
    const history = new UniversalProtocolHistory(labels, now);
    const error = {
      jsonrpc: "2.0",
      method: "ec.error",
      params: {
        error: {
          messages: Array.from({ length: 25 }, () => ({ code: "iframe_unload", content: SECRET })),
        },
      },
    };
    for (let index = 0; index < MAX_PROTOCOL_ENTRIES + 3; index += 1) history.receive([resource()]);
    expect(history.entries).toHaveLength(MAX_PROTOCOL_ENTRIES);
    expect(history.entries[0]!.id).toBe(4);
    labels.mockClear();
    history.receive(Array.from({ length: MAX_PROTOCOL_MEMBERS + 8 }, () => resource()));
    const last = history.entries[history.entries.length - 1]!;
    expect(labels).toHaveBeenCalledTimes(MAX_PROTOCOL_MEMBERS);
    expect(last.label).toBe("58 members · truncated");
    expect(JSON.parse(last.detail)).toMatchObject({ memberCount: 58, additionalMemberCount: 8 });
    expect(JSON.parse(last.detail).members).toHaveLength(MAX_PROTOCOL_MEMBERS);
    history.receive(error);
    const projected = JSON.parse(history.entries[history.entries.length - 1]!.detail).members[0]
      .params.error;
    expect(projected.messages).toHaveLength(10);
    expect(projected.additionalMessageCount).toBe(15);
  });

  it("clears entries while retaining monotonically increasing display IDs", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    history.receive(resource());
    history.clear();
    expect(history.entries).toEqual([]);
    history.receive(resource());
    expect(history.entries[0]!.id).toBe(2);
  });

  it("labels observed windows with bounded numeric aliases only", () => {
    const history = new UniversalProtocolHistory(labelFor, now);
    for (const sourceIndex of [1, 2, MAX_PROTOCOL_SOURCE_LABELS, 0]) {
      history.receive(resource(), sourceIndex);
    }
    expect(history.entries.map((entry) => entry.label)).toEqual([
      "Window 1 · 1 member",
      "Window 2 · 1 member",
      `Window ${MAX_PROTOCOL_SOURCE_LABELS} · 1 member`,
      "Additional window · 1 member",
    ]);
    expect(JSON.parse(history.entries[0]!.detail).source).toBe("Window 1");
    for (const sourceIndex of [
      MAX_PROTOCOL_SOURCE_LABELS + 1,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      SECRET as unknown as number,
    ]) {
      history.receive(resource(), sourceIndex);
      expect(history.entries.at(-1)?.label).toBe("Unknown window · 1 member");
    }
    expect(JSON.stringify(history.entries)).not.toContain(SECRET);
  });
});
