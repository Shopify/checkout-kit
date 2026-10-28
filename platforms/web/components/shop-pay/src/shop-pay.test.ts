import "./register";
import { afterEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../package.json";

import provisionalBatches from "../test/fixtures/shop-pay-batches.json";
import { ShopifyCheckout } from "@shopify/checkout-kit-checkout";
import { mockTelemetry } from "@shopify/checkout-kit-core/checkout/testing";
import * as universal from "./shop-pay";
import type { ShopPay, ShopPayResourceEventDetail } from "./shop-pay";

const UC_SRC = "https://shop.example.com/checkouts/uc/abc123?key=k";
const CN_SRC = "https://shop.example.com/checkouts/cn/abc123?key=k";
const SESSION_ID = "gid://shopify/UniversalCheckoutSession/123";
const FIRST_SHOP_ID = "gid://shopify/Shop/123";
const SECOND_SHOP_ID = "gid://shopify/Shop/456";

interface WireResourceParams {
  readonly context: { session_id: string; revision: number; shop_id: string; status?: string };
  readonly checkout: {
    readonly id: string;
    readonly line_items: unknown;
    readonly order?: { id: string; permalink_url: string };
    readonly [key: string]: unknown;
  };
}

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

function publicContext({ context }: Pick<WireResourceParams, "context">) {
  return {
    sessionId: context.session_id,
    revision: context.revision,
    shopId: context.shop_id,
    ...(context.status !== undefined && { status: context.status }),
  };
}

/** The public projection of a fixture checkout: camelCase keys, no top-level `ucp`. */
function publicSnapshot(checkout: WireResourceParams["checkout"]) {
  const { ucp: _, line_items: lineItems, order, ...snapshot } = checkout;
  return {
    ...snapshot,
    lineItems,
    ...(order && { order: { id: order.id, permalinkUrl: order.permalink_url } }),
  };
}

function resourceDetail(params: WireResourceParams) {
  return { context: publicContext(params), checkout: publicSnapshot(params.checkout) };
}

function createMockWindow() {
  return {
    addEventListener: vi.fn(),
    close: vi.fn(),
    closed: false,
    focus: vi.fn(),
    postMessage: vi.fn(),
  } as unknown as Window;
}

function renderShopPay(attributes: Record<string, string> = {}): ShopPay {
  const checkout = document.createElement("shop-pay");
  checkout.setAttribute("src", UC_SRC);
  for (const [key, value] of Object.entries(attributes)) {
    checkout.setAttribute(key, value);
  }
  document.body.appendChild(checkout);
  return checkout;
}

function openPopupShopPay(attributes: Record<string, string> = {}) {
  const checkout = renderShopPay({ target: "popup", ...attributes });
  const mockCheckoutWindow = createMockWindow();
  const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(mockCheckoutWindow);
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
  checkout.open();
  return {
    checkout,
    mockCheckoutWindow,
    windowOpenSpy,
    send: (batch: unknown, options?: { source?: MessageEventSource | null; origin?: string }) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: batch,
          origin: options?.origin ?? new URL(checkout.src).origin,
          source: options && "source" in options ? options.source : mockCheckoutWindow,
        }),
      ),
  };
}

function startSession() {
  const opened = openPopupShopPay();
  opened.send(provisionalBatches.start);
  return opened;
}

