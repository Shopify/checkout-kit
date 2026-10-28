import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@shopify/checkout-kit-checkout/register";
import "@shopify/checkout-kit-universal-checkout/register";
import "@shopify/checkout-kit-shop-pay/register";
import * as capabilities from "@shopify/checkout-kit-core/checkout/browser-capabilities";

function popup(): Window {
  return {
    closed: false,
    close: vi.fn(),
    focus: vi.fn(),
    postMessage: vi.fn(),
  } as unknown as Window;
}

function failure(event: Event): { code: string; message: string } {
  const detail = (event as CustomEvent).detail;
  return Array.isArray(detail) ? detail[0].error : detail.error;
}

describe.each(["shopify-checkout", "shopify-universal-checkout", "shop-pay"] as const)(
  "%s opening failures",
  (tag) => {
    beforeEach(() => {
      vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => {});
      vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
    });

    afterEach(() => {
      document.body.innerHTML = "";
      vi.restoreAllMocks();
    });

    function render(src = "https://shop.example.com/checkouts/uc/example") {
      const checkout = document.createElement(tag);
      checkout.src = src;
      checkout.telemetry = false;
      checkout.logLevel = "warn";
      document.body.append(checkout);
      return checkout;
    }

    it.each(["", "not-a-url", "http://shop.example.com/checkout"])(
      "reports sdk_error for invalid src %j without opening a window",
      (src) => {
        const checkout = render(src);
        const open = vi.spyOn(window, "open");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const errors: unknown[] = [];
        checkout.addEventListener("error", (event: Event) => errors.push(failure(event)));

        expect(() => checkout.open()).not.toThrow();

        expect(open).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(
          `<${tag}>: src property is empty or invalid, cannot open checkout`,
        );
        expect(errors).toEqual([{ code: "sdk_error", message: "Checkout URL is invalid." }]);
        const currentError = "error" in checkout ? checkout.error : undefined;
        expect(currentError).toEqual(tag === "shopify-checkout" ? errors[0] : undefined);
      },
    );

    it("reports a throwing window open and permits a retry from its error listener", () => {
      const checkout = render();
      const nextWindow = popup();
      const open = vi
        .spyOn(window, "open")
        .mockImplementationOnce(() => {
          throw new Error("private browser diagnostic");
        })
        .mockReturnValue(nextWindow);
      const errors: unknown[] = [];
      checkout.addEventListener("error", (event: Event) => {
        errors.push(failure(event));
        checkout.open();
      });

      expect(() => checkout.open()).not.toThrow();

      expect(errors).toEqual([{ code: "sdk_error", message: "Checkout could not open." }]);
      expect(open).toHaveBeenCalledTimes(2);
      expect(nextWindow.close).not.toHaveBeenCalled();
      checkout.close();
      expect(nextWindow.close).toHaveBeenCalledOnce();
    });

    it("closes a window if its overlay cannot open", () => {
      const checkout = render();
      const openedWindow = popup();
      vi.spyOn(window, "open").mockReturnValue(openedWindow);
      vi.mocked(HTMLDialogElement.prototype.showModal).mockImplementation(() => {
        throw new Error("dialog failed");
      });
      const errors: unknown[] = [];
      checkout.addEventListener("error", (event: Event) => errors.push(failure(event)));

      expect(() => checkout.open()).not.toThrow();

      expect(openedWindow.close).toHaveBeenCalledOnce();
      expect(errors).toEqual([{ code: "sdk_error", message: "Checkout could not open." }]);
    });

    it("closes the previous presentation before reporting an unsupported browser", () => {
      const checkout = render();
      const openedWindow = popup();
      const open = vi.spyOn(window, "open").mockReturnValue(openedWindow);
      checkout.open();
      const events: string[] = [];
      checkout.addEventListener("close", () => events.push("close"));
      checkout.addEventListener("error", (event: Event) => events.push(failure(event).code));
      vi.spyOn(capabilities, "getUnsupportedBrowserCapabilities").mockReturnValue([
        "native_dialog",
      ]);

      checkout.open();

      expect(open).toHaveBeenCalledOnce();
      expect(openedWindow.close).toHaveBeenCalledOnce();
      expect(events).toEqual(["close", "unsupported_browser"]);
    });
  },
);
