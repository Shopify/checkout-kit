import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmbeddedCheckoutProtocol,
  type ErrorResponse,
  type Message,
} from "@shopify/checkout-kit-protocol";

import type { CheckoutProtocolMessageMap } from "./checkout.types";
import "./checkout-web-component";
import type { ShopifyCheckout } from "./checkout";
import { mockTelemetry } from "./telemetry.test-helpers";
import { ShopifyCheckoutLinkClickEvent } from "./checkout-events";

const EMBED_PROTOCOL_VERSION = EmbeddedCheckoutProtocol.specVersion;
const CHECKOUT_CHANGE_METHODS = [
  "ec.line_items.change",
  "ec.fulfillment.change",
  "ec.totals.change",
  "ec.messages.change",
] as const;

describe("<shopify-checkout>", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    // Disconnect elements so their global message listeners do not leak
    // into tests in this file or another concurrently running suite.
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("it subscribes to checkout-protocol events", () => {
    describe("ec.ready handshake", () => {
      it("auto-responds with an empty result and does not dispatch a DOM event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onReadySpy = vi.fn();
        // ec.ready is no longer a public event; cast through `never` to verify
        // that the component does not dispatch one.
        checkout.addEventListener("ec.ready" as never, onReadySpy as EventListener);

        simulateProtocolMessageEvent(
          checkout,
          "ec.ready",
          { delegate: [] },
          { id: "ready-1", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "ready-1",
            result: { ucp: { status: "success", version: EMBED_PROTOCOL_VERSION } },
          },
          new URL(checkout.src).origin,
        );
        expect(onReadySpy).not.toHaveBeenCalled();
      });

      it("does not post a response when id is missing", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();

        simulateProtocolMessageEvent(
          checkout,
          "ec.ready",
          { delegate: [] },
          { source: mockCheckoutWindow },
        );

        expect(mockCheckoutWindow.postMessage).not.toHaveBeenCalled();
      });
    });

    describe("unsupported protocol methods", () => {
      it("posts method-not-found for unsupported requests", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const targetOrigin = new URL(checkout.src).origin;

        simulateRawMessageEvent(
          checkout,
          {
            jsonrpc: "2.0",
            method: "ep.cart.ready",
            id: "unsupported-1",
            params: {},
          },
          { source: mockCheckoutWindow },
        );

        await flushProtocolDispatch();

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "unsupported-1",
            error: {
              code: -32601,
              message: "Method not found",
            },
          },
          targetOrigin,
        );
      });

      it("posts method-not-found for unsupported requests with a null id", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const targetOrigin = new URL(checkout.src).origin;

        simulateRawMessageEvent(
          checkout,
          {
            jsonrpc: "2.0",
            method: "ep.cart.ready",
            id: null,
            params: {},
          },
          { source: mockCheckoutWindow },
        );

        await flushProtocolDispatch();

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32601,
              message: "Method not found",
            },
          },
          targetOrigin,
        );
      });

      it("ignores unsupported requests with unusable request ids", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();

        // `{}` and `true` are not valid JSON-RPC ids, so the shared decoder
        // drops them entirely. (`null` is valid — see the test above.)
        for (const id of [{}, true]) {
          simulateRawMessageEvent(
            checkout,
            {
              jsonrpc: "2.0",
              method: "ep.cart.ready",
              id,
              params: {},
            },
            { source: mockCheckoutWindow },
          );
        }

        simulateRawMessageEvent(
          checkout,
          {
            jsonrpc: "2.0",
            method: "ep.cart.ready",
            params: {},
          },
          { source: mockCheckoutWindow },
        );

        expect(mockCheckoutWindow.postMessage).not.toHaveBeenCalled();
      });

      it.each(["customMethod", "ec.buyer.change", "ec.payment.change"])(
        "ignores unsupported notification %s",
        async (method) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const updateSpy = vi.fn();
          checkout.addEventListener("update", updateSpy);

          simulateRawMessageEvent(
            checkout,
            {
              jsonrpc: "2.0",
              method,
              params: makeCheckoutPayload(),
            },
            { source: mockCheckoutWindow },
          );

          await flushProtocolDispatch();

          expect(mockCheckoutWindow.postMessage).not.toHaveBeenCalled();
          expect(updateSpy).not.toHaveBeenCalled();
          expect(checkout.checkout).toBeUndefined();
        },
      );

      it("logs an error with the decode error when a notification payload fails to decode at the default log level", () => {
        const checkout = renderCheckout({ target: "popup" });
        const mockCheckoutWindow = createMockWindow();
        vi.spyOn(window, "open").mockReturnValue(mockCheckoutWindow);
        vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
        vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
        checkout.open();

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        simulateRawMessageEvent(
          checkout,
          { jsonrpc: "2.0", method: "ec.start", params: {} },
          { source: mockCheckoutWindow },
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "<shopify-checkout>: dropped ec.start: failed to decode payload",
          expect.stringContaining("Invalid"),
        );
      });
    });

    describe("ec.start", () => {
      it("updates the checkout property and dispatches a start event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "start", onStartSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toEqual(decodeCheckout(payload));
        expect(onStartSpy).toHaveBeenCalledOnce();
      });

      it("measures navigation from before the checkout window opens", async () => {
        let now = 100;
        vi.spyOn(performance, "now").mockImplementation(() => now);
        const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
        const checkout = renderCheckout({ target: "popup" });
        const mockCheckoutWindow = createMockWindow();
        vi.spyOn(window, "open").mockImplementation(() => {
          now = 200;
          return mockCheckoutWindow;
        });
        vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
        vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

        checkout.open();
        now = 300;
        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
        });
        await flushProtocolDispatch();

        expect(durationSpy).toHaveBeenCalledWith({
          milliseconds: 200,
          result: "success",
          preloaded: false,
        });
      });
    });

    describe("ec.complete", () => {
      it("updates the checkout property and dispatches a complete event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onCompleteSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "complete", onCompleteSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.complete", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toEqual(decodeCheckout(payload));
        expect(onCompleteSpy).toHaveBeenCalledOnce();
      });
    });

    describe("ec.error", () => {
      it("updates the error property and dispatches an error event", async () => {
        const telemetry = mockTelemetry();
        const telemetrySpy = vi.spyOn(telemetry, "recordError");
        const durationSpy = vi.spyOn(telemetry, "recordNavigationDuration");
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "error", onErrorSpy);

        const errorParams = makeErrorParams({ severity: "recoverable" });
        simulateProtocolMessageEvent(checkout, "ec.error", errorParams, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.error).toEqual({ code: "unknown", message: "Session failed" });
        expect(onErrorSpy).toHaveBeenCalledOnce();
        expect(telemetrySpy).toHaveBeenCalledWith({
          category: "protocol",
          stage: "message",
          code: "terminal_error",
          retryable: false,
          isRetry: false,
        });
        expect(durationSpy).toHaveBeenCalledWith({
          milliseconds: expect.any(Number),
          result: "failure",
          preloaded: false,
        });
      });

      it("ignores the old ec.error shape with ucp and messages directly in params", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        checkout.addEventListener("error", onErrorSpy);

        const errorPayload = makeErrorPayload();
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              jsonrpc: "2.0",
              method: "ec.error",
              params: errorPayload,
            },
            origin: new URL(checkout.src).origin,
            source: mockCheckoutWindow,
          }),
        );
        await flushProtocolDispatch();

        expect(checkout.error).toBeUndefined();
        expect(onErrorSpy).not.toHaveBeenCalled();
      });

      it("auto-closes when any message has severity 'unrecoverable'", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const errorOrder: string[] = [];
        checkout.addEventListener("error", () => errorOrder.push("error"));
        checkout.addEventListener("close", () => errorOrder.push("close"));

        simulateProtocolMessageEvent(
          checkout,
          "ec.error",
          {
            error: {
              ...makeErrorPayload(),
              messages: [
                ...makeErrorPayload({ severity: "recoverable" }).messages,
                ...makeErrorPayload({ severity: "unrecoverable" }).messages,
              ],
            },
          },
          { source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(errorOrder).toStrictEqual(["error", "close"]);
      });

      const ERROR_SEVERITIES: ReadonlyArray<Message["severity"]> = [
        "unrecoverable",
        "recoverable",
        "requires_buyer_input",
        "requires_buyer_review",
      ];
      it.each(ERROR_SEVERITIES)(
        "auto-closes when message severity is %s",
        async (severity: Message["severity"]) => {
          const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const errorOrder: string[] = [];
          checkout.addEventListener("error", () => errorOrder.push("error"));
          checkout.addEventListener("close", () => errorOrder.push("close"));

          simulateProtocolMessageEvent(checkout, "ec.error", makeErrorParams({ severity }), {
            source: mockCheckoutWindow,
          });
          await flushProtocolDispatch();

          expect(errorOrder).toStrictEqual(["error", "close"]);
          expect(durationSpy).toHaveBeenCalledWith({
            milliseconds: expect.any(Number),
            result: "failure",
            preloaded: false,
          });
        },
      );

      it("does not crash when ec.error messages is not an array", async () => {
        const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        const closeSpy = vi.fn();
        checkout.addEventListener("error", onErrorSpy);
        checkout.addEventListener("close", closeSpy);

        const nodeProcess = (
          globalThis as unknown as {
            process: {
              on(event: "unhandledRejection", listener: (reason: unknown) => void): void;
              off(event: "unhandledRejection", listener: (reason: unknown) => void): void;
            };
          }
        ).process;
        const rejections: unknown[] = [];
        const onRejection = (reason: unknown) => rejections.push(reason);
        nodeProcess.on("unhandledRejection", onRejection);

        try {
          simulateProtocolMessageEvent(
            checkout,
            "ec.error",
            {
              error: {
                ucp: { version: EMBED_PROTOCOL_VERSION, status: "error" },
                messages: "not-an-array",
              },
            },
            { source: mockCheckoutWindow },
          );
          await flushProtocolDispatch();
          await flushProtocolDispatch();
        } finally {
          nodeProcess.off("unhandledRejection", onRejection);
        }

        expect(rejections).toEqual([]);
        expect(onErrorSpy).toHaveBeenCalledOnce();
        expect(closeSpy).toHaveBeenCalledOnce();
        expect(durationSpy).toHaveBeenCalledWith({
          milliseconds: expect.any(Number),
          result: "failure",
          preloaded: false,
        });
      });
    });

    describe("checkout updates", () => {
      it.each(CHECKOUT_CHANGE_METHODS)(
        "%s updates the checkout property and emits one update event",
        async (method) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const updateSpy = vi.fn();
          checkout.addEventListener("update", updateSpy);
          const payload = makeCheckoutPayload();

          simulateProtocolMessageEvent(checkout, method, payload, {
            source: mockCheckoutWindow,
          });
          await flushProtocolDispatch();

          expect(updateSpy).toHaveBeenCalledOnce();
          expect(checkout.checkout).toEqual(decodeCheckout(payload));
          expect(updateSpy.mock.calls[0]![0].detail.checkout).toBe(checkout.checkout);
        },
      );

      it("deduplicates structurally equal snapshots across change methods", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const updateSpy = vi.fn();
        checkout.addEventListener("update", updateSpy);
        const extension = { enabled: true, nested: { first: 1, second: 2 } };
        const payload = makeCheckoutPayload({ "com.example.extension": extension });
        const reordered = makeCheckoutPayload({
          "com.example.extension": { nested: { second: 2, first: 1 }, enabled: true },
        });
        reordered.checkout = {
          "com.example.extension": reordered.checkout["com.example.extension"],
          ...reordered.checkout,
        };

        for (const [index, method] of CHECKOUT_CHANGE_METHODS.entries()) {
          simulateProtocolMessageEvent(checkout, method, index === 0 ? payload : reordered, {
            source: mockCheckoutWindow,
          });
          await flushProtocolDispatch();
        }

        expect(updateSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("emits each changed snapshot even when it returns to an earlier value", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const updateSpy = vi.fn();
        checkout.addEventListener("update", updateSpy);

        for (const amount of [1000, 1200, 1000]) {
          simulateProtocolMessageEvent(
            checkout,
            "ec.totals.change",
            makeCheckoutPayload({ totals: [{ type: "total", amount }] }),
            { source: mockCheckoutWindow },
          );
          await flushProtocolDispatch();
        }

        expect(updateSpy).toHaveBeenCalledTimes(3);
        expect(checkout.checkout?.totals[0]?.amount).toBe(1000);
      });

      it("uses start and complete snapshots as the update baseline without deduplicating lifecycle events", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const startSpy = vi.fn();
        const updateSpy = vi.fn();
        const completeSpy = vi.fn();
        checkout.addEventListener("start", startSpy);
        checkout.addEventListener("update", updateSpy);
        checkout.addEventListener("complete", completeSpy);

        for (const method of [
          "ec.start",
          "ec.start",
          "ec.totals.change",
          "ec.complete",
          "ec.complete",
          "ec.messages.change",
        ] as const) {
          simulateProtocolMessageEvent(checkout, method, makeCheckoutPayload(), {
            source: mockCheckoutWindow,
          });
          await flushProtocolDispatch();
        }

        expect(startSpy).toHaveBeenCalledTimes(2);
        expect(completeSpy).toHaveBeenCalledTimes(2);
        expect(updateSpy).not.toHaveBeenCalled();
      });

      it("resets update deduplication when a new checkout session opens", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const updateSpy = vi.fn();
        checkout.addEventListener("update", updateSpy);
        const payload = makeCheckoutPayload();

        simulateProtocolMessageEvent(checkout, "ec.totals.change", payload, {
          source: mockCheckoutWindow,
        });
        await flushProtocolDispatch();
        checkout.open();
        simulateProtocolMessageEvent(checkout, "ec.totals.change", payload, {
          source: mockCheckoutWindow,
        });
        await flushProtocolDispatch();

        expect(updateSpy).toHaveBeenCalledTimes(2);
      });

      it("does not dispatch raw protocol names as public DOM events", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const rawEventSpy = vi.fn();
        const snapshotMethods = ["ec.start", ...CHECKOUT_CHANGE_METHODS, "ec.complete"] as const;
        for (const method of [...snapshotMethods, "ec.error", "ec.close"]) {
          (checkout as HTMLElement).addEventListener(method, rawEventSpy);
        }

        for (const method of snapshotMethods) {
          simulateProtocolMessageEvent(checkout, method, makeCheckoutPayload(), {
            source: mockCheckoutWindow,
          });
          await flushProtocolDispatch();
        }
        simulateProtocolMessageEvent(
          checkout,
          "ec.error",
          makeErrorParams({ severity: "recoverable" }),
          {
            source: mockCheckoutWindow,
          },
        );
        await flushProtocolDispatch();
        checkout.close();

        expect(rawEventSpy).not.toHaveBeenCalled();
      });
    });

    describe("event.detail payloads", () => {
      it("start carries {checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "start", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toStrictEqual({ checkout: decodeCheckout(payload) });
      });

      it("complete carries {checkout} with order nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "complete", spy);

        const order = {
          id: "order-1",
          permalink_url: "https://example.com/orders/1",
        };
        const payload = makeCheckoutPayload({ order });
        simulateProtocolMessageEvent(checkout, "ec.complete", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        const decoded = decodeCheckout(payload);
        expect(event.detail).toStrictEqual({ checkout: decoded });
        expect(event.detail.checkout.order).toEqual(decoded.order);
      });

      it("complete keeps an absent order nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "complete", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.complete", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        const decoded = decodeCheckout(payload);
        expect(event.detail).toStrictEqual({ checkout: decoded });
        expect(event.detail.checkout.order).toBeUndefined();
      });

      it("error carries {error}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "error", spy);

        const errorParams = makeErrorParams();
        simulateProtocolMessageEvent(checkout, "ec.error", errorParams, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toStrictEqual({
          error: { code: "unknown", message: "Session failed" },
        });
        expect(event.detail.error).toBe(checkout.error);
      });

      it("update from ec.line_items.change carries {checkout} with lineItems nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "update", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.line_items.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        const decoded = decodeCheckout(payload);
        expect(event.detail).toStrictEqual({ checkout: decoded });
        expect(event.detail.checkout.lineItems).toEqual(decoded.lineItems);
      });

      it("update from ec.fulfillment.change carries {checkout} with fulfillment nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "update", spy);

        const fulfillment = {
          methods: [
            {
              id: "method-1",
              type: "shipping",
              line_item_ids: [],
              selected_destination_id: "destination-1",
              destinations: [
                {
                  id: "destination-1",
                  street_address: "123 Main Street",
                  address_country: "US",
                },
              ],
            },
          ],
        };
        const payload = makeCheckoutPayload({ fulfillment });
        simulateProtocolMessageEvent(checkout, "ec.fulfillment.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        const decoded = decodeCheckout(payload);
        expect(event.detail).toStrictEqual({ checkout: decoded });
        expect(event.detail.checkout.fulfillment).toEqual(decoded.fulfillment);
      });

      it("update from ec.totals.change carries {checkout} with totals nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "update", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.totals.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        const decoded = decodeCheckout(payload);
        expect(event.detail).toStrictEqual({ checkout: decoded });
        expect(event.detail.checkout.totals).toEqual(decoded.totals);
      });

      it("update from ec.messages.change carries {checkout} with messages nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "update", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.messages.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        const decoded = decodeCheckout(payload);
        expect(event.detail).toStrictEqual({ checkout: decoded });
        expect(event.detail.checkout.messages).toEqual(decoded.messages);
      });

      it("close carries no detail", () => {
        const { checkout } = openPopupCheckout();
        const spy = vi.fn();
        checkout.addEventListener("close", spy);

        checkout.close();

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toBeNull();
      });
    });

    describe("ec.window.open_request", () => {
      it("dispatches linkclick with a parsed URL before applying the default open action", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open").mockClear();
        const linkSpy = vi.fn((event: ShopifyCheckoutLinkClickEvent) => {
          expect(event).toBeInstanceOf(ShopifyCheckoutLinkClickEvent);
          expect(event.detail.link.url).toBeInstanceOf(URL);
          expect(event.detail.link.url.href).toBe("https://example.com/policy");
          expect(windowOpenSpy).not.toHaveBeenCalled();
        });
        checkout.addEventListener("linkclick", linkSpy);

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/policy" },
          { id: "link-default", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(linkSpy).toHaveBeenCalledOnce();
        expect(windowOpenSpy).toHaveBeenCalledWith(
          "https://example.com/policy",
          "_blank",
          "noopener",
        );
        expectLinkResponse(checkout, mockCheckoutWindow, "link-default", "success");
      });

      it.each(["javascript:alert(1)", "https://other.example.com/replaced"])(
        "opens the original validated URL when a listener changes its URL to %s",
        async (replacement) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const windowOpenSpy = vi.spyOn(window, "open").mockClear();
          checkout.addEventListener("linkclick", (event) => {
            event.detail.link.url.href = replacement;
            event.respondWith("open");
          });

          simulateProtocolMessageEvent(
            checkout,
            "ec.window.open_request",
            { url: "https://example.com/policy" },
            { id: "link-mutated", source: mockCheckoutWindow },
          );
          await flushProtocolDispatch();

          expect(windowOpenSpy).toHaveBeenCalledExactlyOnceWith(
            "https://example.com/policy",
            "_blank",
            "noopener",
          );
          expectLinkResponse(checkout, mockCheckoutWindow, "link-mutated", "success");
        },
      );

      it.each(["open", "handled", "cancel"] as const)(
        "honors the consumer's synchronous %s action",
        async (action) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const windowOpenSpy = vi.spyOn(window, "open").mockClear();
          const errorSpy = vi.fn();
          const closeSpy = vi.fn();
          checkout.addEventListener("error", errorSpy);
          checkout.addEventListener("close", closeSpy);
          checkout.addEventListener("linkclick", (event) => event.respondWith(action));

          simulateProtocolMessageEvent(
            checkout,
            "ec.window.open_request",
            { url: "https://example.com/policy" },
            { id: "link-action", source: mockCheckoutWindow },
          );
          await flushProtocolDispatch();

          expect(windowOpenSpy).toHaveBeenCalledTimes(action === "open" ? 1 : 0);
          expectLinkResponse(
            checkout,
            mockCheckoutWindow,
            "link-action",
            action === "cancel" ? "error" : "success",
          );
          expect(errorSpy).not.toHaveBeenCalled();
          expect(closeSpy).not.toHaveBeenCalled();
          expect(checkout.error).toBeUndefined();
        },
      );

      it.each(["open", "handled", "cancel"] as const)(
        "awaits a registered promise before applying its %s action",
        async (action) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const windowOpenSpy = vi.spyOn(window, "open").mockClear();
          let resolveAction!: (action: "open" | "handled" | "cancel") => void;
          const response = new Promise<"open" | "handled" | "cancel">((resolve) => {
            resolveAction = resolve;
          });
          checkout.addEventListener("linkclick", (event) => event.respondWith(response));

          simulateProtocolMessageEvent(
            checkout,
            "ec.window.open_request",
            { url: "https://example.com/policy" },
            { id: "link-async", source: mockCheckoutWindow },
          );
          await flushProtocolDispatch();

          expect(windowOpenSpy).not.toHaveBeenCalled();
          expect(mockCheckoutWindow.postMessage).not.toHaveBeenCalled();
          resolveAction(action);
          await flushProtocolDispatch();

          expect(windowOpenSpy).toHaveBeenCalledTimes(action === "open" ? 1 : 0);
          expectLinkResponse(
            checkout,
            mockCheckoutWindow,
            "link-async",
            action === "cancel" ? "error" : "success",
          );
        },
      );

      it.each(["close", "reopen", "disconnect"] as const)(
        "rejects a pending link when the checkout session ends through %s",
        async (action) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const windowOpenSpy = vi.spyOn(window, "open").mockClear();
          let resolveAction!: (action: "open") => void;
          const response = new Promise<"open">((resolve) => {
            resolveAction = resolve;
          });
          checkout.addEventListener("linkclick", (event) => event.respondWith(response));

          simulateProtocolMessageEvent(
            checkout,
            "ec.window.open_request",
            { url: "https://example.com/obsolete" },
            { id: "link-ended-session", source: mockCheckoutWindow },
          );
          await flushProtocolDispatch();
          expect(mockCheckoutWindow.postMessage).not.toHaveBeenCalled();

          if (action === "reopen") {
            windowOpenSpy.mockReturnValueOnce(createMockWindow());
            checkout.open();
            windowOpenSpy.mockClear();
          } else if (action === "disconnect") {
            checkout.remove();
          } else {
            checkout.close();
          }
          await flushProtocolDispatch();

          expectLinkResponse(checkout, mockCheckoutWindow, "link-ended-session", "error");
          resolveAction("open");
          await flushProtocolDispatch();

          expect(windowOpenSpy).not.toHaveBeenCalled();
          expect(mockCheckoutWindow.postMessage).toHaveBeenCalledOnce();
        },
      );

      it("rejects a resolved link action if the session closes before the action is applied", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open").mockClear();
        let resolveAction!: (action: "open") => void;
        const response = new Promise<"open">((resolve) => {
          resolveAction = resolve;
        });
        checkout.addEventListener("linkclick", (event) => event.respondWith(response));

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/obsolete" },
          { id: "link-close-race", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        resolveAction("open");
        queueMicrotask(() => checkout.close());
        await flushProtocolDispatch();

        expectLinkResponse(checkout, mockCheckoutWindow, "link-close-race", "error");
        expect(windowOpenSpy).not.toHaveBeenCalled();
      });

      it("cancels a link when the consumer prevents the default action", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open").mockClear();
        const errorSpy = vi.fn();
        const closeSpy = vi.fn();
        checkout.addEventListener("error", errorSpy);
        checkout.addEventListener("close", closeSpy);
        checkout.addEventListener("linkclick", (event) => event.preventDefault());

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/policy" },
          { id: "link-prevented", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expectLinkResponse(checkout, mockCheckoutWindow, "link-prevented", "error");
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(closeSpy).not.toHaveBeenCalled();
        expect(checkout.error).toBeUndefined();
      });

      it("rejects the protocol request when the consumer's response promise rejects", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open").mockClear();
        const errorSpy = vi.fn();
        const closeSpy = vi.fn();
        checkout.addEventListener("error", errorSpy);
        checkout.addEventListener("close", closeSpy);
        checkout.addEventListener("linkclick", (event) => {
          event.respondWith(Promise.reject(new Error("Consumer could not handle link")));
        });

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/policy" },
          { id: "link-rejected", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expectLinkResponse(checkout, mockCheckoutWindow, "link-rejected", "error");
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(closeSpy).not.toHaveBeenCalled();
        expect(checkout.error).toBeUndefined();
      });

      it("allows only one response registration across all link listeners", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open").mockClear();
        checkout.addEventListener("linkclick", (event) => event.respondWith("handled"));
        const secondListener = vi.fn((event: ShopifyCheckoutLinkClickEvent) => {
          expect(() => event.respondWith("open")).toThrow(DOMException);
        });
        checkout.addEventListener("linkclick", secondListener);

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/policy" },
          { id: "link-once", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(secondListener).toHaveBeenCalledOnce();
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expectLinkResponse(checkout, mockCheckoutWindow, "link-once", "success");
      });

      it("requires respondWith to be called during synchronous event dispatch", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open").mockClear();
        let linkEvent!: ShopifyCheckoutLinkClickEvent;
        checkout.addEventListener("linkclick", (event) => {
          linkEvent = event;
        });

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/policy" },
          { id: "link-late", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(linkEvent).toBeDefined();
        expect(() => linkEvent.respondWith("cancel")).toThrow(DOMException);
        expect(windowOpenSpy).toHaveBeenCalledOnce();
        expectLinkResponse(checkout, mockCheckoutWindow, "link-late", "success");
      });

      it("opens the requested url in a new tab with noopener when an id is present", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open");

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/return" },
          { id: "open-1", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(windowOpenSpy).toHaveBeenLastCalledWith(
          "https://example.com/return",
          "_blank",
          "noopener",
        );
      });

      it("posts a JSON-RPC response back to the source", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        vi.spyOn(window, "open").mockReturnValue(null);

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/return" },
          { id: "open-resp", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-resp",
            result: { ucp: { status: "success", version: EMBED_PROTOCOL_VERSION } },
          },
          new URL(checkout.src).origin,
        );
      });

      it("does not open an auxiliary window when the request has no id", () => {
        const checkout = renderCheckout({ target: "popup" });
        const mockCheckoutWindow = createMockWindow();
        const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(mockCheckoutWindow);
        vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
        vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
        checkout.open();
        expect(windowOpenSpy).toHaveBeenCalledOnce();

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/return" },
          { source: mockCheckoutWindow },
        );

        expect(windowOpenSpy).toHaveBeenCalledOnce();
      });

      it("posts JSON-RPC errors when params are missing or malformed", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          {},
          {
            id: "open-missing",
            source: mockCheckoutWindow,
          },
        );

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: 42 },
          {
            id: "open-malformed",
            source: mockCheckoutWindow,
          },
        );

        await flushProtocolDispatch();

        const targetOrigin = new URL(checkout.src).origin;

        // The shared client can't decode a request without a valid `url`, so
        // the handler never runs. The host preserves the diagnostic warning,
        // logging the raw message data that failed to decode.
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("ec.window.open_request received without a valid url"),
          expect.objectContaining({ method: "ec.window.open_request" }),
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-missing",
            error: {
              code: -32602,
              message: "Invalid params",
            },
          },
          targetOrigin,
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-malformed",
            error: {
              code: -32602,
              message: "Invalid params",
            },
          },
          targetOrigin,
        );
      });

      it("rejects the request when the url string cannot be parsed", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const linkSpy = vi.fn();
        checkout.addEventListener("linkclick", linkSpy);

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "not a real url" },
          { id: "open-bad-url", source: mockCheckoutWindow },
        );

        await flushProtocolDispatch();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("ec.window.open_request received without a valid url"),
          expect.objectContaining({ url: "not a real url" }),
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonrpc: "2.0",
            id: "open-bad-url",
            result: expect.objectContaining({
              ucp: { status: "error", version: EMBED_PROTOCOL_VERSION },
            }),
          }),
          new URL(checkout.src).origin,
        );
        expect(linkSpy).not.toHaveBeenCalled();
      });

      it("rejects the request when the url uses a non-https scheme", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
        const windowOpenSpy = vi.spyOn(window, "open");
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const linkSpy = vi.fn();
        checkout.addEventListener("linkclick", linkSpy);

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "http://example.com/insecure" },
          { id: "open-http", source: mockCheckoutWindow },
        );

        await flushProtocolDispatch();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("ec.window.open_request received without a valid url"),
          expect.objectContaining({ url: "http://example.com/insecure" }),
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonrpc: "2.0",
            id: "open-http",
            result: expect.objectContaining({
              ucp: { status: "error", version: EMBED_PROTOCOL_VERSION },
            }),
          }),
          new URL(checkout.src).origin,
        );
        expect(windowOpenSpy).not.toHaveBeenCalledWith(
          "http://example.com/insecure",
          "_blank",
          "noopener",
        );
        expect(linkSpy).not.toHaveBeenCalled();
      });

      it("does not warn about an invalid url when the handler throws internally", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(window, "open").mockImplementation(() => {
          throw new Error("popup blocked");
        });

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/return" },
          { id: "open-throw", source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining("ec.window.open_request received without a valid url"),
          expect.anything(),
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonrpc: "2.0",
            id: "open-throw",
            error: expect.objectContaining({ code: -32603 }),
          }),
          new URL(checkout.src).origin,
        );
      });
    });

    describe("message routing", () => {
      it("accepts protocol messages from the cart URL origin by default", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: new URL(checkout.src).origin,
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("accepts protocol messages from shop.app by default", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://shop.app",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("drops protocol messages from an untrusted HTTPS origin by default", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("accepts protocol messages from a configured allowed origin", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "https://other.example.com",
        });
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("accepts an exact configured origin with a trailing slash", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "https://other.example.com/",
        });
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
      });

      it.each([
        "https://user@other.example.com",
        "https://other.example.com/path",
        "https://other.example.com?query=value",
        "https://other.example.com#fragment",
      ])("ignores a configured URL that is not an origin: %s", async (pattern) => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": pattern,
        });
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
      });

      it("accepts protocol messages from a shop.app subdomain by default", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://checkout.shop.app",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("accepts protocol messages matching a configured wildcard subdomain", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "https://*.example.com",
        });
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://fr.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("normalizes a default HTTPS port in a configured wildcard subdomain", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "https://*.example.com:443",
        });
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://checkout.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
      });

      it("normalizes a default HTTPS port in an exact configured origin", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "https://other.example.com:443",
        });
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
      });

      it("supports configured origins in browsers without URL.canParse", async () => {
        const originalCanParse = URL.canParse;
        Object.defineProperty(URL, "canParse", { configurable: true, value: undefined });

        try {
          const { checkout, mockCheckoutWindow } = openPopupCheckout({
            "allowed-origins": "https://other.example.com",
          });
          const onStartSpy = vi.fn();
          checkout.addEventListener("start", onStartSpy);

          simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
            source: mockCheckoutWindow,
            origin: "https://other.example.com",
          });
          await flushProtocolDispatch();

          expect(onStartSpy).toHaveBeenCalledOnce();
        } finally {
          Object.defineProperty(URL, "canParse", { configurable: true, value: originalCanParse });
        }
      });

      it("does not match the apex origin for a wildcard subdomain pattern", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "https://*.example.com",
        });
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("accepts protocol messages from any origin when allowedOrigins includes '*'", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({
          "allowed-origins": "*",
        });
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://anything.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("drops protocol messages when the source is not the checkout window", async () => {
        const { checkout } = openPopupCheckout();
        const otherWindow = createMockWindow();
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(
          checkout,
          "ec.start",
          makeCheckoutPayload(),
          // Right origin, wrong window.
          { source: otherWindow },
        );
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("drops protocol messages when src is unset even if the event origin is HTTPS", async () => {
        const checkout = document.createElement("shopify-checkout");
        document.body.appendChild(checkout);
        const mockCheckoutWindow = createMockWindow();
        vi.spyOn(window, "open").mockReturnValue(mockCheckoutWindow);
        vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
        vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
        checkout.src = "https://shop.example.com/checkout";
        checkout.open();
        checkout.removeAttribute("src");

        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        const event = new MessageEvent("message", {
          data: {
            jsonrpc: "2.0",
            method: "ec.start",
            params: makeCheckoutPayload(),
          },
          origin: "https://shop.example.com",
          source: mockCheckoutWindow,
        });
        window.dispatchEvent(event);
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("drops protocol messages when the event origin is not HTTPS", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "http://shop.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("drops protocol messages when the event origin is opaque", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "null",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("ignores window 'message' events that aren't JSON-RPC checkout protocol messages", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        window.dispatchEvent(
          new MessageEvent("message", {
            data: { hello: "world" },
            source: mockCheckoutWindow,
            origin: new URL(checkout.src).origin,
          }),
        );
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe("onMessageRejected callback", () => {
      it("invokes onMessageRejected with origin, data, and reason for dropped messages", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onMessageRejected = vi.fn();
        checkout.onMessageRejected = onMessageRejected;
        const onStartSpy = vi.fn();
        checkout.addEventListener("start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(onMessageRejected).toHaveBeenCalledOnce();
        expect(onMessageRejected).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: "https://other.example.com",
            reason: expect.stringContaining("not in allowlist"),
            data: expect.objectContaining({ method: "ec.start" }),
          }),
        );
      });

      it("falls back to a warning when onMessageRejected is not set", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("not in allowlist"));
      });

      it("does not invoke onMessageRejected for trusted origins", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onMessageRejected = vi.fn();
        checkout.onMessageRejected = onMessageRejected;

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: new URL(checkout.src).origin,
        });
        await flushProtocolDispatch();

        expect(onMessageRejected).not.toHaveBeenCalled();
      });
    });

    describe("addEventListener override", () => {
      it("is a no-op when called with a null listener", () => {
        const checkout = renderCheckout();
        expect(() => {
          checkout.addEventListener("start", null as unknown as EventListener);
        }).not.toThrow();
      });
    });
  });

  describe("log-level attribute", () => {
    it("logs a console warning for dropped messages when log-level is warn", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
        origin: "http://shop.example.com",
      });
      await flushProtocolDispatch();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dropped message from non-HTTPS origin"),
      );
    });

    it("does not log warnings for dropped messages when log-level is error", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "error" });
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
        origin: "http://shop.example.com",
      });
      await flushProtocolDispatch();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("drops non-serializable messages without throwing", async () => {
      const telemetrySpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
      const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const circularMessage: Record<string, unknown> = {
        jsonrpc: "2.0",
        method: "ec.start",
        params: { checkout: makeCheckoutPayload() },
      };
      circularMessage.self = circularMessage;

      expect(() => {
        simulateRawMessageEvent(checkout, circularMessage, {
          source: mockCheckoutWindow,
        });
      }).not.toThrow();
      await flushProtocolDispatch();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dropped message because it could not be serialized"),
      );
      expect(telemetrySpy).toHaveBeenCalledWith({
        method: "unknown",
        failureType: "serialization",
      });
    });

    it("does not record decode errors when telemetry is disabled", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout({
        "log-level": "warn",
        telemetry: "false",
      });
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const telemetrySpy = vi.spyOn(mockTelemetry(), "recordProtocolDecodeError");
      const circularMessage: Record<string, unknown> = {};
      circularMessage.self = circularMessage;

      simulateRawMessageEvent(checkout, circularMessage, {
        source: mockCheckoutWindow,
      });
      await flushProtocolDispatch();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dropped message because it could not be serialized"),
      );
      expect(telemetrySpy).not.toHaveBeenCalled();
    });
  });

  describe("lifecycle", () => {
    it("drops protocol messages while the element is disconnected", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      const onStartSpy = vi.fn();
      checkout.addEventListener("start", onStartSpy);

      checkout.remove();

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
      });
      await flushProtocolDispatch();

      expect(onStartSpy).not.toHaveBeenCalled();
    });

    it("re-attaches the message listener on reconnect without duplicating it", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      const onStartSpy = vi.fn();
      checkout.addEventListener("start", onStartSpy);

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
      });
      await flushProtocolDispatch();
      expect(onStartSpy).toHaveBeenCalledOnce();

      const newParent = document.createElement("div");
      document.body.appendChild(newParent);
      newParent.appendChild(checkout);
      checkout.open();

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
      });
      await flushProtocolDispatch();

      expect(onStartSpy).toHaveBeenCalledTimes(2);
    });

    it("routes messages independently when multiple instances coexist on the same page", async () => {
      const first = openPopupCheckout();
      const second = openPopupCheckout();

      const firstSpy = vi.fn();
      const secondSpy = vi.fn();
      first.checkout.addEventListener("start", firstSpy);
      second.checkout.addEventListener("start", secondSpy);

      const firstPayload = makeCheckoutPayload();
      simulateProtocolMessageEvent(first.checkout, "ec.start", firstPayload, {
        source: first.mockCheckoutWindow,
      });
      await flushProtocolDispatch();

      expect(firstSpy).toHaveBeenCalledOnce();
      expect(secondSpy).not.toHaveBeenCalled();
      expect(first.checkout.checkout).toEqual(decodeCheckout(firstPayload));
      expect(second.checkout.checkout).toBeUndefined();

      const secondPayload = makeCheckoutPayload();
      simulateProtocolMessageEvent(second.checkout, "ec.start", secondPayload, {
        source: second.mockCheckoutWindow,
      });
      await flushProtocolDispatch();

      expect(firstSpy).toHaveBeenCalledOnce();
      expect(secondSpy).toHaveBeenCalledOnce();
      expect(first.checkout.checkout).toEqual(decodeCheckout(firstPayload));
      expect(second.checkout.checkout).toEqual(decodeCheckout(secondPayload));
    });

    it("aborts the prior protocol listener controller when reattached to the DOM", () => {
      const checkout = renderCheckout();
      const detached = document.body.removeChild(checkout);
      document.body.appendChild(detached);
      expect(detached.isConnected).toBe(true);
    });
  });
});

