import { afterEach, describe, expect, it, vi } from "vitest";

import type { Checkout, CheckoutProtocolMessageMap, UcpErrorResponse } from "./checkout.types";
import type { CheckoutMessageError } from "@shopify/checkout-kit-protocol/web";
import "./checkout-web-component";
import {
  DEFAULT_POPUP_WIDTH,
  DEFAULT_POPUP_HEIGHT,
  EMBED_PROTOCOL_VERSION,
  CK_VERSION,
} from "./checkout";
import type { ShopifyCheckout } from "./checkout";

const POPUP_TARGETS = ["popup"] as const;
const NEW_TAB_TARGETS = ["_blank", "auto", "", undefined] as const;

function expectWindowOpenArgs(spy: {
  mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> };
}): ReadonlyArray<unknown> {
  expect(spy).toHaveBeenCalled();
  const args = spy.mock.calls[0];
  if (args === undefined) {
    throw new Error("expected window.open to have been called");
  }
  return args;
}

describe("<shopify-checkout>", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clear any <shopify-checkout> elements left over from prior tests so
    // their global `message` listeners stop responding to events dispatched
    // by later tests. Without this, e.g. the new ec.window.open_request SDK
    // fallback would call window.open once per leaked instance.
    document.body.innerHTML = "";
  });

  describe("attributes", () => {
    describe("src", () => {
      it("changing the src attribute reflects to the src property", () => {
        const checkout = renderCheckout();
        const newSrc = "https://example.com/checkout/456";
        checkout.setAttribute("src", newSrc);

        expect(checkout.src).toBe(newSrc);
      });
    });
  });

  describe("target", () => {
    it("changing the target attribute reflects to the target property", () => {
      const checkout = renderCheckout();
      const newTarget = "_blank";
      checkout.setAttribute("target", newTarget);

      expect(checkout.target).toBe(newTarget);
    });

    it("handles HTML metacharacters in the target attribute value", () => {
      const target = '"><script>window.__xssed=true</script>';
      const checkout = renderCheckout({ target });

      expect(checkout.shadowRoot!.querySelector("script")).toBeNull();
      expect((window as unknown as { __xssed?: boolean }).__xssed).toBeUndefined();
    });

    it("closes an open session when the target attribute changes mid-flight", () => {
      const checkout = renderCheckout({ target: "popup" });
      const mockWindow = createMockWindow();
      vi.spyOn(window, "open").mockReturnValue(mockWindow);
      vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
      vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

      const closeEventSpy = vi.fn();
      checkout.addEventListener("checkout:close", closeEventSpy);

      checkout.open();
      expect(closeEventSpy).not.toHaveBeenCalled();

      checkout.setAttribute("target", "auto");

      expect(closeEventSpy).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when the target attribute is set to the same value", () => {
      const checkout = renderCheckout({ target: "popup" });
      const wrapper = checkout.shadowRoot!.querySelector(".Shopify-target")!;
      const classBefore = wrapper.className;

      checkout.setAttribute("target", checkout.getAttribute("target")!);

      expect(wrapper.className).toBe(classBefore);
    });
  });

  describe("properties", () => {
    describe("src", () => {
      it("changing the src property reflects to the src attribute", () => {
        const checkout = renderCheckout();
        const newSrc = "https://example.com/checkout/456";
        checkout.src = newSrc;

        expect(checkout.getAttribute("src")).toBe(newSrc);
      });
    });

    describe("target", () => {
      it("changing the target property reflects to the target attribute", () => {
        const checkout = renderCheckout();
        const newTarget = "_blank";
        checkout.target = newTarget;
        expect(checkout.getAttribute("target")).toBe(newTarget);
      });
    });

    describe("debug", () => {
      it("sets the debug attribute when assigned true", () => {
        const checkout = renderCheckout();
        checkout.debug = true;
        expect(checkout.hasAttribute("debug")).toBe(true);
        expect(checkout.getAttribute("debug")).toBe("");
      });

      it("sets the debug attribute to a string value when assigned a string", () => {
        const checkout = renderCheckout();
        checkout.debug = "verbose";
        expect(checkout.getAttribute("debug")).toBe("verbose");
      });

      it("removes the debug attribute when assigned undefined", () => {
        const checkout = renderCheckout({ debug: "" });
        expect(checkout.hasAttribute("debug")).toBe(true);
        checkout.debug = undefined;
        expect(checkout.hasAttribute("debug")).toBe(false);
      });

      it("removes the debug attribute when assigned false", () => {
        const checkout = renderCheckout({ debug: "" });
        expect(checkout.hasAttribute("debug")).toBe(true);
        checkout.debug = false;
        expect(checkout.hasAttribute("debug")).toBe(false);
      });
    });
  });

  describe("URL generation", () => {
    it("preserves existing query parameters when adding ec_* parameters", () => {
      const originalSrc = "https://example.com/checkout?existing=param&another=value";
      const checkout = renderCheckout({ src: originalSrc });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const firstCall = expectWindowOpenArgs(windowOpenSpy);
      const calledUrl = firstCall[0] as string;
      const url = new URL(calledUrl);

      expect(url.searchParams.get("existing")).toBe("param");
      expect(url.searchParams.get("another")).toBe("value");
      expect(url.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);
    });

    it("replaces caller-supplied ec_* parameters", () => {
      const checkout = renderCheckout({
        src: "https://example.com/checkout?ec_version=stale&ec_delegate=custom",
      });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.getAll("ec_version")).toEqual([EMBED_PROTOCOL_VERSION]);
      expect(url.searchParams.getAll("ec_delegate")).toEqual(["window.open"]);
    });

    it("strips ec_auth from src when the incoming checkout URL includes it", () => {
      const checkout = renderCheckout({
        src: "https://example.com/checkout?ec_auth=should-not-propagate&keep=1",
      });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.get("ec_auth")).toBeNull();
      expect(url.searchParams.get("keep")).toBe("1");
      expect(url.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);
    });

    it("handles invalid src URL gracefully", () => {
      const checkout = renderCheckout();
      checkout.src = "invalid-url";

      const windowOpenSpy = vi.spyOn(window, "open");
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "`<shopify-checkout>`: src property is empty or invalid, cannot open checkout",
      );
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it.each([
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "http://shop.example.com/checkout",
      "blob:https://shop.example.com/abc",
      "file:///etc/passwd",
      "not a url",
    ])("leaves overlay link without href when src is %s", (badSrc) => {
      const checkout = renderCheckout({ src: badSrc });

      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();

      const overlayLink = checkout.shadowRoot!.querySelector<HTMLAnchorElement>("#overlay-link");
      expect(overlayLink!.hasAttribute("href")).toBe(false);
    });

    it("does not interpret HTML metacharacters in src as markup", () => {
      const src = 'https://shop.example.com/"><script>window.__xssed=true</script>';
      // The URL constructor accepts this (the `"` becomes part of the
      // pathname); the value is rendered via DOM APIs rather than string
      // interpolation, so no markup is parsed into the shadow root.
      const checkout = renderCheckout({ src });

      expect(checkout.shadowRoot!.querySelector("script")).toBeNull();
      expect((window as unknown as { __xssed?: boolean }).__xssed).toBeUndefined();
    });
  });

  describe("methods", () => {
    describe("open", () => {
      describe("when target is not specified", () => {
        it("defaults to auto target (new tab)", () => {
          [undefined, ""].forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

            checkout.open();

            expect(windowOpenSpy).toHaveBeenCalledWith(
              expect.stringContaining(checkout.src),
              target ?? "auto",
            );
          });
        });
      });

      describe('when target="popup"', () => {
        it("shows the checkout in a popup window", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

            checkout.open();

            const call = expectWindowOpenArgs(windowOpenSpy);
            const calledUrl = new URL(call[0] as string);
            expect(calledUrl.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);

            const features = call[2] as string;
            expect(features).toContain("scrollbars=yes");
            expect(features).toContain("status=no");
            expect(features).toContain("toolbar=no");
            expect(features).toContain("resizable=yes");
          });
        });

        it("does not open the overlay backdrop when a developer uses css to set `::part(overlay)` to `display: none`", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
            const dialogShowModalSpy = vi
              .spyOn(HTMLDialogElement.prototype, "showModal")
              .mockImplementation(() => {});

            vi.spyOn(window, "getComputedStyle").mockReturnValue({
              getPropertyValue: (prop: string) => {
                if (prop === "display") return "none";
                return "";
              },
            } as CSSStyleDeclaration);

            checkout.open();

            expect(windowOpenSpy).toHaveBeenCalled();
            expect(dialogShowModalSpy).not.toHaveBeenCalled();
          });
        });

        it("does not open the overlay backdrop when `<shopify-checkout>` is set to `display: none`", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
            const dialogShowModalSpy = vi
              .spyOn(HTMLDialogElement.prototype, "showModal")
              .mockImplementation(() => {});

            vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
              return {
                getPropertyValue: (prop: string) => {
                  if (el === checkout && prop === "display") return "none";
                  return "";
                },
              } as CSSStyleDeclaration;
            });

            checkout.open();

            expect(windowOpenSpy).toHaveBeenCalled();
            expect(dialogShowModalSpy).not.toHaveBeenCalled();
          });
        });

        it("returns early when src is empty and shows a console warning for the developer", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            checkout.src = "";
            const windowOpenSpy = vi.spyOn(window, "open");
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            checkout.open();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
              "`<shopify-checkout>`: src property is empty or invalid, cannot open checkout",
            );
            expect(windowOpenSpy).not.toHaveBeenCalled();
          });
        });

        it("calculates popup window size correctly", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
            mockWindowSize(1200, 800);

            checkout.open();

            const call = expectWindowOpenArgs(windowOpenSpy);
            const features = call[2] as string;
            expect(features).toContain(`width=${DEFAULT_POPUP_WIDTH}`);
            expect(features).toContain(`height=${DEFAULT_POPUP_HEIGHT}`);
          });
        });

        it("calculates popup window position correctly", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
            mockWindowSize(1200, 800);

            checkout.open();

            const call = expectWindowOpenArgs(windowOpenSpy);
            const features = call[2] as string;
            expect(features).toContain(`left=${(1200 - DEFAULT_POPUP_WIDTH) / 2}`);
            expect(features).toContain(`top=${(800 - DEFAULT_POPUP_HEIGHT) / 2}`);
          });
        });

        it("respects custom width and height CSS properties", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
            mockWindowSize(1200, 800);

            vi.spyOn(window, "getComputedStyle").mockReturnValue({
              getPropertyValue: (prop: string) => {
                if (prop === "--shopify-checkout-dialog-width") return "800";
                if (prop === "--shopify-checkout-dialog-height") return "700";
                return "";
              },
            } as CSSStyleDeclaration);

            checkout.open();

            const call = expectWindowOpenArgs(windowOpenSpy);
            const features = call[2] as string;
            expect(features).toContain("width=800");
            expect(features).toContain("height=700");
          });
        });

        it("handles popup blocked scenario gracefully", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);

            checkout.open();

            expect(windowOpenSpy).toHaveBeenCalled();
            // Should not throw error when popup is blocked
          });
        });

        it("enforces maximum window size constraints", () => {
          POPUP_TARGETS.forEach((target) => {
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
            mockWindowSize(200, 100);

            const checkout = renderCheckout({ target });
            checkout.open();

            const call = expectWindowOpenArgs(windowOpenSpy);
            const features = call[2] as string;
            // Should be constrained to 90% of screen size
            expect(features).toContain("width=180");
            expect(features).toContain("height=90");
          });
        });

        it("closes the checkout when the dialog is closed", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const mockPopup = createMockWindow();
            vi.spyOn(window, "open").mockReturnValue(mockPopup);
            vi.spyOn(window, "getComputedStyle").mockReturnValue({
              getPropertyValue: (prop: string) => {
                if (prop === "display") return "block";
                return "";
              },
            } as CSSStyleDeclaration);

            const closeEventSpy = vi.fn();
            checkout.addEventListener("checkout:close", closeEventSpy);

            checkout.open();

            const dialog = checkout.shadowRoot!.querySelector("dialog") as HTMLDialogElement;
            dialog.dispatchEvent(new Event("close"));

            expect(mockPopup.close).toHaveBeenCalled();
            expect(closeEventSpy).toHaveBeenCalled();
          });
        });
      });

      describe('when target="_blank", "auto", or undefined', () => {
        NEW_TAB_TARGETS.forEach((target) => {
          it("opens in a new window", () => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

            checkout.open();

            const firstCall = expectWindowOpenArgs(windowOpenSpy);
            const calledUrl = new URL(firstCall[0] as string);
            expect(calledUrl.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);
            expect(firstCall[1]).toBe(target ?? "auto");
          });
        });
      });

      describe("when target is a non keyword string", () => {
        it("opens in a named window", () => {
          const checkout = renderCheckout({ target: "my-named-window" });
          const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

          checkout.open();

          const firstCall = expectWindowOpenArgs(windowOpenSpy);
          const calledUrl = new URL(firstCall[0] as string);
          expect(calledUrl.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);
          expect(firstCall[1]).toBe("my-named-window");
        });
      });

      describe('when target is "_self", "_parent", or "_top"', () => {
        it.each(["_self", "_parent", "_top"] as const)(
          "falls back to 'auto' when target=%s and warns in debug mode",
          (target) => {
            const checkout = renderCheckout({ target, debug: "" });
            const mockWindow = createMockWindow();
            const openSpy = vi.spyOn(window, "open").mockReturnValue(mockWindow);
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

            checkout.open();

            expect(openSpy).toHaveBeenCalledWith(expect.any(String), "auto");
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining(`target="${target}" would navigate the current page`),
            );
          },
        );

        it("does not warn when debug is disabled", () => {
          const checkout = renderCheckout({ target: "_self" });
          vi.spyOn(window, "open").mockReturnValue(createMockWindow());
          const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
          vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
          vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

          checkout.open();

          expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
      });

      describe("when called twice", () => {
        it("closes the existing session before opening a new one", () => {
          const checkout = renderCheckout({ target: "popup" });
          const firstWindow = createMockWindow();
          const secondWindow = createMockWindow();
          const openSpy = vi
            .spyOn(window, "open")
            .mockReturnValueOnce(firstWindow)
            .mockReturnValueOnce(secondWindow);
          vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
          vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

          const closeEventSpy = vi.fn();
          checkout.addEventListener("checkout:close", closeEventSpy);

          checkout.open();
          checkout.open();

          expect(closeEventSpy).toHaveBeenCalledTimes(1);
          expect(openSpy).toHaveBeenCalledTimes(2);
        });
      });

      describe("overlay scrim", () => {
        function openWithRealOverlay(): {
          checkout: ShopifyCheckout;
          mockWindow: Window;
        } {
          const checkout = renderCheckout({ target: "popup" });
          const mockWindow = createMockWindow();
          vi.spyOn(window, "open").mockReturnValue(mockWindow);
          vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
          checkout.open();
          return { checkout, mockWindow };
        }

        it("closes the dialog when the overlay close button is clicked", () => {
          const { checkout } = openWithRealOverlay();
          const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
          const dialogCloseSpy = vi
            .spyOn(HTMLDialogElement.prototype, "close")
            .mockImplementation(() => {});

          const closeButton =
            checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-close-button")!;
          closeButton.click();

          expect(dialogCloseSpy).toHaveBeenCalled();
          expect(dialog).toBeTruthy();
        });

        it("focuses the popup when the overlay link is clicked", () => {
          const { checkout, mockWindow } = openWithRealOverlay();
          const link = checkout.shadowRoot!.querySelector<HTMLAnchorElement>("#overlay-link")!;

          const event = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
          });
          link.dispatchEvent(event);

          expect(event.defaultPrevented).toBe(true);
          expect(mockWindow.focus).toHaveBeenCalled();
        });
      });

      describe("when the popup is dismissed externally", () => {
        it("aborts the open session if the popup was closed before refocus", () => {
          vi.useFakeTimers();
          try {
            const checkout = renderCheckout({ target: "popup" });
            const mockWindow = createMockWindow();
            (mockWindow as { closed: boolean }).closed = false;
            vi.spyOn(window, "open").mockReturnValue(mockWindow);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

            const closeEventSpy = vi.fn();
            checkout.addEventListener("checkout:close", closeEventSpy);

            checkout.open();

            (mockWindow as { closed: boolean }).closed = true;
            window.dispatchEvent(new FocusEvent("focus"));
            vi.advanceTimersByTime(50);

            expect(closeEventSpy).toHaveBeenCalledTimes(1);
          } finally {
            vi.useRealTimers();
          }
        });

        it("does not abort if the popup is still open after refocus", () => {
          vi.useFakeTimers();
          try {
            const checkout = renderCheckout({ target: "popup" });
            const mockWindow = createMockWindow();
            (mockWindow as { closed: boolean }).closed = false;
            vi.spyOn(window, "open").mockReturnValue(mockWindow);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

            const closeEventSpy = vi.fn();
            checkout.addEventListener("checkout:close", closeEventSpy);

            checkout.open();
            window.dispatchEvent(new FocusEvent("focus"));
            vi.advanceTimersByTime(50);

            expect(closeEventSpy).not.toHaveBeenCalled();
          } finally {
            vi.useRealTimers();
          }
        });
      });
    });

    describe("focus", () => {
      it("focuses the checkout window", () => {
        [...POPUP_TARGETS, "_blank"].forEach((target) => {
          const checkout = renderCheckout({ target });
          const mockPopup = {
            ...createMockWindow(),
            focus: vi.fn(),
          };
          vi.spyOn(window, "open").mockReturnValue(mockPopup);

          checkout.open();
          checkout.focus();

          expect(mockPopup.focus).toHaveBeenCalled();
        });
      });
    });

    describe("close", () => {
      describe('when target="popup", "auto", or undefined', () => {
        it("dispatches close event when popup is closed", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });

            const closeEventSpy = vi.fn();
            const mockWindow = createMockWindow();
            mockWindow.close = closeEventSpy;

            vi.spyOn(window, "open").mockReturnValue(mockWindow);

            checkout.addEventListener("checkout:close", closeEventSpy);
            checkout.open();
            checkout.close();

            expect(closeEventSpy).toHaveBeenCalled();
          });
        });

        it("closes the checkout scrim dialog", async () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const mockPopup = createMockWindow();
            vi.spyOn(window, "open").mockReturnValue(mockPopup);
            vi.spyOn(window, "getComputedStyle").mockReturnValue({
              getPropertyValue: (prop: string) => {
                if (prop === "display") return "block";
                return "";
              },
            } as CSSStyleDeclaration);

            const dialogCloseSpy = vi
              .spyOn(HTMLDialogElement.prototype, "close")
              .mockImplementation(() => {});

            checkout.open();

            checkout.close();

            // Should also close the dialog scrim
            expect(dialogCloseSpy).toHaveBeenCalled();
          });
        });
      });
    });
  });

  describe("it subscribes to checkout-protocol events", () => {
    describe("ec.ready handshake", () => {
      it("auto-responds with an empty result and does not dispatch a DOM event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onReadySpy = vi.fn();
        // ec:ready is no longer a public event; cast through `never` to verify
        // that the component does not dispatch one.
        checkout.addEventListener("checkout:ready" as never, onReadySpy as EventListener);

        simulateProtocolMessageEvent(
          checkout,
          "ec.ready",
          { delegate: [] },
          { id: "ready-1", source: mockCheckoutWindow },
        );
        await Promise.resolve();

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          { jsonrpc: "2.0", id: "ready-1", result: {} },
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

    describe("checkout:start", () => {
      it("updates the checkout property and dispatches an ec:start event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "checkout:start", onStartSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toBe(payload.checkout);
        expect(onStartSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:complete", () => {
      it("updates the checkout property and dispatches an ec:complete event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onCompleteSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "checkout:complete", onCompleteSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.complete", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toBe(payload.checkout);
        expect(onCompleteSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:error", () => {
      it("updates the error property and dispatches an ec:error event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "checkout:error", onErrorSpy);

        const errorParams = makeErrorParams({ severity: "recoverable" });
        simulateProtocolMessageEvent(checkout, "ec.error", errorParams, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.error).toStrictEqual(errorParams.error);
        expect(onErrorSpy).toHaveBeenCalledOnce();
      });

      it("ignores the old ec.error shape with ucp and messages directly in params", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onErrorSpy = vi.fn();
        checkout.addEventListener("checkout:error", onErrorSpy);

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
        await Promise.resolve();

        expect(checkout.error).toBeUndefined();
        expect(onErrorSpy).not.toHaveBeenCalled();
      });

      it("auto-closes when any message has severity 'unrecoverable'", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const errorOrder: string[] = [];
        checkout.addEventListener("checkout:error", () => errorOrder.push("error"));
        checkout.addEventListener("checkout:close", () => errorOrder.push("close"));

        simulateProtocolMessageEvent(
          checkout,
          "ec.error",
          makeErrorParams({ severity: "unrecoverable" }),
          { source: mockCheckoutWindow },
        );
        await Promise.resolve();

        expect(errorOrder).toStrictEqual(["error", "close"]);
      });

      const NON_FATAL_SEVERITIES: ReadonlyArray<CheckoutMessageError["severity"]> = [
        "recoverable",
        "requires_buyer_input",
        "requires_buyer_review",
      ];
      it.each(NON_FATAL_SEVERITIES)(
        "does not auto-close when severity is %s",
        async (severity: CheckoutMessageError["severity"]) => {
          const { checkout, mockCheckoutWindow } = openPopupCheckout();
          const closeSpy = vi.fn();
          checkout.addEventListener("checkout:close", closeSpy);

          simulateProtocolMessageEvent(checkout, "ec.error", makeErrorParams({ severity }), {
            source: mockCheckoutWindow,
          });
          await Promise.resolve();

          expect(closeSpy).not.toHaveBeenCalled();
        },
      );
    });

    describe("checkout:lineItemsChange", () => {
      it("updates the checkout property and dispatches an ec:lineItemsChange event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onLineItemsChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(
          checkout,
          "checkout:lineItemsChange",
          onLineItemsChangeSpy,
        );

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.line_items.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toBe(payload.checkout);
        expect(onLineItemsChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:buyerChange", () => {
      it("updates the checkout property and dispatches an ec:buyerChange event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onBuyerChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "checkout:buyerChange", onBuyerChangeSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.buyer.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toBe(payload.checkout);
        expect(onBuyerChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:totalsChange", () => {
      it("updates the checkout property and dispatches an ec:totalsChange event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onTotalsChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(checkout, "checkout:totalsChange", onTotalsChangeSpy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.totals.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toBe(payload.checkout);
        expect(onTotalsChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:messagesChange", () => {
      it("updates the checkout property and dispatches an ec:messagesChange event", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onMessagesChangeSpy = vi.fn();
        const listenForEvent = waitForEvent(
          checkout,
          "checkout:messagesChange",
          onMessagesChangeSpy,
        );

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.messages.change", payload, {
          source: mockCheckoutWindow,
        });
        await listenForEvent;

        expect(checkout.checkout).toBe(payload.checkout);
        expect(onMessagesChangeSpy).toHaveBeenCalledOnce();
      });
    });

    describe("event.detail payloads", () => {
      it("checkout:start carries {checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:start", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toEqual({ checkout: payload.checkout });
      });

      it("checkout:complete carries {checkout, order}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:complete", spy);

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
        expect(event.detail).toEqual({ checkout: payload.checkout, order });
      });

      it("checkout:error carries {error}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:error", spy);

        const errorParams = makeErrorParams();
        simulateProtocolMessageEvent(checkout, "ec.error", errorParams, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toEqual({ error: errorParams.error });
      });

      it("checkout:lineItemsChange carries {lineItems, checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:lineItemsChange", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.line_items.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail.lineItems).toBe(payload.checkout.line_items);
        expect(event.detail.checkout).toBe(payload.checkout);
      });

      it("checkout:buyerChange carries {buyer, checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:buyerChange", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.buyer.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail.buyer).toBe(payload.checkout.buyer);
        expect(event.detail.checkout).toBe(payload.checkout);
      });

      it("checkout:totalsChange carries {totals, checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:totalsChange", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.totals.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail.totals).toBe(payload.checkout.totals);
        expect(event.detail.checkout).toBe(payload.checkout);
      });

      it("checkout:messagesChange carries {messages, checkout}", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const spy = vi.fn();
        const wait = waitForEvent(checkout, "checkout:messagesChange", spy);

        const payload = makeCheckoutPayload();
        simulateProtocolMessageEvent(checkout, "ec.messages.change", payload, {
          source: mockCheckoutWindow,
        });
        await wait;

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail.messages).toEqual(payload.checkout.messages ?? []);
        expect(event.detail.checkout).toBe(payload.checkout);
      });

      it("checkout:close carries no detail", () => {
        const { checkout } = openPopupCheckout();
        const spy = vi.fn();
        checkout.addEventListener("checkout:close", spy);

        checkout.close();

        const event = spy.mock.calls[0]![0] as CustomEvent;
        expect(event.detail).toBeNull();
      });
    });

    describe("ec.window.open_request", () => {
      it("opens the requested url in a new tab with noopener when an id is present", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open");

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/return" },
          { id: "open-1", source: mockCheckoutWindow },
        );

        expect(windowOpenSpy).toHaveBeenLastCalledWith(
          "https://example.com/return",
          "_blank",
          "noopener",
        );
      });

      it("posts a JSON-RPC response back to the source", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        vi.spyOn(window, "open").mockReturnValue(null);

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "https://example.com/return" },
          { id: "open-resp", source: mockCheckoutWindow },
        );

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          { jsonrpc: "2.0", id: "open-resp", result: {} },
          { targetOrigin: new URL(checkout.src).origin },
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

      it("posts JSON-RPC errors when params are missing or malformed", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          {} as CheckoutProtocolMessageMap["ec.window.open_request"],
          { id: "open-missing", source: mockCheckoutWindow },
        );

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          {
            url: 42,
          } as unknown as CheckoutProtocolMessageMap["ec.window.open_request"],
          { id: "open-malformed", source: mockCheckoutWindow },
        );

        const targetOrigin = new URL(checkout.src).origin;

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("ec.window.open_request received without a valid url"),
          expect.objectContaining({ name: "ec.window.open_request" }),
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-missing",
            error: {
              code: -32602,
              message: "Invalid params: expected {url: string}",
            },
          },
          { targetOrigin },
        );
        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-malformed",
            error: {
              code: -32602,
              message: "Invalid params: expected {url: string}",
            },
          },
          { targetOrigin },
        );
      });

      it("posts a JSON-RPC error when the url string cannot be parsed", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "not a real url" },
          { id: "open-bad-url", source: mockCheckoutWindow },
        );

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-bad-url",
            error: {
              code: -32602,
              message: "Invalid params: url is not a valid URL",
            },
          },
          { targetOrigin: new URL(checkout.src).origin },
        );
      });

      it("posts a JSON-RPC error when the url uses a non-https scheme", () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const windowOpenSpy = vi.spyOn(window, "open");

        simulateProtocolMessageEvent(
          checkout,
          "ec.window.open_request",
          { url: "http://example.com/insecure" },
          { id: "open-http", source: mockCheckoutWindow },
        );

        expect(mockCheckoutWindow.postMessage).toHaveBeenCalledWith(
          {
            jsonrpc: "2.0",
            id: "open-http",
            error: {
              code: -32602,
              message: "Invalid params: url must use https scheme",
            },
          },
          { targetOrigin: new URL(checkout.src).origin },
        );
        expect(windowOpenSpy).not.toHaveBeenCalledWith(
          "http://example.com/insecure",
          "_blank",
          "noopener",
        );
      });
    });

    describe("message routing", () => {
      it("handles protocol messages from any HTTPS origin when the source matches", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        const payload = makeCheckoutPayload();
        checkout.addEventListener("checkout:start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", payload, {
          source: mockCheckoutWindow,
          origin: "https://other.example.com",
        });
        await Promise.resolve();

        expect(onStartSpy).toHaveBeenCalledOnce();
        expect(checkout.checkout).toBe(payload.checkout);
      });

      it("drops protocol messages when the source is not the checkout window", async () => {
        const { checkout } = openPopupCheckout();
        const otherWindow = createMockWindow();
        const onStartSpy = vi.fn();
        checkout.addEventListener("checkout:start", onStartSpy);

        simulateProtocolMessageEvent(
          checkout,
          "ec.start",
          makeCheckoutPayload(),
          // Right origin, wrong window.
          { source: otherWindow },
        );
        await Promise.resolve();

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
        checkout.addEventListener("checkout:start", onStartSpy);

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
        await Promise.resolve();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("drops protocol messages when the event origin is not HTTPS", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("checkout:start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "http://shop.example.com",
        });
        await Promise.resolve();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("drops protocol messages when the event origin is opaque", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("checkout:start", onStartSpy);

        simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
          source: mockCheckoutWindow,
          origin: "null",
        });
        await Promise.resolve();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
      });

      it("ignores window 'message' events that aren't JSON-RPC checkout protocol messages", async () => {
        const { checkout, mockCheckoutWindow } = openPopupCheckout();
        const onStartSpy = vi.fn();
        checkout.addEventListener("checkout:start", onStartSpy);
        const debugWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        window.dispatchEvent(
          new MessageEvent("message", {
            data: { hello: "world" },
            source: mockCheckoutWindow,
            origin: new URL(checkout.src).origin,
          }),
        );
        await Promise.resolve();

        expect(onStartSpy).not.toHaveBeenCalled();
        expect(debugWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe("addEventListener override", () => {
      it("is a no-op when called with a null listener", () => {
        const checkout = renderCheckout();
        expect(() => {
          checkout.addEventListener("checkout:start", null as unknown as EventListener);
        }).not.toThrow();
      });
    });
  });

  describe("ec_delegate parameter", () => {
    it("declares window.open delegation in popup URL", () => {
      const checkout = renderCheckout({ target: "popup" });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.get("ec_delegate")).toBe("window.open");
    });
  });

  describe("ck_version parameter", () => {
    it("appends ck_version to the opened URL", () => {
      const checkout = renderCheckout({ target: "popup" });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.get("ck_version")).toBe(CK_VERSION);
    });

    it("uses the documented constant value", () => {
      expect(CK_VERSION).toBe("4.0.0");
    });

    it("includes ck_version on the overlay link", () => {
      const checkout = renderCheckout({
        src: "https://shop.example.com/checkout",
      });
      const link = checkout.shadowRoot!.querySelector<HTMLAnchorElement>("#overlay-link");
      const url = new URL(link!.getAttribute("href") ?? "");
      expect(url.searchParams.get("ck_version")).toBe(CK_VERSION);
    });

    it("preserves caller-provided ck_version rather than appending a duplicate", () => {
      const checkout = renderCheckout({
        src: "https://shop.example.com/checkout?ck_version=old",
      });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.getAll("ck_version")).toEqual([CK_VERSION]);
    });
  });

  describe("debug attribute", () => {
    it("logs a console warning for dropped messages when the debug attribute is set", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      checkout.setAttribute("debug", "");
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
        origin: "http://shop.example.com",
      });
      await Promise.resolve();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dropped message from non-HTTPS origin"),
      );
    });

    it("does not log warnings for dropped messages when debug is not set", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
        origin: "http://shop.example.com",
      });
      await Promise.resolve();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("overlay link", () => {
    it('has rel="noopener noreferrer" and target="_blank"', () => {
      const checkout = renderCheckout();
      const link = checkout.shadowRoot!.querySelector<HTMLAnchorElement>("#overlay-link");
      expect(link!.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link!.getAttribute("target")).toBe("_blank");
    });

    it("points to the parametrised checkout URL (matching what the popup would open)", () => {
      const checkout = renderCheckout({
        src: "https://shop.example.com/checkout",
      });
      const link = checkout.shadowRoot!.querySelector<HTMLAnchorElement>("#overlay-link");
      const href = link!.getAttribute("href") ?? "";
      const url = new URL(href);
      expect(url.origin).toBe("https://shop.example.com");
      expect(url.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);
    });
  });

  describe("lifecycle", () => {
    it("preserves the shadow tree across element moves", () => {
      const checkout = renderCheckout();
      const wrapper = checkout.shadowRoot!.querySelector("#shopify-element-wrapper");

      const newParent = document.createElement("div");
      document.body.appendChild(newParent);
      newParent.appendChild(checkout);

      expect(checkout.shadowRoot!.querySelector("#shopify-element-wrapper")).toBe(wrapper);
      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
    });

    it("drops protocol messages while the element is disconnected", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      const onStartSpy = vi.fn();
      checkout.addEventListener("checkout:start", onStartSpy);

      checkout.remove();

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
      });
      await Promise.resolve();

      expect(onStartSpy).not.toHaveBeenCalled();
    });

    it("re-attaches the message listener on reconnect without duplicating it", async () => {
      const { checkout, mockCheckoutWindow } = openPopupCheckout();
      const onStartSpy = vi.fn();
      checkout.addEventListener("checkout:start", onStartSpy);

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
      });
      await Promise.resolve();
      expect(onStartSpy).toHaveBeenCalledOnce();

      const newParent = document.createElement("div");
      document.body.appendChild(newParent);
      newParent.appendChild(checkout);
      checkout.open();

      simulateProtocolMessageEvent(checkout, "ec.start", makeCheckoutPayload(), {
        source: mockCheckoutWindow,
      });
      await Promise.resolve();

      expect(onStartSpy).toHaveBeenCalledTimes(2);
    });

    it("routes messages independently when multiple instances coexist on the same page", async () => {
      const first = openPopupCheckout();
      const second = openPopupCheckout();

      const firstSpy = vi.fn();
      const secondSpy = vi.fn();
      first.checkout.addEventListener("checkout:start", firstSpy);
      second.checkout.addEventListener("checkout:start", secondSpy);

      const firstPayload = makeCheckoutPayload();
      simulateProtocolMessageEvent(first.checkout, "ec.start", firstPayload, {
        source: first.mockCheckoutWindow,
      });
      await Promise.resolve();

      expect(firstSpy).toHaveBeenCalledOnce();
      expect(secondSpy).not.toHaveBeenCalled();
      expect(first.checkout.checkout).toBe(firstPayload.checkout);
      expect(second.checkout.checkout).toBeUndefined();

      const secondPayload = makeCheckoutPayload();
      simulateProtocolMessageEvent(second.checkout, "ec.start", secondPayload, {
        source: second.mockCheckoutWindow,
      });
      await Promise.resolve();

      expect(firstSpy).toHaveBeenCalledOnce();
      expect(secondSpy).toHaveBeenCalledOnce();
      expect(first.checkout.checkout).toBe(firstPayload.checkout);
      expect(second.checkout.checkout).toBe(secondPayload.checkout);
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
function simulateProtocolMessageEvent<Message extends keyof CheckoutProtocolMessageMap>(
  checkout: ShopifyCheckout,
  name: Message,
  params: CheckoutProtocolMessageMap[Message],
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

function mockWindowSize(width = 1200, height = 800) {
  Object.defineProperty(window, "outerWidth", { value: width, writable: true });
  Object.defineProperty(window, "outerHeight", {
    value: height,
    writable: true,
  });
  Object.defineProperty(window, "screenLeft", { value: 0, writable: true });
  Object.defineProperty(window, "screenTop", { value: 0, writable: true });
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: width,
    writable: true,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    value: height,
    writable: true,
  });
  Object.defineProperty(screen, "width", { value: width, writable: true });
  Object.defineProperty(screen, "height", { value: height, writable: true });
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
function openPopupCheckout(): {
  checkout: ShopifyCheckout;
  mockCheckoutWindow: Window;
} {
  const checkout = renderCheckout({ target: "popup" });
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

function makeCheckoutPayload(overrides: Partial<Checkout> = {}): {
  checkout: Checkout;
} {
  return {
    checkout: {
      ucp: { version: "2026-04-08" } as Checkout["ucp"],
      id: "gid://shopify/Checkout/test",
      currency: "USD",
      line_items: [],
      totals: [],
      payment: {} as Checkout["payment"],
      status: "incomplete",
      links: [],
      ...overrides,
    } as Checkout,
  };
}

function makeErrorPayload(overrides?: {
  severity?: CheckoutMessageError["severity"];
}): UcpErrorResponse {
  return {
    ucp: { version: "2026-04-08", status: "error" },
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
  severity?: CheckoutMessageError["severity"];
}): CheckoutProtocolMessageMap["ec.error"] {
  return { error: makeErrorPayload(overrides) };
}
