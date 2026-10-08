import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddedCheckoutProtocol } from "@shopify/checkout-kit-protocol";

import "./checkout-web-component";
import { DEFAULT_POPUP_WIDTH, DEFAULT_POPUP_HEIGHT } from "./checkout";
import type { ShopifyCheckout } from "./checkout";
import { mockTelemetry } from "./telemetry.test-helpers";

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
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    // Disconnect elements so their global message listeners do not leak
    // into tests in this file or another concurrently running suite.
    document.body.innerHTML = "";
    vi.restoreAllMocks();
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
      checkout.addEventListener("close", closeEventSpy);

      checkout.open();
      expect(closeEventSpy).not.toHaveBeenCalled();

      checkout.setAttribute("target", "auto");

      expect(closeEventSpy).toHaveBeenCalledTimes(1);
    });

    it("closes the blocked overlay when the target attribute changes", () => {
      const checkout = renderCheckout({ target: "popup" });
      vi.spyOn(window, "open").mockReturnValue(null);

      const closeEventSpy = vi.fn();
      checkout.addEventListener("close", closeEventSpy);

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

  describe('when target="inline"', () => {
    it("automatically mounts one checkout without opening a window or modal dialog", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const showModalSpy = vi
        .spyOn(HTMLDialogElement.prototype, "showModal")
        .mockImplementation(() => {});
      const checkout = renderCheckout({ target: "inline" });
      const iframe = getInlineFrame(checkout);

      expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
      expect(iframe.parentElement).toBe(checkout.shadowRoot!.querySelector(".Shopify-target"));
      expect(iframe.title).toBe("Checkout");
      expect(iframe.getAttribute("sandbox")).toBe(
        "allow-scripts allow-same-origin allow-forms allow-popups",
      );
      expect(iframe.getAttribute("allow")).toBe(
        "publickey-credentials-get https://pay.shopify.com https://shop.app; geolocation",
      );
      expect(new URL(iframe.src).pathname).toBe(new URL(checkout.src).pathname);
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(showModalSpy).not.toHaveBeenCalled();
      expect(checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!.open).toBe(false);
    });

    it("does not mount on a disconnected open and mounts when connected", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const checkout = document.createElement("shopify-checkout");
      checkout.src = "https://demostore.mock.shop/cart/43696905224214:1";
      checkout.target = "inline";
      const closeSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);

      checkout.open();

      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();

      document.body.appendChild(checkout);

      expect(getInlineFrame(checkout).contentWindow).not.toBeNull();
      expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
    });

    it("keeps the browsing context for repeated open and unchanged effective source", () => {
      const checkout = renderCheckout({ target: "inline", appearance: "storefront" });
      const iframe = getInlineFrame(checkout);
      const checkoutWindow = iframe.contentWindow!;
      const originalSrc = iframe.src;
      const navigateSpy = vi.spyOn(iframe, "src", "set");
      const closeSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);

      checkout.open();
      checkout.open();
      checkout.setAttribute("src", checkout.src);
      checkout.setAttribute("appearance", checkout.appearance);
      checkout.setAttribute("target", checkout.target);
      // The URL builder replaces incoming branding, so this is the same
      // negotiated checkout URL despite a different source attribute.
      checkout.src = `${checkout.src}?ck_branding=app`;

      expect(getInlineFrame(checkout)).toBe(iframe);
      expect(iframe.contentWindow).toBe(checkoutWindow);
      expect(iframe.src).toBe(originalSrc);
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it("closes once without closing the iframe window and stays closed on unchanged attributes", () => {
      const checkout = renderCheckout({ target: "inline", appearance: "storefront" });
      const iframe = getInlineFrame(checkout);
      const windowCloseSpy = vi.spyOn(iframe.contentWindow!, "close").mockImplementation(() => {});
      const closeSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);

      checkout.close();
      checkout.close();
      checkout.setAttribute("src", checkout.src);
      checkout.setAttribute("appearance", checkout.appearance);
      checkout.setAttribute("target", checkout.target);

      expect(iframe.isConnected).toBe(false);
      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(windowCloseSpy).not.toHaveBeenCalled();
    });

    it("reopens with a fresh window and ignores the removed frame", () => {
      const checkout = renderCheckout({ target: "inline" });
      const firstFrame = getInlineFrame(checkout);
      const firstWindow = firstFrame.contentWindow!;
      const startSpy = vi.fn();
      const closeSpy = vi.fn();
      checkout.addEventListener("start", startSpy);
      checkout.addEventListener("close", closeSpy);

      checkout.close();
      checkout.open();
      const secondFrame = getInlineFrame(checkout);
      const secondWindow = secondFrame.contentWindow!;

      expect(secondFrame).not.toBe(firstFrame);
      expect(secondWindow).not.toBe(firstWindow);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      sendInlineSnapshot(firstWindow, "ec.start", "stale-checkout");
      expect(startSpy).not.toHaveBeenCalled();
      expect(checkout.checkout).toBeUndefined();
      sendInlineSnapshot(secondWindow, "ec.start");
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(checkout.checkout?.id).toBe("gid://shopify/Checkout/inline");
    });

    it.each(["src", "appearance"] as const)(
      "replaces the active frame and resets session history when %s changes",
      (attribute) => {
        const checkout = renderCheckout({ target: "inline" });
        const firstFrame = getInlineFrame(checkout);
        const firstWindow = firstFrame.contentWindow!;
        const windowCloseSpy = vi.spyOn(firstWindow, "close").mockImplementation(() => {});
        const closeSpy = vi.fn();
        const updateSpy = vi.fn();
        checkout.addEventListener("close", closeSpy);
        checkout.addEventListener("update", updateSpy);
        sendInlineSnapshot(firstWindow, "ec.totals.change");

        if (attribute === "src") {
          checkout.src = "https://demostore.mock.shop/cart/43696905224214:2";
        } else {
          checkout.appearance = "app:dark";
        }
        const secondFrame = getInlineFrame(checkout);

        expect(firstFrame.isConnected).toBe(false);
        expect(secondFrame).not.toBe(firstFrame);
        expect(secondFrame.contentWindow).not.toBe(firstWindow);
        expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(windowCloseSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();
        const url = new URL(secondFrame.src);
        expect(url.pathname).toBe(
          attribute === "src" ? "/cart/43696905224214:2" : "/cart/43696905224214:1",
        );
        expect(url.searchParams.get("ck_branding")).toBe(attribute === "src" ? "shop" : "app");
        expect(url.searchParams.get("ec_color_scheme")).toBe(
          attribute === "src" ? "web_default" : "dark",
        );

        sendInlineSnapshot(firstWindow, "ec.start", "stale-checkout");
        expect(checkout.checkout).toBeUndefined();
        sendInlineSnapshot(secondFrame.contentWindow!, "ec.totals.change");
        expect(updateSpy).toHaveBeenCalledTimes(2);
      },
    );

    it.each(["", "not-a-url", "http://demostore.mock.shop/cart/1:1", undefined])(
      "silently skips automatic mounting for an invalid or missing source (%s)",
      (src) => {
        const telemetrySpy = vi.spyOn(mockTelemetry(), "recordError");
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
        const checkout = document.createElement("shopify-checkout");
        checkout.target = "inline";
        checkout.logLevel = "warn";
        checkout.src = src;
        const closeSpy = vi.fn();
        checkout.addEventListener("close", closeSpy);

        document.body.appendChild(checkout);

        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(telemetrySpy).not.toHaveBeenCalled();
        expect(closeSpy).not.toHaveBeenCalled();
        expect(windowOpenSpy).not.toHaveBeenCalled();

        checkout.open();

        expect(warnSpy).toHaveBeenCalledWith(
          "<shopify-checkout>: src property is empty or invalid, cannot open checkout",
        );
        expect(telemetrySpy).toHaveBeenCalledWith({
          category: "navigation",
          stage: "initialization",
          code: "invalid_url",
          retryable: false,
          isRetry: false,
        });
        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(closeSpy).not.toHaveBeenCalled();
        expect(windowOpenSpy).not.toHaveBeenCalled();
      },
    );

    it.each(["", "not-a-url", "http://demostore.mock.shop/cart/1:1", undefined])(
      "tears down an active frame when its source becomes invalid or missing (%s)",
      (src) => {
        const checkout = renderCheckout({ target: "inline" });
        const firstFrame = getInlineFrame(checkout);
        const firstWindow = firstFrame.contentWindow!;
        const closeSpy = vi.fn();
        const startSpy = vi.fn();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const telemetrySpy = vi.spyOn(mockTelemetry(), "recordError");
        checkout.addEventListener("close", closeSpy);
        checkout.addEventListener("start", startSpy);

        checkout.src = src;

        expect(firstFrame.isConnected).toBe(false);
        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).not.toHaveBeenCalled();
        expect(telemetrySpy).not.toHaveBeenCalled();
        sendInlineSnapshot(firstWindow, "ec.start");
        expect(startSpy).not.toHaveBeenCalled();
        expect(checkout.checkout).toBeUndefined();

        checkout.src = "https://demostore.mock.shop/cart/43696905224214:2";

        expect(getInlineFrame(checkout).contentWindow).not.toBe(firstWindow);
        expect(closeSpy).toHaveBeenCalledTimes(1);
      },
    );

    it.each(["src", "appearance"] as const)(
      "automatically reopens a closed checkout when %s changes",
      (attribute) => {
        const checkout = renderCheckout({ target: "inline" });
        const firstWindow = getInlineFrame(checkout).contentWindow!;
        const closeSpy = vi.fn();
        checkout.addEventListener("close", closeSpy);
        checkout.close();

        if (attribute === "src") {
          checkout.src = "https://demostore.mock.shop/cart/43696905224214:2";
        } else {
          checkout.appearance = "storefront";
        }

        expect(getInlineFrame(checkout).contentWindow).not.toBe(firstWindow);
        expect(closeSpy).toHaveBeenCalledTimes(1);
      },
    );

    it.each(["src", "appearance"] as const)(
      "clears a terminal error and snapshot history when %s starts a new session",
      (attribute) => {
        const checkout = renderCheckout({ target: "inline" });
        const firstWindow = getInlineFrame(checkout).contentWindow!;
        const closeSpy = vi.fn();
        const updateSpy = vi.fn();
        checkout.addEventListener("close", closeSpy);
        checkout.addEventListener("update", updateSpy);
        sendInlineSnapshot(firstWindow, "ec.totals.change");
        sendInlineError(checkout, firstWindow);
        expect(checkout.error?.message).toBe("Retry checkout");
        expect(checkout.checkout?.id).toBe("gid://shopify/Checkout/inline");
        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();

        if (attribute === "src") {
          checkout.src = "https://demostore.mock.shop/cart/43696905224214:2";
        } else {
          checkout.appearance = "storefront";
        }
        const newWindow = getInlineFrame(checkout).contentWindow!;

        expect(newWindow).not.toBe(firstWindow);
        expect(checkout.error).toBeUndefined();
        expect(checkout.checkout).toBeUndefined();
        expect(closeSpy).toHaveBeenCalledTimes(1);
        sendInlineSnapshot(newWindow, "ec.totals.change");
        expect(updateSpy).toHaveBeenCalledTimes(2);
      },
    );

    it("closes a popup before automatically binding an inline session", () => {
      const checkout = renderCheckout({ target: "popup" });
      const popupWindow = createMockWindow();
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(popupWindow);
      vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
      const dialogCloseSpy = vi
        .spyOn(HTMLDialogElement.prototype, "close")
        .mockImplementation(() => {});
      const closeSpy = vi.fn();
      const startSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);
      checkout.addEventListener("start", startSpy);
      checkout.open();

      checkout.target = "inline";
      const iframe = getInlineFrame(checkout);

      expect(popupWindow.close).toHaveBeenCalledTimes(1);
      expect(dialogCloseSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
      expect(checkout.shadowRoot!.querySelector(".Shopify-target")!.classList).toContain(
        "Shopify-target--inline",
      );
      sendInlineSnapshot(popupWindow, "ec.start", "stale-popup");
      expect(startSpy).not.toHaveBeenCalled();
      sendInlineSnapshot(iframe.contentWindow!, "ec.start");
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it.each(["popup", "auto", "_blank", "named-checkout"])(
      "closes inline when switching to %s without opening the new target until requested",
      (target) => {
        const checkout = renderCheckout({ target: "inline" });
        const firstFrame = getInlineFrame(checkout);
        const windowCloseSpy = vi
          .spyOn(firstFrame.contentWindow!, "close")
          .mockImplementation(() => {});
        const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
        vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
        vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
        const closeSpy = vi.fn();
        checkout.addEventListener("close", closeSpy);

        checkout.target = target;

        expect(firstFrame.isConnected).toBe(false);
        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(windowCloseSpy).not.toHaveBeenCalled();
        expect(windowOpenSpy).not.toHaveBeenCalled();
        const targetClasses = checkout.shadowRoot!.querySelector(".Shopify-target")!.classList;
        expect(targetClasses).not.toContain("Shopify-target--inline");
        expect(targetClasses).toContain(`Shopify-target--${target}`);

        checkout.open();

        expect(windowOpenSpy).toHaveBeenCalledTimes(1);
        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(closeSpy).toHaveBeenCalledTimes(1);
      },
    );

    it("automatically creates a new frame when reentering inline after close", () => {
      const checkout = renderCheckout({ target: "inline" });
      const firstWindow = getInlineFrame(checkout).contentWindow!;
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const closeSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);
      checkout.close();

      checkout.target = "auto";
      checkout.target = "inline";

      expect(getInlineFrame(checkout).contentWindow).not.toBe(firstWindow);
      expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("disconnects cleanly and reconnects with one fresh frame and one active message listener", () => {
      const checkout = renderCheckout({ target: "inline" });
      const closeSpy = vi.fn();
      const startSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);
      checkout.addEventListener("start", startSpy);

      for (let cycle = 1; cycle <= 2; cycle++) {
        const oldFrame = getInlineFrame(checkout);
        const oldWindow = oldFrame.contentWindow!;
        const windowCloseSpy = vi.spyOn(oldWindow, "close").mockImplementation(() => {});
        checkout.remove();

        expect(oldFrame.isConnected).toBe(false);
        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(closeSpy).toHaveBeenCalledTimes(cycle);
        expect(windowCloseSpy).not.toHaveBeenCalled();
        sendInlineSnapshot(oldWindow, "ec.start", "detached-checkout");
        expect(startSpy).toHaveBeenCalledTimes(cycle - 1);

        document.body.appendChild(checkout);
        const newFrame = getInlineFrame(checkout);
        expect(newFrame).not.toBe(oldFrame);
        expect(newFrame.contentWindow).not.toBe(oldWindow);
        expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
        expect(checkout.checkout).toBeUndefined();
        sendInlineSnapshot(oldWindow, "ec.start", "stale-checkout");
        expect(startSpy).toHaveBeenCalledTimes(cycle - 1);
        sendInlineSnapshot(newFrame.contentWindow!, "ec.start");
        expect(startSpy).toHaveBeenCalledTimes(cycle);
      }
    });

    it("reparents with one new frame and does not retain the old message listener", () => {
      const checkout = renderCheckout({ target: "inline" });
      const firstFrame = getInlineFrame(checkout);
      const firstWindow = firstFrame.contentWindow!;
      const newParent = document.createElement("section");
      document.body.appendChild(newParent);
      const closeSpy = vi.fn();
      const startSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);
      checkout.addEventListener("start", startSpy);

      newParent.appendChild(checkout);
      const secondFrame = getInlineFrame(checkout);

      expect(firstFrame.isConnected).toBe(false);
      expect(secondFrame.contentWindow).not.toBe(firstWindow);
      expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      sendInlineSnapshot(firstWindow, "ec.start", "stale-checkout");
      expect(startSpy).not.toHaveBeenCalled();
      sendInlineSnapshot(secondFrame.contentWindow!, "ec.start");
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it("focuses only the active iframe window", () => {
      const checkout = renderCheckout({ target: "inline" });
      const firstWindow = getInlineFrame(checkout).contentWindow!;
      const firstFocusSpy = vi.spyOn(firstWindow, "focus").mockImplementation(() => {});

      checkout.focus();

      expect(firstFocusSpy).toHaveBeenCalledTimes(1);
      checkout.close();
      checkout.focus();
      expect(firstFocusSpy).toHaveBeenCalledTimes(1);

      checkout.open();
      const secondWindow = getInlineFrame(checkout).contentWindow!;
      const secondFocusSpy = vi.spyOn(secondWindow, "focus").mockImplementation(() => {});
      checkout.focus();

      expect(secondFocusSpy).toHaveBeenCalledTimes(1);
      expect(firstFocusSpy).toHaveBeenCalledTimes(1);
    });

    it("preserves an inline session created by a close listener during popup reopen", () => {
      const checkout = renderCheckout({ target: "popup" });
      const popupWindow = createMockWindow();
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(popupWindow);
      vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
      vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
      const closeSpy = vi.fn();
      const startSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);
      checkout.addEventListener("start", startSpy);
      checkout.open();
      checkout.addEventListener(
        "close",
        () => {
          checkout.target = "inline";
        },
        { once: true },
      );

      checkout.open();
      const iframe = getInlineFrame(checkout);
      sendInlineSnapshot(iframe.contentWindow!, "ec.start");

      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
      expect(popupWindow.close).toHaveBeenCalledTimes(1);
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      checkout.close();
      expect(iframe.isConnected).toBe(false);
      expect(closeSpy).toHaveBeenCalledTimes(2);
    });

    it.each(["explicit close", "source replacement"] as const)(
      "preserves a fresh session opened reentrantly during %s",
      (transition) => {
        const checkout = renderCheckout({ target: "inline" });
        const firstFrame = getInlineFrame(checkout);
        const firstWindow = firstFrame.contentWindow!;
        const windowCloseSpy = vi.spyOn(firstWindow, "close").mockImplementation(() => {});
        const closeSpy = vi.fn();
        const startSpy = vi.fn();
        checkout.addEventListener("close", closeSpy);
        checkout.addEventListener("start", startSpy);
        checkout.addEventListener("close", () => checkout.open(), { once: true });

        if (transition === "explicit close") {
          checkout.close();
        } else {
          checkout.src = "https://demostore.mock.shop/cart/43696905224214:2";
        }
        const reopenedFrame = getInlineFrame(checkout);
        const reopenedWindow = reopenedFrame.contentWindow!;

        expect(firstFrame.isConnected).toBe(false);
        expect(reopenedWindow).not.toBe(firstWindow);
        expect(checkout.shadowRoot!.querySelectorAll("iframe")).toHaveLength(1);
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(windowCloseSpy).not.toHaveBeenCalled();
        sendInlineSnapshot(firstWindow, "ec.start", "stale-checkout");
        expect(startSpy).not.toHaveBeenCalled();
        sendInlineSnapshot(reopenedWindow, "ec.start");
        expect(startSpy).toHaveBeenCalledTimes(1);
        expect(checkout.checkout?.id).toBe("gid://shopify/Checkout/inline");

        checkout.close();

        expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
        expect(closeSpy).toHaveBeenCalledTimes(2);
      },
    );

    it("does not create a fallback session when the mount target is unavailable", () => {
      const checkout = renderCheckout({ target: "inline", src: "" });
      const target = checkout.shadowRoot!.querySelector(".Shopify-target")!;
      target.remove();
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const closeSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);

      checkout.src = "https://demostore.mock.shop/cart/43696905224214:1";
      checkout.open();
      checkout.close();

      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();

      checkout.shadowRoot!.appendChild(target);
      checkout.open();
      expect(getInlineFrame(checkout).contentWindow).not.toBeNull();
      checkout.close();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it("removes a partial frame without a lifecycle event when contentWindow is unavailable", () => {
      const checkout = renderCheckout({ target: "inline", src: "" });
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const contentWindowSpy = vi
        .spyOn(HTMLIFrameElement.prototype, "contentWindow", "get")
        .mockReturnValue(null);
      const closeSpy = vi.fn();
      checkout.addEventListener("close", closeSpy);

      checkout.src = "https://demostore.mock.shop/cart/43696905224214:1";
      checkout.open();
      checkout.close();

      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();

      contentWindowSpy.mockRestore();
      checkout.open();
      expect(getInlineFrame(checkout).contentWindow).not.toBeNull();
      checkout.close();
      expect(closeSpy).toHaveBeenCalledTimes(1);
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
            const telemetrySpy = vi.spyOn(mockTelemetry(), "recordError");
            const checkout = renderCheckout({ target, "log-level": "warn" });
            checkout.src = "";
            const windowOpenSpy = vi.spyOn(window, "open");
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            checkout.open();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
              "<shopify-checkout>: src property is empty or invalid, cannot open checkout",
            );
            expect(windowOpenSpy).not.toHaveBeenCalled();
            expect(telemetrySpy).toHaveBeenCalledWith({
              category: "navigation",
              stage: "initialization",
              code: "invalid_url",
              retryable: false,
              isRetry: false,
            });
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
            const telemetrySpy = vi.spyOn(mockTelemetry(), "recordError");
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);

            checkout.open();

            expect(windowOpenSpy).toHaveBeenCalled();
            expect(telemetrySpy).toHaveBeenCalledWith({
              category: "navigation",
              stage: "presentation",
              code: "blocked",
              retryable: true,
              isRetry: false,
            });
            // Should not throw error when popup is blocked
          });
        });

        it("shows the blocked overlay when the popup is blocked", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target, "log-level": "warn" });
            vi.spyOn(window, "open").mockReturnValue(null);
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const dialogShowModalSpy = vi
              .spyOn(HTMLDialogElement.prototype, "showModal")
              .mockImplementation(() => {});

            checkout.open();

            const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
            expect(dialogShowModalSpy).toHaveBeenCalledTimes(1);
            expect(dialog.dataset.state).toBe("blocked");
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              "<shopify-checkout>: checkout window could not be opened; the browser may have blocked it",
            );
          });
        });

        it("opens checkout when the blocked overlay's retry button is clicked", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi
              .spyOn(window, "open")
              .mockReturnValueOnce(null)
              .mockReturnValueOnce(createMockWindow());
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);

            checkout.open();
            checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-retry-button")!.click();

            const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
            expect(windowOpenSpy).toHaveBeenCalledTimes(2);
            expect(dialog.dataset.state).toBeUndefined();
            expect(closeEventSpy).not.toHaveBeenCalled();
          });
        });

        it("records a retry when the popup is blocked again from the blocked overlay", () => {
          POPUP_TARGETS.forEach((target) => {
            const telemetrySpy = vi.spyOn(mockTelemetry(), "recordError");
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);

            checkout.open();
            checkout.open();

            expect(telemetrySpy).toHaveBeenLastCalledWith({
              category: "navigation",
              stage: "presentation",
              code: "blocked",
              retryable: true,
              isRetry: true,
            });
          });
        });

        it("ignores the previous dialog's late close event after a retry opens checkout", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const mockWindow = createMockWindow();
            vi.spyOn(window, "open").mockReturnValueOnce(null).mockReturnValueOnce(mockWindow);
            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);

            checkout.open();
            checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-retry-button")!.click();

            // Browsers queue the dialog's `close` event, so it lands after the dialog is re-shown
            const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
            expect(dialog.open).toBe(true);
            dialog.dispatchEvent(new Event("close"));

            expect(mockWindow.close).not.toHaveBeenCalled();
            expect(closeEventSpy).not.toHaveBeenCalled();
          });
        });

        it("ignores the previous dialog's late close event when a retry is blocked again", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);

            checkout.open();
            checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-retry-button")!.click();

            // Browsers queue the dialog's `close` event, so it lands after the dialog is re-shown
            const dialog = checkout.shadowRoot!.querySelector<HTMLDialogElement>("#overlay")!;
            expect(dialog.open).toBe(true);
            dialog.dispatchEvent(new Event("close"));

            expect(dialog.dataset.state).toBe("blocked");
            expect(closeEventSpy).not.toHaveBeenCalled();
          });
        });

        it("does not dispatch close when open() is called while the blocked overlay is showing", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);

            checkout.open();
            checkout.open();

            expect(closeEventSpy).not.toHaveBeenCalled();
          });
        });

        it("dispatches blocked when the popup is blocked", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            const blockedEventSpy = vi.fn();
            checkout.addEventListener("blocked", blockedEventSpy);

            checkout.open();

            expect(blockedEventSpy).toHaveBeenCalledTimes(1);
            expect(blockedEventSpy.mock.calls[0]![0].detail).toStrictEqual({
              code: "popup_blocked",
            });
          });
        });

        it("dispatches blocked to document listeners", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            const documentBlockedSpy = vi.fn();
            document.addEventListener("blocked", documentBlockedSpy);

            try {
              checkout.open();

              expect(documentBlockedSpy).toHaveBeenCalledTimes(1);
            } finally {
              document.removeEventListener("blocked", documentBlockedSpy);
            }
          });
        });

        it("dispatches blocked when the popup is blocked and the overlay is hidden", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            const dialogShowModalSpy = vi
              .spyOn(HTMLDialogElement.prototype, "showModal")
              .mockImplementation(() => {});
            vi.spyOn(window, "getComputedStyle").mockReturnValue({
              getPropertyValue: (prop: string) => {
                if (prop === "display") return "none";
                return "";
              },
            } as CSSStyleDeclaration);
            const blockedEventSpy = vi.fn();
            checkout.addEventListener("blocked", blockedEventSpy);

            checkout.open();

            expect(dialogShowModalSpy).not.toHaveBeenCalled();
            expect(blockedEventSpy).toHaveBeenCalledTimes(1);
          });
        });

        it("ignores open() called from a blocked listener", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target, "log-level": "warn" });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
            vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const blockedEventSpy = vi.fn(() => checkout.open());
            checkout.addEventListener("blocked", blockedEventSpy);

            checkout.open();

            expect(windowOpenSpy).toHaveBeenCalledTimes(1);
            expect(blockedEventSpy).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              "<shopify-checkout>: open() is ignored in a blocked listener; use a user action",
            );
          });
        });

        it("dispatches close when the blocked overlay is dismissed", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);

            checkout.open();
            checkout
              .shadowRoot!.querySelector<HTMLButtonElement>("#overlay-blocked-close-button")!
              .click();

            expect(closeEventSpy).toHaveBeenCalledTimes(1);
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
            const durationSpy = vi.spyOn(mockTelemetry(), "recordNavigationDuration");
            checkout.addEventListener("close", closeEventSpy);

            checkout.open();

            const dialog = checkout.shadowRoot!.querySelector("dialog") as HTMLDialogElement;
            dialog.close();

            expect(mockPopup.close).toHaveBeenCalled();
            expect(closeEventSpy).toHaveBeenCalled();
            expect(durationSpy).not.toHaveBeenCalled();
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
          "falls back to 'auto' when target=%s and warns when log-level is warn",
          (target) => {
            const checkout = renderCheckout({ target, "log-level": "warn" });
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

        it("does not warn when log-level is error", () => {
          const checkout = renderCheckout({ target: "_self", "log-level": "error" });
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
          checkout.addEventListener("close", closeEventSpy);

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

        it("focuses the popup when the overlay button is clicked", () => {
          const { checkout, mockWindow } = openWithRealOverlay();
          const button = checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-link")!;

          const event = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
          });
          button.dispatchEvent(event);

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
            checkout.addEventListener("close", closeEventSpy);

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
            checkout.addEventListener("close", closeEventSpy);

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
            checkout.addEventListener("close", closeEventSpy);

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

            checkout.addEventListener("close", closeEventSpy);
            checkout.open();
            checkout.close();

            expect(closeEventSpy).toHaveBeenCalled();
          });
        });

        it("dispatches close event when the blocked overlay is showing", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);

            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);
            checkout.open();
            checkout.close();

            expect(closeEventSpy).toHaveBeenCalledTimes(1);
          });
        });

        it("dispatches close event when the popup was blocked and the overlay is hidden", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            vi.spyOn(window, "open").mockReturnValue(null);
            vi.spyOn(window, "getComputedStyle").mockReturnValue({
              getPropertyValue: (prop: string) => {
                if (prop === "display") return "none";
                return "";
              },
            } as CSSStyleDeclaration);

            const closeEventSpy = vi.fn();
            checkout.addEventListener("close", closeEventSpy);
            checkout.open();
            checkout.close();

            expect(closeEventSpy).toHaveBeenCalledTimes(1);
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

        it("does not close a session opened from a close listener", () => {
          POPUP_TARGETS.forEach((target) => {
            const checkout = renderCheckout({ target });
            const mockWindow = createMockWindow();
            vi.spyOn(window, "open").mockReturnValueOnce(null).mockReturnValue(mockWindow);

            checkout.addEventListener("close", () => checkout.open(), { once: true });
            checkout.open();
            checkout.close();

            expect(mockWindow.close).not.toHaveBeenCalled();
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

function getInlineFrame(checkout: ShopifyCheckout): HTMLIFrameElement {
  const iframe = checkout.shadowRoot!.querySelector<HTMLIFrameElement>("#checkout-iframe");
  if (!iframe || !iframe.contentWindow) {
    throw new Error("expected a mounted inline checkout with a real browsing context");
  }
  return iframe;
}

function sendInlineSnapshot(
  source: Window,
  method: "ec.start" | "ec.totals.change",
  id = "gid://shopify/Checkout/inline",
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      source,
      origin: "https://demostore.mock.shop",
      data: {
        jsonrpc: "2.0",
        method,
        params: {
          checkout: {
            ucp: { version: EMBED_PROTOCOL_VERSION, payment_handlers: {} },
            id,
            currency: "USD",
            line_items: [],
            totals: [],
            status: "incomplete",
            links: [],
          },
        },
      },
    }),
  );
}

function sendInlineError(checkout: ShopifyCheckout, source: Window) {
  window.dispatchEvent(
    new MessageEvent("message", {
      source,
      origin: new URL(checkout.src).origin,
      data: {
        jsonrpc: "2.0",
        method: "ec.error",
        params: {
          error: {
            ucp: { version: EMBED_PROTOCOL_VERSION, status: "error" },
            messages: [
              {
                type: "error",
                code: "session_failed",
                content: "Retry checkout",
                severity: "unrecoverable",
              },
            ],
          },
        },
      },
    }),
  );
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
