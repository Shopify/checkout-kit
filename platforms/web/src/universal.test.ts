import { afterEach, describe, expect, it, vi } from "vitest";

import { version } from "../package.json";

import provisionalBatches from "./__fixtures__/provisional-universal-checkout-batches.json";
import { ShopifyCheckout } from "./checkout";
import { mockTelemetry } from "./telemetry.test-helpers";
import * as universal from "./universal";
import type { ShopifyUniversalCheckout, UniversalCheckoutResourceEventDetail } from "./universal";

const UC_SRC = "https://shop.example.com/checkouts/uc/abc123?key=k";
const CN_SRC = "https://shop.example.com/checkouts/cn/abc123?key=k";
const SESSION_ID = "gid://shopify/UniversalCheckoutSession/123";
const FIRST_SHOP_ID = "gid://shopify/Shop/123";
const SECOND_SHOP_ID = "gid://shopify/Shop/456";

interface WireResourceParams {
  readonly context: { session_id: string; revision: number; shop_id: string };
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
  return { sessionId: context.session_id, revision: context.revision, shopId: context.shop_id };
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

function renderUniversalCheckout(
  attributes: Record<string, string> = {},
): ShopifyUniversalCheckout {
  const checkout = document.createElement("shopify-universal-checkout");
  checkout.setAttribute("src", UC_SRC);
  for (const [key, value] of Object.entries(attributes)) {
    checkout.setAttribute(key, value);
  }
  document.body.appendChild(checkout);
  return checkout;
}

function openPopupUniversalCheckout(attributes: Record<string, string> = {}) {
  const checkout = renderUniversalCheckout({ target: "popup", ...attributes });
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
  const opened = openPopupUniversalCheckout();
  opened.send(provisionalBatches.start);
  return opened;
}

describe("@shopify/checkout-kit/universal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("exports and registers a concrete sibling of ShopifyCheckout", () => {
    expect(customElements.get("shopify-universal-checkout")).toBe(
      universal.ShopifyUniversalCheckout,
    );
    expect(
      ShopifyCheckout.prototype.isPrototypeOf(universal.ShopifyUniversalCheckout.prototype),
    ).toBe(false);
    expect(Object.getPrototypeOf(universal.ShopifyUniversalCheckout.prototype)).toBe(
      Object.getPrototypeOf(ShopifyCheckout.prototype),
    );
  });

  it("negotiates the provisional Universal Checkout protocol version", () => {
    const { windowOpenSpy } = openPopupUniversalCheckout();

    const openedUrl = new URL(windowOpenSpy.mock.calls[0]![0] as string);
    expect(openedUrl.searchParams.get("ec_version")).toBe("2026-08-25");
    expect(openedUrl.searchParams.get("ec_delegate")).toBe("window.open");
    expect(openedUrl.searchParams.get("ck_version")).toBe(version);
  });

  it("answers a ready request batch with one matching response batch", () => {
    const { checkout, mockCheckoutWindow, send } = openPopupUniversalCheckout();

    send(provisionalBatches.ready.request);

    expect(mockCheckoutWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      provisionalBatches.ready.response,
      new URL(checkout.src).origin,
    );
  });

  it("dispatches one start event for a contiguous batch and exposes every checkout", () => {
    const { checkout, send } = openPopupUniversalCheckout();
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
    expect(checkout.checkout).toEqual({
      sessionId: SESSION_ID,
      revision: 1,
      resources: provisionalBatches.start.map(({ params }) => ({
        id: params.checkout.id,
        shopId: params.context.shop_id,
        checkout: publicSnapshot(params.checkout),
      })),
    });
    expect(startSpy.mock.calls[0]![0].detail[0].checkout).toBe(
      checkout.checkout?.resources[0]?.checkout,
    );
  });

  it("omits only top-level protocol metadata from checkout snapshots", () => {
    const { checkout, send } = openPopupUniversalCheckout();
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
    const unaffectedResource = checkout.checkout?.resources[1];
    const updateSpy = vi.fn();
    checkout.addEventListener("update", updateSpy);

    send(provisionalBatches.update);

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(provisionalBatches.update[0]!.params),
    ]);
    expect(checkout.checkout?.revision).toBe(2);
    expect(checkout.checkout?.resources[1]).toBe(unaffectedResource);
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

  it("preserves A-B-A wire order and commits the aggregate before the first listener", () => {
    const { checkout, send } = openPopupUniversalCheckout();
    const firstStart = clone(provisionalBatches.start[0]!);
    const firstUpdate = clone(provisionalBatches.update[0]!);
    firstUpdate.params.context.revision = 1;
    const secondStart = clone(provisionalBatches.start[1]!);
    const observed: Array<{
      type: string;
      shopIds: string[];
      detailStatuses: string[];
      aggregateStatuses: string[] | undefined;
    }> = [];
    const record = (event: { type: string; detail: UniversalCheckoutResourceEventDetail }) => {
      observed.push({
        type: event.type,
        shopIds: event.detail.map(({ context }) => context.shopId),
        detailStatuses: event.detail.map(({ checkout: snapshot }) => snapshot.status),
        aggregateStatuses: checkout.checkout?.resources.map((resource) => resource.checkout.status),
      });
    };
    checkout.addEventListener("start", record);
    checkout.addEventListener("update", record);

    send([firstStart, firstUpdate, secondStart]);

    expect(observed).toEqual([
      {
        type: "start",
        shopIds: [FIRST_SHOP_ID],
        detailStatuses: ["incomplete"],
        aggregateStatuses: ["ready_for_complete", "incomplete"],
      },
      {
        type: "update",
        shopIds: [FIRST_SHOP_ID],
        detailStatuses: ["ready_for_complete"],
        aggregateStatuses: ["ready_for_complete", "incomplete"],
      },
      {
        type: "start",
        shopIds: [SECOND_SHOP_ID],
        detailStatuses: ["incomplete"],
        aggregateStatuses: ["ready_for_complete", "incomplete"],
      },
    ]);
    expect(checkout.checkout?.revision).toBe(1);
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
    expect(checkout.checkout?.resources.map(({ checkout: snapshot }) => snapshot.status)).toEqual([
      "completed",
      "completed",
    ]);
  });

  it("keeps same-revision complete members but drops later groups in a terminal batch", () => {
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

    send([firstComplete, lateUpdate, secondComplete, lateError, lateStart]);

    expect(completeSpy).toHaveBeenCalledOnce();
    expect(completeSpy.mock.calls[0]![0].detail).toEqual([
      resourceDetail(firstComplete.params),
      resourceDetail(secondComplete.params),
    ]);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
    expect(checkout.checkout?.revision).toBe(3);
    expect(checkout.checkout?.resources.map(({ checkout: snapshot }) => snapshot.status)).toEqual([
      "completed",
      "completed",
    ]);
    expect(checkout.error).toBeUndefined();
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
    expect(checkout.checkout?.resources[0]?.checkout.status).toBe("completed");
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
    expect(checkout.checkout?.revision).toBe(3);
    expect(checkout.checkout?.resources[0]?.checkout.status).toBe("completed");
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
      { context: publicContext(firstError.params), scope: "resource", error: failure },
    ]);
    expect(checkout.error).toEqual({
      sessionId: SESSION_ID,
      revision: 4,
      errors: [
        {
          context: publicContext(firstError.params),
          shopId: FIRST_SHOP_ID,
          scope: "resource",
          error: failure,
        },
      ],
    });
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(
      updateSpy.mock.calls[0]![0].detail.map(
        ({ context }: { context: { shopId: string } }) => context.shopId,
      ),
    ).toEqual([SECOND_SHOP_ID]);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("keeps a completed shop when a sibling aborts between update and complete", () => {
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
    checkout.addEventListener("update", () => events.push("update"));
    checkout.addEventListener("error", () => events.push("error"));
    checkout.addEventListener("complete", () => events.push("complete"));

    send([completedUpdate, aborted, completed]);

    expect(events).toEqual(["update", "error", "complete"]);
    expect(checkout.checkout?.resources.map(({ checkout: resource }) => resource.status)).toEqual([
      "incomplete",
      "completed",
    ]);
    expect(checkout.error?.errors).toEqual([
      {
        context: { sessionId: SESSION_ID, revision: 2, shopId: FIRST_SHOP_ID },
        shopId: FIRST_SHOP_ID,
        scope: "resource",
        error: { code: "unknown", message: "The shops use different currencies." },
      },
    ]);

    const laterUpdate = clone(provisionalBatches.update[0]!);
    laterUpdate.params.context.revision = 3;
    send([laterUpdate]);
    expect(events).toEqual(["update", "error", "complete"]);
  });

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
    expect(checkout.error?.errors.map(({ error }) => error.code)).toEqual([
      "cart_expired",
      "unknown",
    ]);
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
    expect(checkout.error?.errors[0]?.error).toEqual(failure);
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

    expect(checkout.error?.revision).toBe(10);
    expect(checkout.error?.errors).toHaveLength(1);
    expect(checkout.checkout?.resources[0]?.id).toBe(
      provisionalBatches.start[0]!.params.checkout.id,
    );
    expect(checkout.checkout?.revision).toBe(1);
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
    expect(checkout.checkout?.revision).toBe(11);
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
    expect(checkout.error?.errors).toHaveLength(2);
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
    const { checkout, send } = openPopupUniversalCheckout();
    const sessionError = clone(provisionalBatches.error[0]!);
    Reflect.deleteProperty(sessionError.params.context, "shop_id");
    Object.assign(sessionError.params.context, { scope: "session" });
    const errorSpy = vi.fn();
    checkout.addEventListener("error", errorSpy);

    send([sessionError]);

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0].detail[0].scope).toBe("session");
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
    const { send } = openPopupUniversalCheckout();
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
    const { send } = openPopupUniversalCheckout();
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
    const { checkout, send } = openPopupUniversalCheckout();
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
    expect(checkout.checkout?.resources[0]?.checkout).toBe(snapshot);
  });

  it("treats an own undefined notification id as absent but rejects an invalid id", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupUniversalCheckout();
    const valid = { ...clone(provisionalBatches.start[0]!), id: undefined };
    const invalid = { ...clone(provisionalBatches.start[1]!), id: { invalid: true } };
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    const batch = structuredClone([valid, invalid]);
    expect(Object.hasOwn(batch[0]!, "id")).toBe(true);
    send(batch);

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.calls[0]![0].detail).toEqual([resourceDetail(valid.params)]);
    expect(checkout.checkout?.resources.map(({ shopId }) => shopId)).toEqual([FIRST_SHOP_ID]);
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
    const { checkout, send } = openPopupUniversalCheckout();
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
    expect(checkout.checkout?.resources.map(({ shopId }) => shopId)).toEqual([FIRST_SHOP_ID]);
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
    const { checkout, send } = openPopupUniversalCheckout();
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
    expect(checkout.checkout?.resources.map(({ shopId }) => shopId)).toEqual([FIRST_SHOP_ID]);
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
    const { checkout, send } = openPopupUniversalCheckout();
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
    expect(checkout.checkout?.resources.map(({ shopId }) => shopId)).toEqual([FIRST_SHOP_ID]);
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
        scope: "resource",
        error: { code: "sdk_error", message: expect.any(String) },
      },
    ]);
    expect(checkout.error?.errors).toEqual([
      {
        context: publicContext(wireError.params),
        shopId: FIRST_SHOP_ID,
        scope: "resource",
        error: { code: "sdk_error", message: expect.any(String) },
      },
    ]);
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0]![0].detail[0].context.shopId).toBe(SECOND_SHOP_ID);
    expect(checkout.checkout?.resources[0]?.checkout.status).toBe("incomplete");
    expect(checkout.checkout?.resources[1]?.checkout.status).toBe("ready_for_complete");
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
    expect(checkout.error).toBeUndefined();
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
    expect(errorSpy.mock.calls[0]![0].detail).toEqual([
      { context, scope: "session", error: failure },
    ]);
    expect(checkout.error?.errors).toEqual([{ context, scope: "session", error: failure }]);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(checkout.checkout?.revision).toBe(1);
  });

  it("answers unsupported and malformed requests with JSON-RPC errors", () => {
    const { checkout, mockCheckoutWindow, send } = openPopupUniversalCheckout();

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

  it("opens window.open requests and answers with the standard result", () => {
    const { checkout, mockCheckoutWindow, send, windowOpenSpy } = openPopupUniversalCheckout();

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

  it("keeps event details and aggregate snapshots immutable across later updates", () => {
    const { checkout, send } = openPopupUniversalCheckout();
    const start = structuredClone(provisionalBatches.start);
    const startSpy = vi.fn();
    checkout.addEventListener("start", startSpy);

    send(start);

    const firstDetail = startSpy.mock.calls[0]![0].detail;
    const firstAggregate = checkout.checkout;
    expect(Object.isFrozen(firstDetail)).toBe(true);
    expect(Object.isFrozen(firstDetail[0].context)).toBe(true);
    expect(Object.isFrozen(firstDetail[0].checkout)).toBe(true);
    expect(Object.isFrozen(firstDetail[0].checkout.lineItems)).toBe(true);
    expect(Object.isFrozen(firstAggregate)).toBe(true);
    expect(Object.isFrozen(firstAggregate?.resources)).toBe(true);
    Object.assign(start[0]!.params.checkout, { status: "completed" });

    send(provisionalBatches.update);

    expect(firstDetail[0].checkout.status).toBe("incomplete");
    expect(firstAggregate?.resources[0]?.checkout.status).toBe("incomplete");
    expect(checkout.checkout?.resources[0]?.checkout.status).toBe("ready_for_complete");
  });

  it("dispatches close with null detail when the presentation closes", () => {
    const { checkout } = openPopupUniversalCheckout();
    const closeSpy = vi.fn();
    checkout.addEventListener("close", closeSpy);

    checkout.close();

    expect(closeSpy).toHaveBeenCalledOnce();
    expect((closeSpy.mock.calls[0]![0] as CustomEvent).detail).toBeNull();
  });

  it("ignores old messages after close and binds a reopened session to its new window", () => {
    const {
      checkout,
      mockCheckoutWindow: firstWindow,
      windowOpenSpy,
      send,
    } = openPopupUniversalCheckout();
    send(provisionalBatches.start);
    checkout.close();

    send(provisionalBatches.update);
    expect(checkout.checkout?.revision).toBe(1);
    const secondWindow = createMockWindow();
    windowOpenSpy.mockReturnValue(secondWindow);
    checkout.open();
    expect(checkout.checkout).toBeUndefined();

    send(provisionalBatches.ready.request, { source: firstWindow });
    send(provisionalBatches.start, { source: firstWindow });
    expect(firstWindow.postMessage).not.toHaveBeenCalled();
    expect(checkout.checkout).toBeUndefined();

    send(provisionalBatches.ready.request, { source: secondWindow });
    send(provisionalBatches.start, { source: secondWindow });
    expect(secondWindow.postMessage).toHaveBeenCalledExactlyOnceWith(
      provisionalBatches.ready.response,
      new URL(checkout.src).origin,
    );
    expect(checkout.checkout?.resources).toHaveLength(2);
  });

  it("reports malformed protocol envelopes without exposing payloads or logging unrelated traffic", () => {
    const decodeSpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
    const errorLogSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkout, send } = openPopupUniversalCheckout();

    send(provisionalBatches.start[0]);
    send([]);
    send({ jsonrpc: "2.0", id: "response-example", result: {} });
    send({ kind: "unrelated" });
    send("unrelated");

    expect(checkout.checkout).toBeUndefined();
    expect(errorLogSpy.mock.calls).toEqual(
      Array.from({ length: 3 }, () => [
        "<shopify-universal-checkout>: dropped malformed Universal Checkout protocol batch",
      ]),
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
      const { send } = openPopupUniversalCheckout(attributes);

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
    const { checkout, send } = openPopupUniversalCheckout();

    send(provisionalBatches.start, options);

    expect(checkout.checkout).toBeUndefined();
  });

  describe("source validation", () => {
    it("warns at warn log level when src is not a uc checkout URL", () => {
      const checkout = renderUniversalCheckout({ src: CN_SRC, "log-level": "warn" });
      vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("expected a Universal Checkout continuation URL"),
      );
    });

    it("does not warn when src is a uc checkout URL", () => {
      const checkout = renderUniversalCheckout({ "log-level": "warn" });
      vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not warn about source at the default error log level", () => {
      const checkout = renderUniversalCheckout({ src: CN_SRC });
      vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