// Test utilities

/**
 * Dispatches a synthetic checkout-protocol MessageEvent at `window` so
 * the component's listener processes it. By default both `source` and
 * `origin` are derived from `checkout` so that the component's source and
 * HTTPS-origin validation passes:
 *
 * - `source`: pass the checkout browsing context (the mock window returned
 *   from `window.open` after `open()`, or another `MessageEventSource` to
 *   test drops). When omitted, defaults to `null` (messages are dropped).
 * - `origin`: the origin of `checkout.src`. Override `origin` to test
 *   that messages from non-HTTPS origins are dropped.
 */
function simulateProtocolMessageEvent(
  checkout: ShopifyCheckout,
  name: keyof CheckoutProtocolMessageMap,
  params: unknown,
  options?: {
    id?: string;
    source?: MessageEventSource | null;
    origin?: string;
  },
) {
  const source = options?.source !== undefined ? options.source : null;

  let origin = options?.origin;
  if (origin === undefined) {
    try {
      origin = new URL(checkout.src).origin;
    } catch {
      origin = "";
    }
  }

  const event = new MessageEvent("message", {
    data: {
      jsonrpc: "2.0",
      method: name,
      params,
      ...(options?.id && { id: options.id }),
    },
    origin,
    source,
  });
  window.dispatchEvent(event);
}

