import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbeddedCheckoutProtocol } from "@shopify/checkout-kit-protocol";

import type { CheckoutProtocolMessageMap, ErrorResponse, Message } from "./checkout.types";
import "./checkout-web-component";
import type { ShopifyCheckout } from "./checkout";

const EMBED_PROTOCOL_VERSION = EmbeddedCheckoutProtocol.specVersion;

describe("<shopify-checkout>", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Disconnect elements so their global message listeners do not leak
    // into tests in this file or another concurrently running suite.
    document.body.innerHTML = "";
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

      it.each(["customMethod", "ec.buyer.change"])(
        "ignores unsupported notification %s",
        (method) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();

          simulateRawMessageEvent(
            checkout,
            {
              jsonrpc: "2.0",
              method,
              params: {},
            },
            { source: mockCheckoutWindow },
          );

          expect(mockCheckoutWindow.postMessage).not.toHaveBeenCalled();
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
          expect.any(Error),
        );
      });
    });

    describe("ec.start", () => {
      it("updates the checkout property and dispatches an ec.start event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "ec.start", onStartSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toEqual(decodeCheckout(payload));
        expect(onStartSpy).toHaveBeenCalledOnce();
      });
    });

    describe("ec.complete", () => {
      it("updates the checkout property and dispatches an ec.complete event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onCompleteSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "ec.complete", onCompleteSpy);

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
      it("updates the error property and dispatches an ec.error event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "ec.error", onErrorSpy);

        const errorParams = makeErrorParams({ severity: "recoverable" });
        simulateProtocolMessageEvent(checkout, "ec.error", errorParams, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.error).toEqual(decodeError(errorParams));
        expect(onErrorSpy).toHaveBeenCalledOnce();
      });

      it("ignores the old ec.error shape with ucp and messages directly in params", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        checkout.addEventListener("ec.error", onErrorSpy);

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
        checkout.addEventListener("ec.error", () => errorOrder.push("error"));
        checkout.addEventListener("ec.close", () => errorOrder.push("close"));

        simulateProtocolMessageEvent(
          checkout,
          "ec.error",
          makeErrorParams({ severity: "unrecoverable" }),
          { source: mockCheckoutWindow },
        );
        await flushProtocolDispatch();

        expect(errorOrder).toStrictEqual(["error", "close"]);
      });

      const NON_FATAL_SEVERITIES: ReadonlyArray<Message["severity"]> = [
        "recoverable",
        "requires_buyer_input",
        "requires_buyer_review",
      ];
      it.each(NON_FATAL_SEVERITIES)(
        "does not auto-close when severity is %s",
        async (severity: Message["severity"]) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const closeSpy = vi.fn();
          checkout.addEventListener("ec.close", closeSpy);

          simulateProtocolMessageEvent(checkout, "ec.error", makeErrorParams({ severity }), {
            source: mockCheckoutWindow,
          });
          await flushProtocolDispatch();

          expect(closeSpy).not.toHaveBeenCalled();
        },
      );

      it("does not crash when ec.error messages is not an array", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        const closeSpy = vi.fn();
        checkout.addEventListener("ec.error", onErrorSpy);
        checkout.addEventListener("ec.close", closeSpy);

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
        expect(closeSpy).not.toHaveBeenCalled();
      });
    });

    describe("ec.line_items.change", () => {
      it("updates the checkout property and dispatches an ec.line_items.change event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onLineItemsChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "ec.line_items.change", onLineItemsChangeSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.line_items.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toEqual(decodeCheckout(payload));
        expect(onLineItemsChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("ec.totals.change", () => {
      it("updates the checkout property and dispatches an ec.totals.change event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onTotalsChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "ec.totals.change", onTotalsChangeSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.totals.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toEqual(decodeCheckout(payload));
        expect(onTotalsChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("ec.messages.change", () => {
      it("updates the checkout property and dispatches an ec.messages.change event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onMessagesChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "ec.messages.change", onMessagesChangeSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.messages.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toEqual(decodeCheckout(payload));
        expect(onMessagesChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("event.detail payloads", () => {
      it("ec.start carries {checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.start", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toStrictEqual({ checkout: decodeCheckout(payload) });
      });

      it("ec.complete carries {checkout} with order nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.complete", spy);

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

      it("ec.complete keeps an absent order nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.complete", spy);

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

      it("ec.error carries {error}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.error", spy);

        const errorParams = makeErrorParams();
        simulateProtocolMessageEvent(checkout, "ec.error", errorParams, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toStrictEqual({ error: decodeError(errorParams) });
      });

      it("ec.line_items.change carries {checkout} with lineItems nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.line_items.change", spy);

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

      it("ec.totals.change carries {checkout} with totals nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.totals.change", spy);

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

      it("ec.messages.change carries {checkout} with messages nested in checkout", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "ec.messages.change", spy);

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

      it("ec.close carries no detail", () => {
        const { checkout } = openPopupCheckout();
        const spy = vi.fn();
        checkout.addEventListener("ec.close", spy);

        checkout.close();

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toBeNull();
      });
    });

    describe("ec.window.open_request", () => {
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
      });

      it("rejects the request when the url uses a non-https scheme", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout({ "log-level": "warn" });
        const windowOpenSpy = vi.spyOn(window, "open");
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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
      it("handles protocol messages from any HTTPS origin when the source matches", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("ec.start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await flushProtocolDispatch();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toEqual(decodeCheckout(payload));
      });

      it("drops protocol messages when the source is not the checkout window", async () => {
        const { checkout } = openPopupCheckout();
        const otherWindow = createMockWindow();
        const onStartSpy = vi.fn();
        checkout.addEventListener("ec.start", onStartSpy);

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
        checkout.addEventListener("ec.start", onStartSpy);

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
        checkout.addEventListener("ec.start", onStartSpy);

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
        checkout.addEventListener("ec.start", onStartSpy);

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
        checkout.addEventListener("ec.start", onStartSpy);
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

    describe("addEventListener override", () => {
      it("is a no-op when called with a null listener", () => {
        const checkout = renderCheckout();
        expect(() => {
          checkout.addEventListener("ec.start", null as unknown as EventListener);
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
    });
  });

  describe("lifecycle", () => {
    it("drops protocol messages while the element is disconnected", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      const onStartSpy = vi.fn();
      checkout.addEventListener("ec.start", onStartSpy);

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
      checkout.addEventListener("ec.start", onStartSpy);

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
      first.checkout.addEventListener("ec.start", firstSpy);
      second.checkout.addEventListener("ec.start", secondSpy);

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
  return EmbeddedCheckoutProtocol.Event.start.decode(payload).checkout;
}

/** Wire → decoded `ErrorResponse`, mirroring the client's `ec.error` handling. */
function decodeError(params: { error: unknown }) {
  return EmbeddedCheckoutProtocol.Event.error.decode(params).error;
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
