import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbeddedCheckoutProtocol } from "@shopify/checkout-kit-protocol";

import "./checkout-web-component";
import { DEFAULT_POPUP_WIDTH, DEFAULT_POPUP_HEIGHT } from "./checkout";
import type { ShopifyCheckout } from "./checkout";

const EMBED_PROTOCOL_VERSION = EmbeddedCheckoutProtocol.specVersion;

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
    // Disconnect elements so their global message listeners do not leak
    // into tests in this file or another concurrently running suite.
    document.body.innerHTML = "";
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
      checkout.addEventListener("ec.close", closeEventSpy);

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
            checkout.addEventListener("ec.close", closeEventSpy);

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
          checkout.addEventListener("ec.close", closeEventSpy);

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
            checkout.addEventListener("ec.close", closeEventSpy);

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
            checkout.addEventListener("ec.close", closeEventSpy);

            checkout.open();
            window.dispatchEvent(new FocusEvent("focus"));
            vi.advanceTimersByTime(50);

            expect(closeEventSpy).not.toHaveBeenCalled();
          } finally {
            vi.useRealTimers();
          }
        });

        it("does not abort a reopened session when a stale focus timer from the previous session fires", () => {
          vi.useFakeTimers();
          try {
            const checkout = renderCheckout({ target: "popup" });
            const firstWindow = createMockWindow();
            const secondWindow = createMockWindow();
            (firstWindow as { closed: boolean }).closed = false;
            (secondWindow as { closed: boolean }).closed = false;
            vi.spyOn(window, "open")
              .mockReturnValueOnce(firstWindow)
              .mockReturnValueOnce(secondWindow);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});

            const closeEventSpy = vi.fn();
            checkout.addEventListener("ec.close", closeEventSpy);

            // Session A opens.
            checkout.open();

            // The user closes window A; the page regains focus and schedules the
            // 50ms timer that captures window A.
            (firstWindow as { closed: boolean }).closed = true;
            window.dispatchEvent(new FocusEvent("focus"));

            // Within the 50ms window, checkout reopens as session B.
            checkout.open();

            // The stale timer from session A now fires.
            vi.advanceTimersByTime(50);

            // Only session A's close should have fired; session B must stay alive.
            expect(closeEventSpy).toHaveBeenCalledTimes(1);
            expect(secondWindow.close).not.toHaveBeenCalled();
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

            checkout.addEventListener("ec.close", closeEventSpy);
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
});

// Test utilities

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