function expectLinkResponse(
  checkout: ShopifyCheckout,
  checkoutWindow: Window,
  id: string,
  status: "success" | "error",
) {
  expect(checkoutWindow.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      jsonrpc: "2.0",
      id,
      result: expect.objectContaining({
        ucp: { status, version: EMBED_PROTOCOL_VERSION },
      }),
    }),
    new URL(checkout.src).origin,
  );
}

function flushProtocolDispatch(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function simulateRawMessageEvent(
  checkout: ShopifyCheckout,
  data: unknown,
  options?: {
    source?: MessageEventSource | null;
    origin?: string;
  },
) {
  const source = options?.source !== undefined ? options.source : null;

  let origin = options?.origin;
  if (origin === undefined) {
    try {
      origin = new URL(checkout.src).origin;
    } catch {
      origin = "";
    }
  }

  const event = new MessageEvent("message", {
    data,
    origin,
    source,
  });
  window.dispatchEvent(event);
}

function waitForEvent(element: HTMLElement, eventName: string, spyFn?: (event: Event) => unknown) {
  return new Promise<void>((resolve) => {
    const handler = (event: Event) => {
      spyFn?.(event);
      element.removeEventListener(eventName, handler);
      resolve();
    };
    element.addEventListener(eventName, handler);
  });
}

function renderCheckout(attributes: Record<string, string | undefined> = {}) {
  const defaultSrc = "https://demostore.mock.shop/cart/43696905224214:1";
  const checkout = document.createElement("shopify-checkout");

  if (!attributes.src) {
    checkout.setAttribute("src", defaultSrc);
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (value != null) {
      checkout.setAttribute(key, value);
    }
  }
  document.body.appendChild(checkout);
  return checkout;
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

/**
 * Sets up a popup-target checkout whose `#checkoutWindow` is a controllable
 * mock window. Tests that exercise `#handleMessage` source validation should
 * use this helper and pass `mockCheckoutWindow` as `source` in
 * `simulateProtocolMessageEvent`.
 *
 * Callers receive the checkout, the mock window (use as both `source` for
 * `simulateProtocolMessageEvent` and the spy target for response
 * `postMessage` calls), and the `window.open` spy already set up.
 */
function openPopupCheckout(attributes: Record<string, string | undefined> = {}): {
  checkout: ShopifyCheckout;
  mockCheckoutWindow: Window;
} {
  const checkout = renderCheckout({ target: "popup", ...attributes });
  const mockCheckoutWindow = createMockWindow();
  vi.spyOn(window, "open").mockReturnValue(mockCheckoutWindow);
  // showModal/close throw in jsdom unless the dialog is in the DOM and
  // the test environment supports the modal lifecycle. Stub both for
  // tests that just need #checkoutWindow to be set.
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
  checkout.open();
  return { checkout, mockCheckoutWindow };
}

/**
 * Decodes a wire (`snake_case`) `{checkout}` fixture the same way the shared
 * client does, yielding the `camelCase` `Checkout` the component exposes. Use
 * this for assertions since decoding produces a fresh object (no reference
 * equality with the fixture).
 */
function decodeCheckout(payload: { checkout: unknown }) {
  const { ucp: _ucp, ...checkout } = EmbeddedCheckoutProtocol.Event.start.decode(payload).checkout;
  return checkout;
}

/**
 * Builds a minimal wire-format (`snake_case`) `{checkout}` payload that decodes
 * cleanly through the shared client. Keys mirror the UCP JSON contract
 * (`line_items`, `payment_handlers`), not the decoded `camelCase` shape.
 */
function makeCheckoutPayload(overrides: Record<string, unknown> = {}): {
  checkout: Record<string, unknown>;
} {
  return {
    checkout: {
      ucp: { version: EMBED_PROTOCOL_VERSION, payment_handlers: {} },
      id: "gid://shopify/Checkout/test",
      currency: "USD",
      line_items: [],
      totals: [],
      status: "incomplete",
      links: [],
      ...overrides,
    },
  };
}

function makeErrorPayload(overrides?: { severity?: Message["severity"] }): ErrorResponse {
  return {
    ucp: { version: EMBED_PROTOCOL_VERSION, status: "error" },
    messages: [
      {
        type: "error",
        code: "session_failed",
        content: "Session failed",
        severity: overrides?.severity ?? "unrecoverable",
      },
    ],
  };
}

function makeErrorParams(overrides?: {
  severity?: Message["severity"];
}): CheckoutProtocolMessageMap["ec.error"] {
  return { error: makeErrorPayload(overrides) };
}