describe("@shopify/checkout-kit-shop-pay/register", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("exports and registers a concrete sibling of ShopifyCheckout", () => {
    expect(customElements.get("shop-pay")).toBe(universal.ShopPay);
    expect(ShopifyCheckout.prototype.isPrototypeOf(universal.ShopPay.prototype)).toBe(false);
    expect(Object.getPrototypeOf(universal.ShopPay.prototype)).toBe(
      Object.getPrototypeOf(ShopifyCheckout.prototype),
    );
  });

  it("negotiates the provisional Universal Checkout protocol version", () => {
    const { windowOpenSpy } = openPopupShopPay();

    const openedUrl = new URL(windowOpenSpy.mock.calls[0]![0] as string);
    expect(openedUrl.searchParams.get("ec_version")).toBe("2026-08-25");
    expect(openedUrl.searchParams.get("ec_delegate")).toBe("window.open");
    expect(openedUrl.searchParams.get("ck_version")).toBe(version);
  });

  it("replaces stale protocol options and keeps the session URL's other options", () => {
    const { windowOpenSpy } = openPopupShopPay({
      src: `${UC_SRC}&ec_version=old&ec_delegate=old&ec_auth=old&ec_color_scheme=old&ck_branding=old&ck_version=old`,
    });

    const openedUrl = new URL(windowOpenSpy.mock.calls[0]![0] as string);
    expect(openedUrl.searchParams.getAll("ec_version")).toEqual(["2026-08-25"]);
    expect(openedUrl.searchParams.getAll("ec_delegate")).toEqual(["window.open"]);
    expect(openedUrl.searchParams.has("ec_auth")).toBe(false);
    expect(openedUrl.searchParams.getAll("ck_version")).toEqual([version]);
    // The element requests no appearance: the protocol drops its colour scheme
    // parameter and the session URL's other options are used as given.
    expect(openedUrl.searchParams.has("ec_color_scheme")).toBe(false);
    expect(openedUrl.searchParams.get("ck_branding")).toBe("old");
    expect(openedUrl.searchParams.get("key")).toBe("k");
  });

  it("answers a ready request batch with one matching response batch", () => {
    const { checkout, mockCheckoutWindow, send } = openPopupShopPay();

    send(provisionalBatches.ready.request);

    expect(mockCheckoutWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      provisionalBatches.ready.response,
      new URL(checkout.src).origin,
    );
  });

  describe("when the browser blocks the checkout window", () => {
    function openBlocked(attributes: Record<string, string> = {}) {
      const checkout = renderShopPay({ target: "popup", ...attributes });
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const showModal = vi
        .spyOn(HTMLDialogElement.prototype, "showModal")
        .mockImplementation(function (this: HTMLDialogElement) {
          this.setAttribute("open", "");
        });
      return { checkout, openSpy, showModal };
    }

    it("dispatches blocked, not error, and records a retryable block", () => {
      const errorMetricSpy = vi.spyOn(mockTelemetry(), "recordError");
      const { checkout } = openBlocked();
      const blocked = vi.fn();
      const error = vi.fn();
      const documentBlocked = vi.fn();
      checkout.addEventListener("blocked", blocked);
      checkout.addEventListener("error", error);
      document.addEventListener("blocked", documentBlocked);

      try {
        checkout.open();
      } finally {
        document.removeEventListener("blocked", documentBlocked);
      }

      expect(blocked).toHaveBeenCalledOnce();
      expect(blocked.mock.calls[0]![0]).toBeInstanceOf(universal.ShopPayBlockedEvent);
      expect(blocked.mock.calls[0]![0].detail).toStrictEqual({ code: "popup_blocked" });
      expect(documentBlocked).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(errorMetricSpy).toHaveBeenCalledExactlyOnceWith({
        category: "navigation",
        stage: "presentation",
        code: "blocked",
        retryable: true,
        isRetry: false,
      });
    });

    it("shows the blocked overlay and warns", () => {
      const { checkout, showModal } = openBlocked({ "log-level": "warn" });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
      expect(showModal).toHaveBeenCalledOnce();
      expect(dialog.dataset.state).toBe("blocked");
      expect(warn).toHaveBeenCalledWith(
        "<shop-pay>: checkout window could not be opened; the browser may have blocked it",
      );
    });

    it("opens checkout from the overlay's retry button without dispatching close", () => {
      const { checkout, openSpy } = openBlocked();
      const popup = createMockWindow();
      openSpy.mockReturnValueOnce(null).mockReturnValueOnce(popup);
      const close = vi.fn();
      checkout.addEventListener("close", close);

      checkout.open();
      checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-retry-button")!.click();

      const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
      expect(openSpy).toHaveBeenCalledTimes(2);
      expect(dialog.dataset.state).toBeUndefined();
      expect(close).not.toHaveBeenCalled();
      expect(popup.close).not.toHaveBeenCalled();
    });

    it("records a retry when the window is blocked again", () => {
      const errorMetricSpy = vi.spyOn(mockTelemetry(), "recordError");
      const { checkout } = openBlocked();

      checkout.open();
      checkout.open();

      expect(errorMetricSpy).toHaveBeenLastCalledWith({
        category: "navigation",
        stage: "presentation",
        code: "blocked",
        retryable: true,
        isRetry: true,
      });
    });

    it("ignores open() called from a blocked listener", () => {
      const { checkout, openSpy } = openBlocked({ "log-level": "warn" });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const blocked = vi.fn(() => checkout.open());
      checkout.addEventListener("blocked", blocked);

      checkout.open();

      expect(openSpy).toHaveBeenCalledOnce();
      expect(blocked).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith(
        "<shop-pay>: open() is ignored in a blocked listener; use a user action",
      );
    });

    it("dispatches close when the blocked overlay is dismissed", () => {
      const { checkout } = openBlocked();
      const close = vi.fn();
      checkout.addEventListener("close", close);

      checkout.open();
      checkout
        .shadowRoot!.querySelector<HTMLButtonElement>("#overlay-blocked-close-button")!
        .click();

      expect(close).toHaveBeenCalledOnce();
    });
  });

  it("dispatches one start event for a contiguous batch", () => {
    const { checkout, send } = openPopupShopPay();
    send(provisionalBatches.ready.request);
    const startSpy = vi.fn();
    const wireEventSpy = vi.fn();
    checkout.addEventListener("start", startSpy);
    (checkout as HTMLElement).addEventListener("ec.start", wireEventSpy);

    send(provisionalBatches.start);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual(
      provisionalBatches.start.map(({ params }) => resourceDetail(params)),
    );
    expect(wireEventSpy).not.toHaveBeenCalled();
  });

  it("omits only top-level protocol metadata from checkout snapshots", () => {
    const { checkout, send } = openPopupShopPay();
    const start = clone(provisionalBatches.start[0]!);
    Object.assign(start.params.checkout, { extensions: { ucp: { merchant_value: true } } });
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([start]);

    const snapshot = startSpy.mock.calls[0]![0].detail[0].checkout;
    expect(snapshot).not.toHaveProperty("ucp");
    expect(snapshot.extensions).toEqual({ ucp: { merchant_value: true } });
  });

  it("dispatches update only for checkouts whose snapshot changed", () => {
    const { checkout, send } = startSession();
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);

    send(provisionalBatches.update);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(provisionalBatches.update[0]!.params),
    ]);
  });

  it("ignores unsupported notifications and suppresses unchanged snapshots", () => {
    const { checkout, send } = startSession();
    const update = provisionalBatches.update[0]!;
    const totalsChange = { ...clone(update), method: "ec.totals.change" };
    const metadataOnlyChange = {
      ...clone(provisionalBatches.start[1]!),
      method: "ec.messages.change",
    };
    metadataOnlyChange.params.context.revision = 2;
    metadataOnlyChange.params.checkout.ucp.capabilities = { discount: [] };
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);

    send([update, totalsChange, metadataOnlyChange, clone(update)]);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(update.params)]);
  });

  it("reports status-only failure and recovery without changing the child checkout status", () => {
    const { checkout, send } = openPopupShopPay();
    const start = provisionalBatches.start.map((entry) => ({
      ...clone(entry),
      params: {
        ...clone(entry.params),
        context: { ...entry.params.context, status: "active" },
      },
    }));
    send(start);
    const updateSpy = vi.fn();
    const errorSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);
    checkout.addEventListener("error", errorSpy);

    const update = { ...clone(start[0]!), method: "ec.update" };
    update.params.context.status = "failed";
    update.params.context.revision = 2;
    send([update]);
    update.params.context.status = "active";
    update.params.context.revision = 3;
    send([update]);
    update.params.context.revision = 4;
    send([update]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy.mock.calls.map(([event]) => event.detail[0].context.status)).toEqual([
      "failed",
      "active",
    ]);
    expect(updateSpy.mock.calls.map(([event]) => event.detail[0].checkout.status)).toEqual([
      "incomplete",
      "incomplete",
    ]);
    expect(
      updateSpy.mock.calls.map(([event]) =>
        event.detail.map(({ context }: { context: { shopId: string } }) => context.shopId),
      ),
    ).toEqual([[FIRST_SHOP_ID], [FIRST_SHOP_ID]]);
    expect(Object.isFrozen(updateSpy.mock.calls[0]![0].detail[0].context)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each(["omitted", "undefined"] as const)(
    "clears the previous resource status when the next snapshot's status is %s",
    (kind) => {
      const { checkout, send } = startSession();
      const failed = {
        ...clone(provisionalBatches.start[0]!),
        method: "ec.update",
        params: {
          ...clone(provisionalBatches.start[0]!.params),
          context: {
            ...provisionalBatches.start[0]!.params.context,
            revision: 2,
            status: "failed",
          },
        },
      };
      send([failed]);
      const updateSpy = vi.fn();
      checkout.addEventListener("update", updateSpy);
      const recovered = { ...clone(provisionalBatches.start[0]!), method: "ec.update" };
      recovered.params.context.revision = 3;
      if (kind === "undefined") Object.assign(recovered.params.context, { status: undefined });

      send([recovered]);

      expect(updateSpy).toHaveBeenCalledOnce();
      expect(updateSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(recovered.params)]);
      expect(updateSpy.mock.calls[0]![0].detail[0].context).not.toHaveProperty("status");
      expect(updateSpy.mock.calls[0]![0].detail[0].checkout.status).toBe("incomplete");
    },
  );

  it("preserves status changes within a batch as one update", () => {
    const { checkout, send } = startSession();
    const updates = ["failed", "active", "failed"].map((status) => ({
      ...clone(provisionalBatches.start[0]!),
      method: "ec.update",
      params: {
        ...clone(provisionalBatches.start[0]!.params),
        context: { ...provisionalBatches.start[0]!.params.context, revision: 2, status },
      },
    }));
    const observed: unknown[] = [];
    checkout.addEventListener("update", ({ detail }) => {
      observed.push(detail.map(({ context }) => context.status));
    });

    send(updates);

    expect(observed).toEqual([["failed", "active", "failed"]]);
  });

  it("accepts an ejection and its error before the healthy shop starts", () => {
    const { checkout, send } = openPopupShopPay();
    const ejected = {
      ...clone(provisionalBatches.start[0]!),
      method: "ec.update",
      params: {
        ...clone(provisionalBatches.start[0]!.params),
        context: { ...provisionalBatches.start[0]!.params.context, status: "ejected" },
      },
    };
    const error = clone(provisionalBatches.error[0]!);
    error.params.context.revision = 2;
    const start = clone(provisionalBatches.start[1]!);
    start.params.context.revision = 3;
    const events: string[] = [];
    checkout.addEventListener("update", () => events.push("update"));
    checkout.addEventListener("error", () => events.push("error"));
    checkout.addEventListener("start", () => events.push("start"));
    checkout.addEventListener("complete", () => events.push("complete"));

    send(provisionalBatches.ready.request);
    send([ejected]);
    send([error]);
    send([start]);

    expect(events).toEqual(["update", "error", "start"]);
  });

  it("accepts a shop's first snapshot through an update after another shop started", () => {
    const { checkout, send } = openPopupShopPay();
    send([provisionalBatches.start[0]]);
    const update = { ...clone(provisionalBatches.start[1]!), method: "ec.update" };
    update.params.context.revision = 2;
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);

    send([update]);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(update.params)]);
  });

  it.each([false, true])(
    "does not infer completion when every shop is ejected (started=%s)",
    (started) => {
      const { checkout, send } = openPopupShopPay();
      const startSpy = vi.fn();
      const updateSpy = vi.fn();
      const completeSpy = vi.fn();
      checkout.addEventListener("start", startSpy);
      checkout.addEventListener("update", updateSpy);
      checkout.addEventListener("complete", completeSpy);
      send(provisionalBatches.ready.request);
      if (started) send(provisionalBatches.start);
      const ejected = provisionalBatches.start.map((entry) => ({
        ...clone(entry),
        method: "ec.update",
        params: {
          ...clone(entry.params),
          context: { ...entry.params.context, revision: 2, status: "ejected" },
        },
      }));

      send(ejected);

      expect(startSpy).toHaveBeenCalledTimes(started ? 1 : 0);
      expect(updateSpy).toHaveBeenCalledOnce();
      expect(
        updateSpy.mock.calls[0]![0].detail.map(
          ({ context }: { context: { status?: string } }) => context.status,
        ),
      ).toEqual(["ejected", "ejected"]);
      expect(completeSpy).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    "does not complete from only ejected resources and allows a new checkout (resource errors=%s)",
    (withErrors) => {
      const { checkout, send } = startSession();
      const ejected = provisionalBatches.start.map((entry) => ({
        ...clone(entry),
        method: "ec.update",
        params: {
          ...clone(entry.params),
          context: { ...entry.params.context, revision: 2, status: "ejected" },
        },
      }));
      send(ejected);
      if (withErrors) {
        send(
          provisionalBatches.error.map((entry) => ({
            ...clone(entry),
            params: {
              ...clone(entry.params),
              context: { ...entry.params.context, revision: 3 },
            },
          })),
        );
      }
      const completeSpy = vi.fn();
      const startSpy = vi.fn();
      const updateSpy = vi.fn();
      const errorSpy = vi.fn();
      checkout.addEventListener("complete", completeSpy);
      checkout.addEventListener("start", startSpy);
      checkout.addEventListener("update", updateSpy);
      checkout.addEventListener("error", errorSpy);
      const legacyCompletion = ejected.map((entry) => ({
        ...clone(entry),
        method: "ec.complete",
        params: {
          ...clone(entry.params),
          context: { ...entry.params.context, revision: 4 },
        },
      }));

      send(legacyCompletion);
      send(legacyCompletion);

      expect(completeSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();

      const recovery = clone(provisionalBatches.start[0]!);
      recovery.params.context.revision = 5;
      recovery.params.checkout.id = "replacement-checkout";
      send([recovery]);

      expect(startSpy).toHaveBeenCalledOnce();
      expect(startSpy.mock.calls[0]![0].detail[0].checkout.id).toBe("replacement-checkout");
    },
  );

  it("accepts unfamiliar resource statuses without exposing arbitrary incoming values", () => {
    const { checkout, send } = openPopupShopPay();
    const entry = clone(provisionalBatches.start[0]!);
    Object.assign(entry.params.context, { status: "synthetic-future-status" });
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([entry]);

    expect(startSpy.mock.calls[0]![0].detail[0].context.status).toBe("unknown");
    expect(startSpy.mock.calls[0]![0].detail[0].checkout.status).toBe("incomplete");
  });

  it("preserves a completed resource status", () => {
    const { checkout, send } = openPopupShopPay();
    const entry = clone(provisionalBatches.complete[0]!);
    Object.assign(entry.params.context, { status: "completed" });
    const completeSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);

    send([entry]);

    expect(completeSpy.mock.calls[0]![0].detail[0].context.status).toBe("completed");
  });

  it("rejects malformed resource statuses without losing valid siblings or exposing values", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupShopPay();
    const invalidValues = [null, false, 1, [], { privateValue: "synthetic-private-value" }];
    const invalidEntries = invalidValues.map((status) => {
      const entry = clone(provisionalBatches.start[0]!);
      Object.assign(entry.params.context, { status });
      return entry;
    });
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([...invalidEntries, provisionalBatches.start[1]]);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(provisionalBatches.start[1]!.params),
    ]);
    expect(errorLogSpy).toHaveBeenCalledTimes(invalidValues.length);
    for (const [message] of errorLogSpy.mock.calls) {
      expect(message).toContain("context.status invalid_type");
      expect(message).not.toContain("synthetic-private-value");
    }
    expect(decodeSpy).toHaveBeenCalledTimes(invalidValues.length);
    for (const [metric] of decodeSpy.mock.calls) {
      expect(metric).toEqual({ method: "ec.start", failureType: "params" });
    }
  });

  it("preserves A-B-A wire order across lifecycle events", () => {
    const { checkout, send } = openPopupShopPay();
    const firstStart = clone(provisionalBatches.start[0]!);
    const firstUpdate = clone(provisionalBatches.update[0]!);
    firstUpdate.params.context.revision = 1;
    const secondStart = clone(provisionalBatches.start[1]!);
    const observed: Array<{ type: string; shopIds: string[]; detailStatuses: string[] }> = [];
    const record = (event: { type: string; detail: ShopPayResourceEventDetail }) => {
      observed.push({
        type: event.type,
        shopIds: event.detail.map(({ context }) => context.shopId),
        detailStatuses: event.detail.map(({ checkout: snapshot }) => snapshot.status),
      });
    };
    checkout.addEventListener("start", record);
    checkout.addEventListener("update", record);

    send([firstStart, firstUpdate, secondStart]);

    expect(observed).toEqual([
      { type: "start", shopIds: [FIRST_SHOP_ID], detailStatuses: ["incomplete"] },
      { type: "update", shopIds: [FIRST_SHOP_ID], detailStatuses: ["ready_for_complete"] },
      { type: "start", shopIds: [SECOND_SHOP_ID], detailStatuses: ["incomplete"] },
    ]);
  });

  it("dispatches the explicit complete batch even when a completed update was unchanged", () => {
    const { checkout, send } = startSession();
    send([{ ...clone(provisionalBatches.complete[0]!), method: "ec.update" }]);
    const completeSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);

    send(provisionalBatches.complete);

    expect(completeSpy).toHaveBeenCalledOnce();
    expect(completeSpy.mock.calls[0]![0].detail).toEqual(
      provisionalBatches.complete.map(({ params }) => resourceDetail(params)),
    );
  });

  it("completes only the healthy shop after a sibling was ejected with an error", () => {
    const { checkout, send } = startSession();
    const ejected = {
      ...clone(provisionalBatches.start[0]!),
      method: "ec.update",
      params: {
        ...clone(provisionalBatches.start[0]!.params),
        context: {
          ...provisionalBatches.start[0]!.params.context,
          revision: 2,
          status: "ejected",
        },
      },
    };
    const error = clone(provisionalBatches.error[0]!);
    error.params.context.revision = 3;
    const completed = {
      ...clone(provisionalBatches.complete[1]!),
      params: {
        ...clone(provisionalBatches.complete[1]!.params),
        context: {
          ...provisionalBatches.complete[1]!.params.context,
          revision: 4,
          status: "active",
        },
      },
    };
    const events: string[] = [];
    checkout.addEventListener("update", () => events.push("update"));
    checkout.addEventListener("error", () => events.push("error"));
    const completeSpy = vi.fn(({ detail }: CustomEvent<ShopPayResourceEventDetail>) => {
      events.push("complete");
      expect(detail).toEqual([resourceDetail(completed.params)]);
    });
    checkout.addEventListener("complete", completeSpy);

    send([ejected]);
    send([error]);
    send([completed]);

    expect(events).toEqual(["update", "error", "complete"]);
    expect(completeSpy).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "tolerates earlier producers including ejected shops in completion (ejected first=%s)",
    (ejectedFirst) => {
      const { checkout, send } = startSession();
      const ejected = {
        ...clone(provisionalBatches.start[0]!),
        method: "ec.update",
        params: {
          ...clone(provisionalBatches.start[0]!.params),
          context: {
            ...provisionalBatches.start[0]!.params.context,
            revision: 2,
            status: "ejected",
          },
        },
      };
      const error = clone(provisionalBatches.error[0]!);
      error.params.context.revision = 3;
      send([ejected]);
      send([error]);
      const finalEjected = { ...clone(ejected), method: "ec.complete" };
      finalEjected.params.context.revision = 4;
      const completed = {
        ...clone(provisionalBatches.complete[1]!),
        params: {
          ...clone(provisionalBatches.complete[1]!.params),
          context: {
            ...provisionalBatches.complete[1]!.params.context,
            revision: 4,
            status: "active",
          },
        },
      };
      const batch = ejectedFirst ? [finalEjected, completed] : [completed, finalEjected];
      const completeSpy = vi.fn();
      checkout.addEventListener("complete", completeSpy);

      send(batch);
      send(batch);

      expect(completeSpy).toHaveBeenCalledOnce();
      expect(completeSpy.mock.calls[0]![0].detail).toEqual(
        batch.map(({ params }) => resourceDetail(params)),
      );
    },
  );

  it("keeps a shop quarantined when an ejected completion follows an error before its first snapshot", () => {
    const { checkout, send } = openPopupShopPay();
    const error = clone(provisionalBatches.error[0]!);
    error.params.context.revision = 1;
    const ejected = {
      ...clone(provisionalBatches.start[0]!),
      method: "ec.complete",
      params: {
        ...clone(provisionalBatches.start[0]!.params),
        context: { ...provisionalBatches.start[0]!.params.context, revision: 2, status: "ejected" },
      },
    };
    const completeSpy = vi.fn();
    const startSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);
    checkout.addEventListener("start", startSpy);

    send([error]);
    send([ejected]);

    expect(completeSpy).not.toHaveBeenCalled();

    const recovery = clone(provisionalBatches.start[0]!);
    recovery.params.context.revision = 3;
    send([recovery]);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(recovery.params)]);
  });

  it("keeps the failed checkout quarantined when its terminal error carries the first snapshot", () => {
    const { checkout, send } = openPopupShopPay();
    const failedCheckoutId = provisionalBatches.start[0]!.params.checkout.id;
    const replacementCheckoutId = "gid://shopify/Checkout/789";
    const error = clone(provisionalBatches.error[0]!);
    error.params.context.revision = 1;
    Object.assign(error.params.context, { status: "ejected" });
    Object.assign(error.params, { checkout: clone(provisionalBatches.start[0]!.params.checkout) });
    const errorSpy = vi.fn();
    const startSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("start", startSpy);
    checkout.addEventListener("update", updateSpy);

    send([error]);

    expect(errorSpy).toHaveBeenCalledOnce();
    const entry = errorSpy.mock.calls[0]![0].detail[0]!;
    expect(entry.context).toMatchObject({ shopId: FIRST_SHOP_ID, status: "ejected" });
    expect(entry.checkout?.id).toBe(failedCheckoutId);

    // A start for the checkout that already failed must not revive it, while a
    // healthy sibling in the same batch still starts.
    const sameCheckoutStart = clone(provisionalBatches.start[0]!);
    sameCheckoutStart.params.context.revision = 2;
    const siblingStart = clone(provisionalBatches.start[1]!);
    siblingStart.params.context.revision = 2;
    send([sameCheckoutStart, siblingStart]);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(
      startSpy.mock.calls[0]![0].detail.map(
        ({ context }: { context: { shopId: string } }) => context.shopId,
      ),
    ).toEqual([SECOND_SHOP_ID]);

    // A different checkout identity arriving through update cannot recover the
    // failure by itself; the sibling keeps receiving updates.
    const replacementUpdate = clone(provisionalBatches.update[0]!);
    replacementUpdate.params.context.revision = 3;
    replacementUpdate.params.checkout.id = replacementCheckoutId;
    const siblingUpdate = clone(provisionalBatches.update[0]!);
    siblingUpdate.params.context.revision = 3;
    siblingUpdate.params.context.shop_id = SECOND_SHOP_ID;
    siblingUpdate.params.checkout.id = provisionalBatches.start[1]!.params.checkout.id;
    send([replacementUpdate, siblingUpdate]);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(
      updateSpy.mock.calls[0]![0].detail.map(
        ({ context }: { context: { shopId: string } }) => context.shopId,
      ),
    ).toEqual([SECOND_SHOP_ID]);

    // An explicit start with a new checkout identity recovers the failed shop.
    const recovery = clone(provisionalBatches.start[0]!);
    recovery.params.context.revision = 4;
    recovery.params.checkout.id = replacementCheckoutId;
    send([recovery]);

    expect(startSpy).toHaveBeenCalledTimes(2);
    expect(startSpy.mock.calls[1]![0].detail).toEqual([resourceDetail(recovery.params)]);
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("keeps the failed checkout identity when a later error for the shop has no snapshot", () => {
    const { checkout, send } = openPopupShopPay();
    const error = clone(provisionalBatches.error[0]!);
    error.params.context.revision = 1;
    Object.assign(error.params.context, { status: "ejected" });
    Object.assign(error.params, { checkout: clone(provisionalBatches.start[0]!.params.checkout) });
    const laterError = clone(provisionalBatches.error[0]!);
    laterError.params.context.revision = 2;
    laterError.params.error.messages[0]!.content = "The checkout can no longer continue.";
    const errorSpy = vi.fn();
    const startSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("start", startSpy);

    send([error]);
    send([laterError]);

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[1]![0].detail[0]!.error.message).toBe(
      "The checkout can no longer continue.",
    );

    const sameCheckoutStart = clone(provisionalBatches.start[0]!);
    sameCheckoutStart.params.context.revision = 3;
    send([sameCheckoutStart]);

    expect(startSpy).not.toHaveBeenCalled();

    const recovery = clone(provisionalBatches.start[0]!);
    recovery.params.context.revision = 4;
    recovery.params.checkout.id = "gid://shopify/Checkout/789";
    send([recovery]);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(recovery.params)]);
  });

  it("does not use ejected completion to replace a checkout after a terminal resource error", () => {
    const { checkout, send } = startSession();
    const error = clone(provisionalBatches.error[0]!);
    error.params.context.revision = 2;
    send([error]);
    const ejected = {
      ...clone(provisionalBatches.start[0]!),
      method: "ec.complete",
      params: {
        ...clone(provisionalBatches.start[0]!.params),
        context: { ...provisionalBatches.start[0]!.params.context, revision: 3, status: "ejected" },
        checkout: {
          ...clone(provisionalBatches.start[0]!.params.checkout),
          id: "replacement-checkout",
        },
      },
    };
    const completeSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);
    checkout.addEventListener("update", updateSpy);

    send([ejected]);
    // Had the ejected completion replaced the failed checkout, this update would be delivered.
    const replacementUpdate = clone(provisionalBatches.update[0]!);
    replacementUpdate.params.context.revision = 4;
    replacementUpdate.params.checkout.id = "replacement-checkout";
    send([replacementUpdate]);

    expect(completeSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("recovers a retryable failure through completion and keeps complete_in_progress in updates", () => {
    const { checkout, send } = startSession();
    const submitting = {
      ...clone(provisionalBatches.start[0]!),
      method: "ec.update",
      params: {
        ...clone(provisionalBatches.start[0]!.params),
        context: { ...provisionalBatches.start[0]!.params.context, revision: 2, status: "active" },
        checkout: {
          ...clone(provisionalBatches.start[0]!.params.checkout),
          status: "complete_in_progress",
        },
      },
    };
    const updateSpy = vi.fn();
    const completeSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);
    checkout.addEventListener("complete", completeSpy);
    send([submitting]);
    const failed = clone(submitting);
    failed.params.context.status = "failed";
    failed.params.context.revision = 3;
    send([failed]);
    const complete = provisionalBatches.complete.map((entry) => ({
      ...clone(entry),
      params: {
        ...clone(entry.params),
        context: { ...entry.params.context, revision: 4, status: "active" },
      },
    }));

    send(complete);

    expect(
      updateSpy.mock.calls.map(([event]) => [
        event.detail[0].context.status,
        event.detail[0].checkout.status,
      ]),
    ).toEqual([
      ["active", "complete_in_progress"],
      ["failed", "complete_in_progress"],
    ]);
    expect(completeSpy).toHaveBeenCalledOnce();
    expect(
      completeSpy.mock.calls[0]![0].detail.map(
        ({ context, checkout: snapshot }: ShopPayResourceEventDetail[number]) => [
          context.status,
          snapshot.status,
        ],
      ),
    ).toEqual([
      ["active", "completed"],
      ["active", "completed"],
    ]);
  });

  it("keeps same-revision complete members but drops later groups once every shop completes", () => {
    const { checkout, send } = startSession();
    const firstComplete = clone(provisionalBatches.complete[0]!);
    const secondComplete = clone(provisionalBatches.complete[1]!);
    const lateUpdate = clone(provisionalBatches.update[0]!);
    lateUpdate.params.context.shop_id = SECOND_SHOP_ID;
    lateUpdate.params.context.revision = 4;
    lateUpdate.params.checkout.id = "gid://shopify/Checkout/456";
    lateUpdate.params.checkout.currency = "CAD";
    const lateError = clone(provisionalBatches.error[0]!);
    lateError.params.context.revision = 5;
    const lateStart = clone(provisionalBatches.start[0]!);
    lateStart.params.context.revision = 6;
    lateStart.params.checkout.id = "gid://shopify/Checkout/reopened";
    const completeSpy = vi.fn();
    const updateSpy = vi.fn();
    const errorSpy = vi.fn();
    const startSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);
    checkout.addEventListener("update", updateSpy);
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("start", startSpy);

    send([firstComplete, secondComplete, lateUpdate, lateError, lateStart]);

    expect(completeSpy).toHaveBeenCalledOnce();
    expect(completeSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(firstComplete.params),
      resourceDetail(secondComplete.params),
    ]);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
  });

  it("keeps the session open after one shop completes and completes the next shop separately", () => {
    const { checkout, send } = startSession();
    const firstComplete = clone(provisionalBatches.complete[0]!);
    firstComplete.params.context.revision = 2;
    const otherUpdate = clone(provisionalBatches.update[0]!);
    otherUpdate.params.context.shop_id = SECOND_SHOP_ID;
    otherUpdate.params.context.revision = 3;
    otherUpdate.params.checkout.id = "gid://shopify/Checkout/456";
    const secondComplete = clone(provisionalBatches.complete[1]!);
    secondComplete.params.context.revision = 4;
    const lateUpdate = clone(otherUpdate);
    lateUpdate.params.context.revision = 5;
    lateUpdate.params.checkout.currency = "CAD";
    const completeSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);
    checkout.addEventListener("update", updateSpy);

    send([firstComplete]);
    send([otherUpdate]);
    send([secondComplete]);
    send([lateUpdate]);

    expect(
      completeSpy.mock.calls.map(([event]) =>
        event.detail.map(({ context }: { context: { shopId: string } }) => context.shopId),
      ),
    ).toEqual([[FIRST_SHOP_ID], [SECOND_SHOP_ID]]);
    expect(updateSpy).toHaveBeenCalledOnce();
  });

  it("ends the session when the last open shop fails after another shop completed", () => {
    const { checkout, send } = startSession();
    const firstComplete = clone(provisionalBatches.complete[0]!);
    firstComplete.params.context.revision = 2;
    const secondError = clone(provisionalBatches.error[0]!);
    secondError.params.context.shop_id = SECOND_SHOP_ID;
    secondError.params.context.revision = 3;
    const recovery = clone(provisionalBatches.start[1]!);
    recovery.params.context.revision = 4;
    recovery.params.checkout.id = "replacement-checkout";
    const startSpy = vi.fn();
    const errorSpy = vi.fn();
    checkout.addEventListener("start", startSpy);
    checkout.addEventListener("error", errorSpy);

    send([firstComplete]);
    send([secondError]);
    send([recovery]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(
      errorSpy.mock.calls[0]![0].detail.map(
        ({ context }: { context?: { shopId?: string } }) => context?.shopId,
      ),
    ).toEqual([SECOND_SHOP_ID]);
    expect(startSpy).not.toHaveBeenCalled();
  });

  it("waits for every shop announced at ready before ending the session", () => {
    const { checkout, send } = openPopupShopPay();
    const thirdReady = clone(provisionalBatches.ready.request[0]!);
    thirdReady.id = "ready-3";
    send([...provisionalBatches.ready.request, thirdReady]);
    send(provisionalBatches.start);
    const completeSpy = vi.fn();
    const startSpy = vi.fn();
    checkout.addEventListener("complete", completeSpy);
    checkout.addEventListener("start", startSpy);
    const thirdStart = clone(provisionalBatches.start[0]!);
    thirdStart.params.context.shop_id = "gid://shopify/Shop/789";
    thirdStart.params.context.revision = 4;
    thirdStart.params.checkout.id = "gid://shopify/Checkout/789";

    send(provisionalBatches.complete);
    send([thirdStart]);

    expect(completeSpy).toHaveBeenCalledOnce();
    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(thirdStart.params)]);
  });

  it("continues delivering healthy shop updates after another shop completes in an update", () => {
    const { checkout, send } = startSession();
    const firstCompleted = { ...clone(provisionalBatches.complete[0]!), method: "ec.update" };
    firstCompleted.params.context.revision = 2;
    send([firstCompleted]);
    const otherUpdate = clone(provisionalBatches.update[0]!);
    otherUpdate.params.context.shop_id = SECOND_SHOP_ID;
    otherUpdate.params.checkout.id = "gid://shopify/Checkout/456";
    otherUpdate.params.context.revision = 3;
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);

    send([otherUpdate]);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(
      updateSpy.mock.calls[0]![0].detail.map(
        ({ context }: { context: { shopId: string } }) => context.shopId,
      ),
    ).toEqual([SECOND_SHOP_ID]);
  });

  it("ignores notifications after the explicit session complete", () => {
    const { checkout, send } = startSession();
    send(provisionalBatches.complete);
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);
    const lateUpdate = clone(provisionalBatches.update[0]!);
    lateUpdate.params.context.revision = 4;
    lateUpdate.params.checkout.currency = "CAD";

    send([lateUpdate]);

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("delivers a repeated start notification as an update", () => {
    const { checkout, send } = startSession();
    const restart = clone(provisionalBatches.start[0]!);
    restart.params.context.revision = 2;
    restart.params.checkout.currency = "CAD";
    const startSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("start", startSpy);
    checkout.addEventListener("update", updateSpy);

    send([restart]);

    expect(startSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(restart.params)]);
  });

  it("dispatches a checkout error without failing the rest of the session", () => {
    const { checkout, send } = startSession();
    const firstError = provisionalBatches.error[0]!;
    const failure = { code: "unknown", message: "Universal Checkout is unavailable." };
    const errorSpy = vi.fn();
    const closeSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("close", closeSpy);
    checkout.addEventListener("update", updateSpy);
    const otherUpdate = clone(provisionalBatches.update[0]!);
    otherUpdate.params.context.shop_id = SECOND_SHOP_ID;
    otherUpdate.params.checkout.id = "gid://shopify/Checkout/456";
    otherUpdate.params.context.revision = 5;
    const failedUpdate = clone(provisionalBatches.update[0]!);
    failedUpdate.params.context.revision = 5;

    send([firstError]);
    send([failedUpdate, otherUpdate]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0].detail).toEqual([
      { context: publicContext(firstError.params), error: failure },
    ]);
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(
      updateSpy.mock.calls[0]![0].detail.map(
        ({ context }: { context: { shopId: string } }) => context.shopId,
      ),
    ).toEqual([SECOND_SHOP_ID]);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("reports an ejected error's final snapshot and status", () => {
    const { checkout, send } = startSession();
    const wireError = clone(provisionalBatches.error[0]!);
    Object.assign(wireError.params.context, { status: "ejected" });
    Object.assign(wireError.params, {
      checkout: clone(provisionalBatches.update[0]!.params.checkout),
    });
    const errorSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);

    send([wireError]);

    const entry = errorSpy.mock.calls[0]![0].detail[0]!;
    expect(entry.context).toEqual({
      ...publicContext(wireError.params),
      status: "ejected",
    });
    expect(entry.checkout).toMatchObject({
      id: provisionalBatches.update[0]!.params.checkout.id,
      status: "ready_for_complete",
    });
    expect(entry.error).toEqual({
      code: "unknown",
      message: "Universal Checkout is unavailable.",
    });
  });

  it.each(["before", "after"])(
    "keeps a sibling resource error %s completion in the same batch",
    (order) => {
      const recordErrorSpy = vi.spyOn(mockTelemetry(), "recordError");
      const { checkout, send } = startSession();
      const completedUpdate = { ...clone(provisionalBatches.complete[1]!), method: "ec.update" };
      completedUpdate.params.context.revision = 2;
      const completed = clone(provisionalBatches.complete[1]!);
      completed.params.context.revision = 2;
      const aborted = {
        jsonrpc: "2.0",
        method: "ec.error",
        params: {
          context: { session_id: SESSION_ID, revision: 2, shop_id: FIRST_SHOP_ID },
          error: {
            ucp: { version: "2026-08-25", status: "error" },
            messages: [
              {
                type: "error",
                code: "currency_mismatch",
                content: "The shops use different currencies.",
                content_type: "plain",
                severity: "unrecoverable",
              },
            ],
          },
        },
      };
      const events: string[] = [];
      const errorDetails: unknown[] = [];
      checkout.addEventListener("update", () => events.push("update"));
      checkout.addEventListener("error", ({ detail }) => {
        events.push("error");
        errorDetails.push(detail);
      });
      checkout.addEventListener("complete", () => events.push("complete"));

      send(
        order === "before"
          ? [completedUpdate, aborted, completed]
          : [completedUpdate, completed, aborted],
      );

      const expectedEvents =
        order === "before" ? ["update", "error", "complete"] : ["update", "complete", "error"];
      expect(events).toEqual(expectedEvents);
      expect(
        recordErrorSpy.mock.calls.filter(([metric]) => metric.code === "terminal_error"),
      ).toHaveLength(1);
      expect(errorDetails).toEqual([
        [
          {
            context: { sessionId: SESSION_ID, revision: 2, shopId: FIRST_SHOP_ID },
            error: { code: "unknown", message: "The shops use different currencies." },
          },
        ],
      ]);

      const laterUpdate = clone(provisionalBatches.update[0]!);
      laterUpdate.params.context.revision = 3;
      send([laterUpdate]);
      expect(events).toEqual(expectedEvents);
    },
  );

  it("normalizes only recognized checkout-origin error codes like the native SDKs", () => {
    const { checkout, send } = startSession();
    const firstError = clone(provisionalBatches.error[0]!);
    const secondError = clone(provisionalBatches.error[1]!);
    firstError.params.error.messages[0]!.code = "CaRt_ExPiReD";
    secondError.params.error.messages[0]!.code = "SDK_ERROR";
    const errorSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);

    send([firstError, secondError]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(
      errorSpy.mock.calls[0]![0].detail.map(({ error }: { error: { code: string } }) => error.code),
    ).toEqual(["cart_expired", "unknown"]);
  });

  it("preserves checkout error reasons when message severity is omitted", () => {
    const { checkout, send } = startSession();
    const wireError = clone(provisionalBatches.error[0]!);
    const { severity: _, ...message } = wireError.params.error.messages[0]!;
    const onError = vi.fn();
    checkout.addEventListener("error", onError);

    send([
      {
        ...wireError,
        params: {
          ...wireError.params,
          error: {
            ...wireError.params.error,
            messages: [{ ...message, code: "CaRt_ExPiReD", content: "Cart expired" }],
          },
        },
      },
    ]);

    const failure = { code: "cart_expired", message: "Cart expired" };
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]![0].detail[0].error).toEqual(failure);
  });

  it("orders later notifications after duplicate errors without redispatching or recounting them", () => {
    const recordErrorSpy = vi.spyOn(mockTelemetry(), "recordError");
    const { checkout, send } = startSession();
    const wireError = clone(provisionalBatches.error[0]!);
    const newerDuplicate = clone(wireError);
    newerDuplicate.params.context.revision = 10;
    const onError = vi.fn();
    const onStart = vi.fn();
    const onUpdate = vi.fn();
    checkout.addEventListener("error", onError);
    checkout.addEventListener("start", onStart);
    checkout.addEventListener("update", onUpdate);

    send([wireError]);
    send([newerDuplicate]);

    const delayedReplacement = clone(provisionalBatches.start[0]!);
    delayedReplacement.params.context.revision = 5;
    delayedReplacement.params.checkout.id = "checkout-replacement";
    const delayedHealthyUpdate = clone(provisionalBatches.update[0]!);
    delayedHealthyUpdate.params.context.shop_id = SECOND_SHOP_ID;
    delayedHealthyUpdate.params.checkout.id = provisionalBatches.start[1]!.params.checkout.id;
    delayedHealthyUpdate.params.context.revision = 5;
    send([delayedReplacement, delayedHealthyUpdate]);

    expect(onError).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(
      recordErrorSpy.mock.calls.filter(([metric]) => metric.code === "terminal_error"),
    ).toHaveLength(1);

    const currentHealthyUpdate = clone(delayedHealthyUpdate);
    currentHealthyUpdate.params.context.revision = 11;
    send([currentHealthyUpdate]);
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("records one terminal-error metric per accepted wire member, not per grouped event", () => {
    const recordErrorSpy = vi.spyOn(mockTelemetry(), "recordError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = startSession();
    const [firstError, secondError] = provisionalBatches.error;
    const errorSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);

    send([firstError, firstError, secondError]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0].detail).toHaveLength(2);
    const terminalCalls = () =>
      recordErrorSpy.mock.calls.filter(([metric]) => metric.code === "terminal_error");
    expect(terminalCalls()).toHaveLength(2);

    // Replayed, malformed, and foreign-session members are not accepted.
    send([firstError, secondError]);
    send([{ ...firstError, id: { invalid: true } }]);
    const foreignError = clone(secondError!);
    foreignError.params.context.session_id = "gid://shopify/UniversalCheckoutSession/other";
    send([foreignError]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(terminalCalls()).toHaveLength(2);
    expect(errorLogSpy).toHaveBeenCalledOnce();
  });

  it("delivers errors to the element without triggering global error handlers", () => {
    const { checkout, send } = startSession();
    const onError = vi.fn();
    const onDocumentError = vi.fn();
    const onWindowError = vi.fn();
    const onGlobalError = vi.fn();
    const originalOnError = window.onerror;
    checkout.addEventListener("error", onError);
    document.addEventListener("error", onDocumentError);
    window.addEventListener("error", onWindowError);
    // oxlint-disable-next-line unicorn/prefer-add-event-listener -- Exercise error-reporting hooks.
    window.onerror = onGlobalError;
    try {
      send(provisionalBatches.error);
      expect(onError).toHaveBeenCalledOnce();
      expect(onDocumentError).not.toHaveBeenCalled();
      expect(onWindowError).not.toHaveBeenCalled();
      expect(onGlobalError).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("error", onDocumentError);
      window.removeEventListener("error", onWindowError);
      // oxlint-disable-next-line unicorn/prefer-add-event-listener -- Restore the previous hook.
      window.onerror = originalOnError;
    }
  });

  it("records failed navigation for a session error before checkout starts", () => {
    const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
    const { checkout, send } = openPopupShopPay();
    const sessionError = clone(provisionalBatches.error[0]!);
    Reflect.deleteProperty(sessionError.params.context, "shop_id");
    Object.assign(sessionError.params.context, { scope: "session" });
    const errorSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);

    send([sessionError]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0].detail[0].context?.shopId).toBeUndefined();
    expect(durationSpy).toHaveBeenCalledExactlyOnceWith({
      milliseconds: expect.any(Number),
      result: "failure",
      preloaded: false,
    });

    send([sessionError]);
    expect(durationSpy).toHaveBeenCalledOnce();
  });

  it("keeps navigation pending after a resource error and succeeds on a later start", () => {
    const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
    const { send } = openPopupShopPay();
    send([provisionalBatches.error[0]!]);
    expect(durationSpy).not.toHaveBeenCalled();

    const otherShopStart = clone(provisionalBatches.start[1]!);
    otherShopStart.params.context.revision = 5;
    send([otherShopStart]);

    expect(durationSpy).toHaveBeenCalledExactlyOnceWith({
      milliseconds: expect.any(Number),
      result: "success",
      preloaded: false,
    });
  });

  it("records success when a start precedes a session error in the same batch", () => {
    const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
    const { send } = openPopupShopPay();
    const sessionError = clone(provisionalBatches.error[0]!);
    Reflect.deleteProperty(sessionError.params.context, "shop_id");
    Object.assign(sessionError.params.context, { scope: "session" });
    sessionError.params.context.revision = 1;

    send([provisionalBatches.start[0]!, sessionError]);

    expect(durationSpy).toHaveBeenCalledExactlyOnceWith({
      milliseconds: expect.any(Number),
      result: "success",
      preloaded: false,
    });
  });

  it("treats structured-cloned undefined optional fields as absent", () => {
    const { checkout, send } = openPopupShopPay();
    const start = structuredClone(provisionalBatches.start[0]!);
    Object.assign(start.params.checkout, { order: undefined, fulfillment: undefined });
    expect(Object.hasOwn(start.params.checkout, "order")).toBe(true);
    expect(Object.hasOwn(start.params.checkout, "fulfillment")).toBe(true);
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([start]);

    expect(startSpy).toHaveBeenCalledOnce();
    const snapshot = startSpy.mock.calls[0]![0].detail[0].checkout;
    expect(snapshot).not.toHaveProperty("order");
    expect(snapshot).not.toHaveProperty("fulfillment");
  });

  it("treats an own undefined notification id as absent but rejects an invalid id", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupShopPay();
    const valid = { ...clone(provisionalBatches.start[0]!), id: undefined };
    const invalid = { ...clone(provisionalBatches.start[1]!), id: { invalid: true } };
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    const batch = structuredClone([valid, invalid]);
    expect(Object.hasOwn(batch[0]!, "id")).toBe(true);
    send(batch);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(valid.params)]);
    expect(errorLogSpy).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("id invalid_type"));
    expect(decodeSpy).toHaveBeenCalledExactlyOnceWith({
      method: "ec.start",
      failureType: "params",
    });
  });

  it("attributes malformed Universal Checkout updates to ec.update telemetry", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { send } = startSession();
    const malformedUpdate = clone(provisionalBatches.update[0]!);
    Object.assign(malformedUpdate.params.checkout, { totals: undefined });

    send([malformedUpdate]);

    expect(decodeSpy).toHaveBeenCalledExactlyOnceWith({
      method: "ec.update",
      failureType: "params",
    });
  });

  it("logs and records one safe decode failure per bad member while delivering valid siblings", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupShopPay();
    const missingTotals = clone(provisionalBatches.start[1]!);
    const malformedTotals = {
      ...missingTotals,
      params: {
        ...missingTotals.params,
        checkout: { ...missingTotals.params.checkout, totals: undefined },
      },
    };
    expect(Object.hasOwn(malformedTotals.params.checkout, "totals")).toBe(true);
    const malformedOrder = clone(provisionalBatches.start[1]!);
    Object.assign(malformedOrder.params.checkout, {
      order: { id: undefined, permalink_url: "https://shop.example.com/orders/synthetic" },
    });
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([provisionalBatches.start[0], malformedTotals, malformedOrder]);

    expect(checkout.logLevel).toBe("error");
    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(provisionalBatches.start[0]!.params),
    ]);
    expect(errorLogSpy).toHaveBeenCalledTimes(2);
    expect(errorLogSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Checkout.totals missing_required"),
    );
    expect(errorLogSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("Checkout.order.id missing_required"),
    );
    expect(decodeSpy).toHaveBeenCalledTimes(2);
    expect(decodeSpy).toHaveBeenNthCalledWith(1, {
      method: "ec.start",
      failureType: "params",
    });
    expect(decodeSpy).toHaveBeenNthCalledWith(2, {
      method: "ec.start",
      failureType: "params",
    });
  });

  it("drops a nested order field with the wrong scalar type without exposing its value", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupShopPay();
    const malformedOrder = clone(provisionalBatches.start[1]!);
    const privateValue = "private-marker-only-for-test";
    Object.assign(malformedOrder.params.checkout, {
      order: { id: "gid://shopify/Order/synthetic", permalink_url: { raw: privateValue } },
    });
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([provisionalBatches.start[0], malformedOrder]);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(provisionalBatches.start[0]!.params),
    ]);
    expect(errorLogSpy).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("Checkout.order.permalink_url invalid_type"),
    );
    expect(errorLogSpy.mock.calls.flat().join(" ")).not.toContain(privateValue);
    expect(decodeSpy).toHaveBeenCalledExactlyOnceWith({
      method: "ec.start",
      failureType: "params",
    });
  });

  it("rejects non-array required checkout fields without losing valid siblings", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupShopPay();
    const invalidFields = ["line_items", "links", "totals"] as const;
    const invalidEntries = invalidFields.map((field) => {
      const entry = clone(provisionalBatches.start[1]!);
      Object.assign(entry.params.checkout, { [field]: null });
      return entry;
    });
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send([provisionalBatches.start[0], ...invalidEntries]);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(provisionalBatches.start[0]!.params),
    ]);
    expect(errorLogSpy).toHaveBeenCalledTimes(invalidFields.length);
    expect(decodeSpy).toHaveBeenCalledTimes(invalidFields.length);
    invalidFields.forEach((field, index) => {
      expect(errorLogSpy).toHaveBeenNthCalledWith(
        index + 1,
        expect.stringContaining(`Checkout.${field} invalid_type`),
      );
      expect(decodeSpy).toHaveBeenNthCalledWith(index + 1, {
        method: "ec.start",
        failureType: "params",
      });
    });
  });

  it("turns a malformed terminal error for a known shop into a scoped SDK failure", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = startSession();
    const wireError = clone(provisionalBatches.error[0]!);
    const { messages: _, ...errorWithoutMessages } = wireError.params.error;
    const malformed = {
      ...wireError,
      params: { ...wireError.params, error: errorWithoutMessages },
    };
    const healthyUpdate = clone(provisionalBatches.update[0]!);
    healthyUpdate.params.context.shop_id = SECOND_SHOP_ID;
    healthyUpdate.params.context.revision = 5;
    healthyUpdate.params.checkout.id = "gid://shopify/Checkout/456";
    const errorSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("update", updateSpy);

    send([malformed, healthyUpdate]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0].detail).toEqual([
      {
        context: publicContext(wireError.params),
        error: { code: "sdk_error", message: expect.any(String) },
      },
    ]);
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail[0].context.shopId).toBe(SECOND_SHOP_ID);
    expect(updateSpy.mock.calls[0]![0].detail[0].checkout.status).toBe("ready_for_complete");
    expect(errorLogSpy).toHaveBeenCalledOnce();
    expect(errorLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("ErrorResponse.messages missing_required"),
    );
    expect(decodeSpy).toHaveBeenCalledExactlyOnceWith({
      method: "ec.error",
      failureType: "params",
    });
  });

  it("drops an error with no trusted resource or explicit session scope", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = startSession();
    const wireError = provisionalBatches.error[0]!;
    const ambiguousError = {
      ...wireError,
      params: {
        ...wireError.params,
        context: { session_id: SESSION_ID, revision: 4 },
      },
    };
    const healthyUpdate = clone(provisionalBatches.update[0]!);
    healthyUpdate.params.context.shop_id = SECOND_SHOP_ID;
    healthyUpdate.params.context.revision = 4;
    healthyUpdate.params.checkout.id = "gid://shopify/Checkout/456";
    const errorSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("update", updateSpy);

    send([ambiguousError, healthyUpdate]);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail[0].context.shopId).toBe(SECOND_SHOP_ID);
    expect(errorLogSpy).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("context.shop_id missing_required"),
    );
    expect(decodeSpy).toHaveBeenCalledExactlyOnceWith({
      method: "ec.error",
      failureType: "params",
    });
  });

  it("accepts an explicitly scoped session error and stops later notifications in and after its batch", () => {
    const { checkout, send } = startSession();
    const wireError = provisionalBatches.error[0]!;
    const sessionError = {
      ...wireError,
      params: {
        ...wireError.params,
        context: { session_id: SESSION_ID, revision: 4, scope: "session" },
      },
    };
    const failure = { code: "unknown", message: "Universal Checkout is unavailable." };
    const context = { sessionId: SESSION_ID, revision: 4 };
    const errorSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);
    checkout.addEventListener("update", updateSpy);

    const lateUpdate = clone(provisionalBatches.update[0]!);
    lateUpdate.params.context.revision = 5;
    send([sessionError, lateUpdate]);
    send([lateUpdate]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0].detail).toEqual([{ context, error: failure }]);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("answers unsupported and malformed requests with JSON-RPC errors", () => {
    const { checkout, mockCheckoutWindow, send } = openPopupShopPay();

    send([
      { jsonrpc: "2.0", id: "ready_invalid", method: "ec.ready", params: {} },
      { jsonrpc: "2.0", id: "credential_1", method: "ec.payment.credential_request", params: {} },
      { jsonrpc: "2.0", method: "ec.buyer.change", params: {} },
    ]);

    expect(mockCheckoutWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      [
        { jsonrpc: "2.0", id: "ready_invalid", error: { code: -32602, message: "Invalid params" } },
        {
          jsonrpc: "2.0",
          id: "credential_1",
          error: { code: -32601, message: "Method not found" },
        },
      ],
      new URL(checkout.src).origin,
    );
  });

  it("rejects request-shaped lifecycle members without applying them or losing valid siblings", () => {
    const { checkout, mockCheckoutWindow, send } = openPopupShopPay();
    const wireError = clone(provisionalBatches.error[0]!);
    const requests = [
      { ...clone(provisionalBatches.start[0]!), id: "start_request" },
      { ...clone(provisionalBatches.update[0]!), id: 0 },
      { ...clone(provisionalBatches.complete[0]!), id: null },
      { ...wireError, id: "resource_error_request" },
      {
        ...wireError,
        id: "session_error_request",
        params: {
          ...wireError.params,
          context: { session_id: SESSION_ID, revision: 4, scope: "session" },
        },
      },
      { jsonrpc: "2.0", id: "malformed_lifecycle_request", method: "ec.start", params: {} },
    ];
    const validStart = provisionalBatches.start[1]!;
    const startSpy = vi.fn();
    const updateSpy = vi.fn();
    const completeSpy = vi.fn();
    const errorSpy = vi.fn();
    checkout.addEventListener("start", startSpy);
    checkout.addEventListener("update", updateSpy);
    checkout.addEventListener("complete", completeSpy);
    checkout.addEventListener("error", errorSpy);

    send([...requests, validStart]);

    expect(mockCheckoutWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      requests.map(({ id }) => ({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" },
      })),
      new URL(checkout.src).origin,
    );
    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(validStart.params)]);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(completeSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("opens window.open requests and answers with the standard result", () => {
    const { checkout, mockCheckoutWindow, send, windowOpenSpy } = openPopupShopPay();

    send([
      {
        jsonrpc: "2.0",
        id: "open_1",
        method: "ec.window.open_request",
        params: { url: "https://shop.example.com/policies/refund-policy" },
      },
    ]);

    expect(windowOpenSpy).toHaveBeenLastCalledWith(
      "https://shop.example.com/policies/refund-policy",
      "_blank",
      "noopener",
    );
    expect(mockCheckoutWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      [
        {
          jsonrpc: "2.0",
          id: "open_1",
          result: { ucp: { status: "success", version: "2026-08-25" } },
        },
      ],
      new URL(checkout.src).origin,
    );
  });

  it("keeps event details immutable across later updates", () => {
    const { checkout, send } = openPopupShopPay();
    const start = structuredClone(provisionalBatches.start);
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send(start);

    const firstDetail = startSpy.mock.calls[0]![0].detail;
    expect(Object.isFrozen(firstDetail)).toBe(true);
    expect(Object.isFrozen(firstDetail[0].context)).toBe(true);
    expect(Object.isFrozen(firstDetail[0].checkout)).toBe(true);
    expect(Object.isFrozen(firstDetail[0].checkout.lineItems)).toBe(true);
    Object.assign(start[0]!.params.checkout, { status: "completed" });
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);

    send(provisionalBatches.update);

    expect(firstDetail[0].checkout.status).toBe("incomplete");
    expect(updateSpy.mock.calls[0]![0].detail[0].checkout.status).toBe("ready_for_complete");
  });

  it("dispatches close with null detail when the presentation closes", () => {
    const { checkout } = openPopupShopPay();
    const closeSpy = vi.fn();
    checkout.addEventListener("close", closeSpy);

    checkout.close();

    expect(closeSpy).toHaveBeenCalledOnce();
    expect((closeSpy.mock.calls[0]![0] as CustomEvent).detail).toBeNull();
  });

  /** One shop completes while the other fails at the same revision, in one message. */
  function completeWithSiblingError() {
    const complete = clone(provisionalBatches.complete[0]!);
    const siblingError = clone(provisionalBatches.error[1]!);
    siblingError.params.context.revision = complete.params.context.revision;
    return [complete, siblingError];
  }

  it("closes from a listener only after the rest of the message's events", () => {
    const { checkout, mockCheckoutWindow, send } = startSession();
    const events: string[] = [];
    let closedDuringComplete = true;
    checkout.addEventListener("complete", () => {
      events.push("complete");
      checkout.close();
      closedDuringComplete = vi.mocked(mockCheckoutWindow.close).mock.calls.length > 0;
    });
    checkout.addEventListener("error", () => events.push("error"));
    checkout.addEventListener("close", () => events.push("close"));

    send(completeWithSiblingError());

    expect(events).toEqual(["complete", "error", "close"]);
    expect(closedDuringComplete).toBe(false);
    expect(mockCheckoutWindow.close).toHaveBeenCalledOnce();
  });

  it("keeps checkout reopened from a listener open after the message", () => {
    const { checkout, mockCheckoutWindow: firstWindow, windowOpenSpy, send } = startSession();
    const secondWindow = createMockWindow();
    windowOpenSpy.mockReturnValue(secondWindow);
    checkout.addEventListener("complete", () => {
      checkout.close();
      checkout.open();
    });

    send(completeWithSiblingError());

    expect(firstWindow.close).toHaveBeenCalledOnce();
    expect(secondWindow.close).not.toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledTimes(2);
    // The old window closes before the new one opens, since a target can reuse it.
    expect(vi.mocked(firstWindow.close).mock.invocationCallOrder[0]).toBeLessThan(
      windowOpenSpy.mock.invocationCallOrder[1]!,
    );
  });

  it("closes immediately when a listener removes the element", () => {
    const { checkout, mockCheckoutWindow, send } = startSession();
    const errorSpy = vi.fn();
    let closedDuringComplete = false;
    checkout.addEventListener("complete", () => {
      checkout.remove();
      closedDuringComplete = vi.mocked(mockCheckoutWindow.close).mock.calls.length > 0;
    });
    checkout.addEventListener("error", errorSpy);

    send(completeWithSiblingError());

    expect(closedDuringComplete).toBe(true);
    expect(mockCheckoutWindow.close).toHaveBeenCalledOnce();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("ignores old messages after close and binds a reopened session to its new window", () => {
    const { checkout, mockCheckoutWindow: firstWindow, windowOpenSpy, send } = openPopupShopPay();
    send(provisionalBatches.start);
    checkout.close();
    const startSpy = vi.fn();
    const updateSpy = vi.fn();
    checkout.addEventListener("start", startSpy);
    checkout.addEventListener("update", updateSpy);

    send(provisionalBatches.update);
    expect(updateSpy).not.toHaveBeenCalled();
    const secondWindow = createMockWindow();
    windowOpenSpy.mockReturnValue(secondWindow);
    checkout.open();

    send(provisionalBatches.ready.request, { source: firstWindow });
    send(provisionalBatches.start, { source: firstWindow });
    expect(firstWindow.postMessage).not.toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();

    send(provisionalBatches.ready.request, { source: secondWindow });
    send(provisionalBatches.start, { source: secondWindow });
    expect(secondWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      provisionalBatches.ready.response,
      new URL(checkout.src).origin,
    );
    // A new session starts the same shops again instead of updating the old one.
    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toHaveLength(2);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("reports malformed protocol envelopes without exposing payloads or logging unrelated traffic", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupShopPay();
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send(provisionalBatches.start[0]);
    send([]);
    send({ jsonrpc: "2.0", id: "response-example", result: {} });
    send({ kind: "unrelated" });
    send("unrelated");

    expect(startSpy).not.toHaveBeenCalled();
    expect(errorLogSpy.mock.calls).toEqual(
      Array.from({ length: 3 }, () => ["<shop-pay>: dropped malformed Shop Pay protocol batch"]),
    );
    expect(decodeSpy).toHaveBeenCalledTimes(3);
    for (const [metric] of decodeSpy.mock.calls) {
      expect(metric).toEqual({ method: "unknown", failureType: "envelope" });
    }
  });

  const envelopeOptOutCases: {
    name: string;
    attributes: Record<string, string>;
    logs: number;
    metrics: number;
  }[] = [
    { name: "console logging", attributes: { "log-level": "none" }, logs: 0, metrics: 1 },
    { name: "telemetry", attributes: { telemetry: "false" }, logs: 1, metrics: 0 },
  ];
  it.each(envelopeOptOutCases)(
    "can disable $name independently for malformed envelopes",
    ({ attributes, logs, metrics }) => {
      const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
      const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { send } = openPopupShopPay(attributes);

      send(provisionalBatches.start[0]);

      expect(errorLogSpy).toHaveBeenCalledTimes(logs);
      expect(decodeSpy).toHaveBeenCalledTimes(metrics);
    },
  );

  it.each([
    ["a different window", { source: createMockWindow() }],
    ["a null sender", { source: null }],
    ["another HTTPS origin", { origin: "https://untrusted.example.com" }],
    ["a non-HTTPS origin", { origin: "http://shop.example.com" }],
  ])("drops a batch from %s", (_, options) => {
    const { checkout, send } = openPopupShopPay();
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send(provisionalBatches.start, options);

    expect(startSpy).not.toHaveBeenCalled();
  });

  describe("source validation", () => {
    it("warns at warn log level when src is not a uc checkout URL", () => {
      const checkout = renderShopPay({ src: CN_SRC, "log-level": "warn" });
      vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("expected a Universal session URL"),
      );
    });

    it("does not warn when src is a uc checkout URL", () => {
      const checkout = renderShopPay({ "log-level": "warn" });
      vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not warn about source at the default error log level", () => {
      const checkout = renderShopPay({ src: CN_SRC });
      vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
