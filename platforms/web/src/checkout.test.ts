import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CheckoutProtocolMessageMap,
  CheckoutAddressChangeStartEvent,
  CheckoutAddressChangeStartResponsePayload,
} from "./checkout.types";
import "./checkout-web-component";
import {
  DEFAULT_POPUP_WIDTH,
  DEFAULT_POPUP_HEIGHT,
  EMBED_URL_PARAMS,
  ShopifyCheckout,
} from "./checkout";

const POPUP_TARGETS = ["popup"] as const;
const NEW_TAB_TARGETS = ["_blank", "auto", "", undefined] as const;

describe("<shopify-checkout>", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

    describe("auth", () => {
      it("changing the auth attribute reflects to the auth property", () => {
        const checkout = renderCheckout();
        const newAuth = "abc123";
        checkout.setAttribute("auth", newAuth);

        expect(checkout.auth).toBe(newAuth);
      });
    });

    describe("colorScheme", () => {
      it("changing the color-scheme attribute reflects to the colorScheme property", () => {
        const checkout = renderCheckout();
        const newColorScheme = "dark";
        checkout.setAttribute("color-scheme", newColorScheme);

        expect(checkout.colorScheme).toBe(newColorScheme);
      });
    });

    describe("preload", () => {
      it("changing the preload attribute reflects to the preload property as a boolean", () => {
        const checkout = renderCheckout();

        checkout.setAttribute("preload", "true");
        expect(checkout.preload).toBe(true);

        // any string value is truthy
        checkout.setAttribute("preload", "false");
        expect(checkout.preload).toBe(true);

        // empty string attribute is truthy
        checkout.setAttribute("preload", "");
        expect(checkout.preload).toBe(true);

        checkout.removeAttribute("preload");
        expect(checkout.preload).toBe(false);
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
  });

  describe("properties", () => {
    describe("locale", () => {
      it("returns undefined before checkout:start event", () => {
        const checkout = renderCheckout();

        expect(checkout.locale).toBeUndefined();
      });

      it("returns checkout-provided locale after checkout:start event", async () => {
        const checkout = renderCheckout();

        expect(checkout.locale).toBeUndefined();

        const listenForEvent = waitForEvent(checkout, "checkout:start");

        const testStartPayload: CheckoutProtocolMessageMap["checkout.start"] = {
          locale: "ja-JP",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: { amount: "0.00", currencyCode: "USD" },
              totalAmount: { amount: "0.00", currencyCode: "USD" },
            },
            buyerIdentity: { countryCode: "JP" },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: { addresses: [] },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.start", testStartPayload);
        await listenForEvent;

        expect(checkout.locale).toBe("ja-JP");
      });
    });

    describe("sessionId", () => {
      it("returns undefined before checkout:submitStart event", () => {
        const checkout = renderCheckout();

        expect(checkout.sessionId).toBeUndefined();
      });

      it("returns checkout-provided sessionId after checkout:submitStart event", async () => {
        const checkout = renderCheckout({ target: "inline" });

        expect(checkout.sessionId).toBeUndefined();

        const listenForEvent = waitForEvent(checkout, "checkout:submitStart");

        const testSubmitStartPayload: CheckoutProtocolMessageMap["checkout.submitStart"] = {
          sessionId: "test-session-id-123",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: { amount: "0.00", currencyCode: "USD" },
              totalAmount: { amount: "0.00", currencyCode: "USD" },
            },
            buyerIdentity: { countryCode: "US" },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: { addresses: [] },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.submitStart", testSubmitStartPayload, {
          id: "test-request-id",
        });
        await listenForEvent;

        expect(checkout.sessionId).toBe("test-session-id-123");
      });
    });

    describe("src", () => {
      it("changing the src property reflects to the src attribute", () => {
        const checkout = renderCheckout();
        const newSrc = "https://example.com/checkout/456";
        checkout.src = newSrc;

        expect(checkout.getAttribute("src")).toBe(newSrc);
      });
    });

    describe("auth", () => {
      it("changing the auth property reflects to the auth attribute", () => {
        const checkout = renderCheckout();
        const newAuth = "abc123";
        checkout.auth = newAuth;

        expect(checkout.getAttribute("auth")).toBe(newAuth);
      });
    });

    describe("colorScheme", () => {
      it("changing the colorScheme property reflects to the color-scheme attribute", () => {
        const checkout = renderCheckout();
        const newColorScheme = "dark";
        checkout.colorScheme = newColorScheme;

        expect(checkout.getAttribute("color-scheme")).toBe(newColorScheme);
      });
    });

    describe("target", () => {
      it("changing the target property reflects to the target attribute", () => {
        const checkout = renderCheckout();
        const newTarget = "_blank";
        checkout.target = newTarget;
        expect(checkout.getAttribute("target")).toBe(newTarget);
      });

      describe('when target is "inline"', () => {
        it("renders an iframe on mount without needing open()", () => {
          const checkout = renderCheckout({ target: "inline" });

          const iframe = checkout.shadowRoot!.querySelector("iframe");
          expect(iframe).not.toBeNull();

          const expectedURL = new URL(checkout.src);
          expectedURL.searchParams.set(
            "embed",
            "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto",
          );
          expect(iframe!.src).toBe(expectedURL.href);
        });
      });
    });

    describe("preload", () => {
      it("accepts string values or boolean values mirroring how an attribute works", () => {
        const checkout = renderCheckout();

        checkout.preload = true;
        expect(checkout.preload).toBe(true);

        // any string value is truthy
        checkout.preload = "false";
        expect(checkout.preload).toBe(true);

        // empty string attribute is truthy
        checkout.preload = "";
        expect(checkout.preload).toBe(true);

        checkout.preload = false;
        expect(checkout.preload).toBe(false);

        checkout.preload = undefined;
        expect(checkout.preload).toBe(false);
      });

      it("changing the preload property reflects to the preload attribute", () => {
        const checkout = renderCheckout();
        checkout.preload = true;
        expect(checkout.getAttribute("preload")).toBeDefined();

        checkout.preload = false;
        expect(checkout.getAttribute("preload")).toBeNull();
      });

      it("adds a preload link to the iframe src when set to true", () => {
        const checkout = renderCheckout();

        checkout.preload = true;

        const preloadLink = checkout.shadowRoot!.querySelector(
          'link[rel="preload"]',
        ) as HTMLLinkElement;
        expect(preloadLink).not.toBeNull();
        expect(preloadLink.rel).toBe("preload");
        expect(preloadLink.href).toBe(checkout.src);
        expect(preloadLink.as).toBe("document");
      });

      it("removes the preload link when set to false", () => {
        const checkout = renderCheckout();

        checkout.preload = true;
        expect(checkout.shadowRoot!.querySelector('link[rel="preload"]')).not.toBeNull();

        checkout.preload = false;
        expect(checkout.shadowRoot!.querySelector('link[rel="preload"]')).toBeNull();
      });

      it("does not add a preload link when src is empty", () => {
        const checkout = renderCheckout();

        checkout.src = "";
        checkout.preload = true;

        expect(checkout.shadowRoot!.querySelector('link[rel="preload"]')).toBeNull();
      });

      it("updates the preload link when src changes", () => {
        const checkout = renderCheckout();

        checkout.preload = true;
        const newSrc = "https://example.com/checkout/456";
        checkout.src = newSrc;
        const preloadLink = checkout.shadowRoot!.querySelector(
          'link[rel="preload"]',
        ) as HTMLLinkElement;

        expect(preloadLink.href).toBe(newSrc);
      });
    });
  });

  describe("URL generation with auth", () => {
    it("includes auth parameter in popup URL when auth is set", () => {
      const checkout = renderCheckout();
      checkout.auth = "test-jwt-token";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0][0];
      const url = new URL(calledUrl!);

      expect(url.searchParams.get("embed")).toBe(
        `${EMBED_URL_PARAMS},authentication=test-jwt-token`,
      );
    });

    it("does not include auth parameter in popup URL when auth is empty", () => {
      const checkout = renderCheckout();
      checkout.auth = "";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0][0];
      const url = new URL(calledUrl!);

      expect(url.searchParams.get("embed")).toBe(EMBED_URL_PARAMS);
    });

    it("includes auth parameter in iframe src when target is inline and auth is set before creation", () => {
      const checkout = renderCheckout();
      checkout.auth = "test-jwt-token";
      checkout.setAttribute("target", "inline");

      const iframe = checkout.shadowRoot!.querySelector("#checkout-iframe") as HTMLIFrameElement;
      expect(iframe).not.toBeNull();

      const url = new URL(iframe.src);
      expect(url.searchParams.get("embed")).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto,authentication=test-jwt-token",
      );
    });

    it("automatically updates iframe src when auth changes", () => {
      const checkout = renderCheckout({ target: "inline" });

      // Initially no auth
      let iframe = checkout.shadowRoot!.querySelector("#checkout-iframe") as HTMLIFrameElement;
      let url = new URL(iframe.src);
      expect(url.searchParams.get("embed")).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto",
      );

      checkout.auth = "new-token";

      iframe = checkout.shadowRoot!.querySelector("#checkout-iframe") as HTMLIFrameElement;
      url = new URL(iframe.src);
      // Now it should include the auth parameter
      expect(url.searchParams.get("embed")).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto,authentication=new-token",
      );
    });

    it("preserves existing query parameters when adding embed parameter", () => {
      const originalSrc = "https://example.com/checkout?existing=param&another=value";
      const checkout = renderCheckout({ src: originalSrc });
      checkout.auth = "test-token";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0][0];
      const url = new URL(calledUrl!);

      expect(url.searchParams.get("existing")).toBe("param");
      expect(url.searchParams.get("another")).toBe("value");
      expect(url.searchParams.get("embed")).toBe(`${EMBED_URL_PARAMS},authentication=test-token`);
    });

    it("handles invalid src URL gracefully when auth is set", () => {
      const checkout = renderCheckout();
      checkout.src = "invalid-url";
      checkout.auth = "test-token";

      const windowOpenSpy = vi.spyOn(window, "open");
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "`<shopify-checkout>`: src property is empty or invalid, cannot open checkout",
      );
      expect(windowOpenSpy).not.toHaveBeenCalled();
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

            const expectedURL = new URL(checkout.src);
            expectedURL.searchParams.set("embed", EMBED_URL_PARAMS);
            expect(windowOpenSpy.mock.calls[0][0]).toBe(expectedURL.href);

            const call = windowOpenSpy.mock.calls[0];
            const features = call[2];
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

            vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element) => {
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

            const call = windowOpenSpy.mock.calls[0];
            const features = call[2];
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

            const call = windowOpenSpy.mock.calls[0];
            const features = call[2];
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

            const call = windowOpenSpy.mock.calls[0];
            const features = call[2];
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

            const call = windowOpenSpy.mock.calls[0];
            const features = call[2];
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

      describe('when target="inline"', () => {
        it("shows the checkout in an iframe", () => {
          const checkout = renderCheckout({ target: "inline" });

          const iframe = checkout.shadowRoot!.querySelector("iframe");
          expect(iframe).not.toBeNull();
          expect(iframe!.getAttribute("allow")).toBe(
            "publickey-credentials-get https://pay.shopify.com https://shop.app; geolocation",
          );

          const expectedURL = new URL(checkout.src);
          expectedURL.searchParams.set(
            "embed",
            "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto",
          );
          expect(iframe!.src).toBe(expectedURL.href);
        });

        it("sets the correct iframe security attributes", () => {
          const checkout = renderCheckout({ target: "inline" });

          const iframe = checkout.shadowRoot!.querySelector("iframe");
          expect(iframe).not.toBeNull();

          expect(iframe!.id).toBe("checkout-iframe");
          expect(iframe!.title).toBe("Checkout");

          expect(iframe!.getAttribute("allow")).toBe(
            "publickey-credentials-get https://pay.shopify.com https://shop.app; geolocation",
          );

          expect(iframe!.getAttribute("sandbox")).toBe(
            "allow-scripts allow-same-origin allow-forms allow-popups",
          );
        });
      });

      describe('when target="_blank", "auto", or undefined', () => {
        NEW_TAB_TARGETS.forEach((target) => {
          it("opens in a new window", () => {
            const checkout = renderCheckout({ target });
            const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

            checkout.open();

            const expectedURL = new URL(checkout.src);
            expectedURL.searchParams.set("embed", EMBED_URL_PARAMS);
            expect(windowOpenSpy).toHaveBeenCalledWith(expectedURL.href, target ?? "auto");
          });
        });
      });

      describe("when target is a non keyword string", () => {
        it("opens in a named window", () => {
          const checkout = renderCheckout({ target: "my-named-window" });
          const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

          checkout.open();

          const expectedURL = new URL(checkout.src);
          expectedURL.searchParams.set("embed", EMBED_URL_PARAMS);
          expect(windowOpenSpy).toHaveBeenCalledWith(expectedURL.href, "my-named-window");
        });
      });
    });

    describe("focus", () => {
      it("focuses the checkout window", () => {
        // Note: 'inline' target is excluded because the open() method returns early
        // for inline targets, so #checkoutWindow is never set and focus() has no effect
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
      describe('when target="inline"', () => {
        it("does not dispatch a close event", () => {
          const checkout = renderCheckout({ target: "inline" });
          const closeEventSpy = vi.fn();
          checkout.addEventListener("checkout:close", closeEventSpy);
          checkout.close();
          expect(closeEventSpy).not.toHaveBeenCalled();
        });
      });

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
    describe("checkout:start", () => {
      it("updates the locale and cart properties and dispatches a checkout:start event", async () => {
        const checkout = renderCheckout();
        const onCheckoutStartSpy = vi.fn();

        const listenForEvent = waitForEvent(checkout, "checkout:start", onCheckoutStartSpy);

        const testStartPayload: CheckoutProtocolMessageMap["checkout.start"] = {
          locale: "en-US",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [
              {
                id: "gid://shopify/CartLine/1",
                quantity: 2,
                merchandise: {
                  id: "gid://shopify/ProductVariant/1",
                  title: "Test Product",
                  product: {
                    id: "gid://shopify/Product/1",
                    title: "Test Product",
                  },
                  selectedOptions: [],
                },
                cost: {
                  amountPerQuantity: {
                    amount: "10.00",
                    currencyCode: "USD",
                  },
                  subtotalAmount: {
                    amount: "20.00",
                    currencyCode: "USD",
                  },
                  totalAmount: {
                    amount: "20.00",
                    currencyCode: "USD",
                  },
                },
                discountAllocations: [],
              },
            ],
            cost: {
              subtotalAmount: {
                amount: "20.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "20.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              email: "test@example.com",
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: { addresses: [] },
            payment: {
              methods: [],
            },
          },
        };

        simulateProtocolMessageEvent("checkout.start", testStartPayload);
        await listenForEvent;

        expect(checkout.locale).toBe(testStartPayload.locale);
        expect(checkout.cart).toBe(testStartPayload.cart);

        expect(onCheckoutStartSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:complete", () => {
      it("updates the orderConfirmation and cart properties and dispatches a checkout:complete event", async () => {
        const checkout = renderCheckout();
        const onCheckoutCompleteSpy = vi.fn();

        const listenForEvent = waitForEvent(checkout, "checkout:complete", onCheckoutCompleteSpy);

        const testCompletedPayload: CheckoutProtocolMessageMap["checkout.complete"] = {
          orderConfirmation: {
            url: "https://example.com/checkout/123",
            order: {
              id: "gid://shopify/Order/123456",
            },
            number: "TEST-001",
            isFirstOrder: false,
          },
          cart: {
            id: "gid://shopify/Cart/456",
            lines: [],
            cost: {
              subtotalAmount: { amount: "100.00", currencyCode: "USD" },
              totalAmount: { amount: "100.00", currencyCode: "USD" },
            },
            buyerIdentity: {},
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: { addresses: [] },
            payment: {
              methods: [],
            },
          },
        };

        simulateProtocolMessageEvent("checkout.complete", testCompletedPayload);
        await listenForEvent;

        expect(checkout.orderConfirmation).toBe(testCompletedPayload.orderConfirmation);
        expect(checkout.cart).toBe(testCompletedPayload.cart);
        expect(onCheckoutCompleteSpy).toHaveBeenCalledOnce();
      });

      it("updates the cart property when included in checkout:complete payload", async () => {
        const checkout = renderCheckout();
        const onCheckoutCompleteSpy = vi.fn();

        const listenForEvent = waitForEvent(checkout, "checkout:complete", onCheckoutCompleteSpy);

        const testCompletedPayload: CheckoutProtocolMessageMap["checkout.complete"] = {
          orderConfirmation: {
            url: "https://example.com/checkout/123",
            order: {
              id: "gid://shopify/Order/123456",
            },
            number: "TEST-001",
            isFirstOrder: false,
          },
          cart: {
            id: "gid://shopify/Cart/456",
            lines: [
              {
                id: "gid://shopify/CartLine/1",
                quantity: 1,
                merchandise: {
                  id: "gid://shopify/ProductVariant/1",
                  title: "Completed Product",
                  product: {
                    id: "gid://shopify/Product/1",
                    title: "Completed Product",
                  },
                  selectedOptions: [],
                },
                cost: {
                  amountPerQuantity: {
                    amount: "25.00",
                    currencyCode: "USD",
                  },
                  subtotalAmount: {
                    amount: "25.00",
                    currencyCode: "USD",
                  },
                  totalAmount: {
                    amount: "25.00",
                    currencyCode: "USD",
                  },
                },
                discountAllocations: [],
              },
            ],
            cost: {
              subtotalAmount: {
                amount: "25.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "25.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              email: "completed@example.com",
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.complete", testCompletedPayload);
        await listenForEvent;

        expect(checkout.orderConfirmation).toBe(testCompletedPayload.orderConfirmation);
        expect(checkout.cart).toBe(testCompletedPayload.cart);

        expect(onCheckoutCompleteSpy).toHaveBeenCalledOnce();
      });
    });

    describe("checkout:error", () => {
      it("updates the error property and dispatches a checkout:error event", async () => {
        const checkout = renderCheckout();
        const onCheckoutErrorSpy = vi.fn();

        const listenForEvent = waitForEvent(checkout, "checkout:error", onCheckoutErrorSpy);

        const testErrorPayload: CheckoutProtocolMessageMap["checkout.error"] = {
          code: "INVALID_CART",
          message: "The cart is invalid or has expired",
        };

        simulateProtocolMessageEvent("checkout.error", testErrorPayload);
        await listenForEvent;

        expect(checkout.error).toStrictEqual(testErrorPayload);

        expect(onCheckoutErrorSpy).toHaveBeenCalledOnce();
      });

      it("handles different error codes", async () => {
        const checkout = renderCheckout();

        const errorCodes = [
          "INVALID_PAYLOAD",
          "INVALID_SIGNATURE",
          "NOT_AUTHORIZED",
          "PAYLOAD_EXPIRED",
          "CUSTOMER_ACCOUNT_REQUIRED",
          "STOREFRONT_PASSWORD_REQUIRED",
          "CART_COMPLETED",
          "KILLSWITCH_ENABLED",
          "UNRECOVERABLE_FAILURE",
          "POLICY_VIOLATION",
          "PAYMENT_ERROR",
        ];

        for (const code of errorCodes) {
          const listenForEvent = waitForEvent(checkout, "checkout:error");

          const testErrorPayload: CheckoutProtocolMessageMap["checkout.error"] = {
            code: code as CheckoutProtocolMessageMap["checkout.error"]["code"],
            message: `Test error for ${code}`,
          };

          simulateProtocolMessageEvent("checkout.error", testErrorPayload);
          await listenForEvent;

          expect(checkout.error!.code).toBe(code);
        }
      });
    });

    describe("checkout:addressChangeStart", () => {
      it("dispatches event when target is inline", async () => {
        const checkout = renderCheckout({ target: "inline" });
        const onAddressChangeStartSpy = vi.fn();

        const listenForEvent = waitForEvent(
          checkout,
          "checkout:addressChangeStart",
          onAddressChangeStartSpy,
        );

        const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
          addressType: "shipping",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
          id: "test-request-id",
        });
        await listenForEvent;

        expect(onAddressChangeStartSpy).toHaveBeenCalledOnce();
      });

      it("does not dispatch event when target is popup", () => {
        const checkout = renderCheckout({ target: "popup" });
        const onAddressChangeStartSpy = vi.fn();

        checkout.addEventListener("checkout:addressChangeStart", onAddressChangeStartSpy);

        const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
          addressType: "shipping",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload);

        // Message handler is synchronous, so if it was going to fire, it already did
        expect(onAddressChangeStartSpy).not.toHaveBeenCalled();
      });

      it("does not dispatch event when target is auto", () => {
        const checkout = renderCheckout({ target: "auto" });
        const onAddressChangeStartSpy = vi.fn();

        checkout.addEventListener("checkout:addressChangeStart", onAddressChangeStartSpy);

        const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
          addressType: "shipping",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload);

        // Message handler is synchronous, so if it was going to fire, it already did
        expect(onAddressChangeStartSpy).not.toHaveBeenCalled();
      });

      describe("respondWith", () => {
        let mockSourceWindow: Window;

        beforeEach(() => {
          vi.useFakeTimers();
          mockSourceWindow = createMockWindow();
        });

        afterEach(() => {
          vi.useRealTimers();
        });

        it("sends a JSON-RPC 2.0 response when the promise resolves", async () => {
          const checkout = renderCheckout({ target: "inline" });

          const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
            addressType: "shipping",
            cart: {
              id: "gid://shopify/Cart/123",
              lines: [],
              cost: {
                subtotalAmount: { amount: "0.00", currencyCode: "USD" },
                totalAmount: { amount: "0.00", currencyCode: "USD" },
              },
              buyerIdentity: { countryCode: "US" },
              deliveryGroups: [],
              discountCodes: [],
              appliedGiftCards: [],
              discountAllocations: [],
              delivery: { addresses: [] },
              payment: { methods: [] },
            },
          };

          const responsePayload: CheckoutAddressChangeStartResponsePayload = {
            cart: testPayload.cart,
          };

          const listenForEvent = waitForEvent(
            checkout,
            "checkout:addressChangeStart",
            (event: Event) => {
              (event as unknown as CheckoutAddressChangeStartEvent).respondWith(
                Promise.resolve(responsePayload),
              );
            },
          );

          simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
            id: "test-request-id-123",
            source: mockSourceWindow,
          });

          await listenForEvent;
          // Flush promise microtasks
          await vi.runAllTimersAsync();

          expect(mockSourceWindow.postMessage).toHaveBeenCalledWith(
            {
              jsonrpc: "2.0",
              id: "test-request-id-123",
              result: responsePayload,
            },
            window.origin ?? "",
          );
        });

        it("throws CheckoutRespondWithError when respondWith is called twice", async () => {
          const checkout = renderCheckout({ target: "inline" });

          const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
            addressType: "shipping",
            cart: {
              id: "gid://shopify/Cart/123",
              lines: [],
              cost: {
                subtotalAmount: { amount: "0.00", currencyCode: "USD" },
                totalAmount: { amount: "0.00", currencyCode: "USD" },
              },
              buyerIdentity: { countryCode: "US" },
              deliveryGroups: [],
              discountCodes: [],
              appliedGiftCards: [],
              discountAllocations: [],
              delivery: { addresses: [] },
              payment: { methods: [] },
            },
          };

          let caughtError: Error | undefined;

          const listenForEvent = waitForEvent(
            checkout,
            "checkout:addressChangeStart",
            (event: Event) => {
              const addressEvent = event as unknown as CheckoutAddressChangeStartEvent;
              addressEvent.respondWith(Promise.resolve({}));
              try {
                addressEvent.respondWith(Promise.resolve({}));
              } catch (error) {
                caughtError = error as Error;
              }
            },
          );

          simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
            id: "test-request-id-123",
            source: mockSourceWindow,
          });

          await listenForEvent;

          expect(caughtError).toBeDefined();
          expect(caughtError!.name).toBe("CheckoutRespondWithError");
          expect(caughtError!.message).toContain("respondWith() has already been called");
        });

        it("does not dispatch event when no message ID is available (notification)", async () => {
          const checkout = renderCheckout({ target: "inline" });
          const onAddressChangeStartSpy = vi.fn();

          checkout.addEventListener("checkout:addressChangeStart", onAddressChangeStartSpy);

          const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
            addressType: "shipping",
            cart: {
              id: "gid://shopify/Cart/123",
              lines: [],
              cost: {
                subtotalAmount: { amount: "0.00", currencyCode: "USD" },
                totalAmount: { amount: "0.00", currencyCode: "USD" },
              },
              buyerIdentity: { countryCode: "US" },
              deliveryGroups: [],
              discountCodes: [],
              appliedGiftCards: [],
              discountAllocations: [],
              delivery: { addresses: [] },
              payment: { methods: [] },
            },
          };

          // Simulate message WITHOUT an id (notification, not request)
          simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
            source: mockSourceWindow,
          });

          // Event should not be dispatched for notifications
          expect(onAddressChangeStartSpy).not.toHaveBeenCalled();
        });

        it("throws CheckoutRespondWithError when no source window is available", async () => {
          const checkout = renderCheckout({ target: "inline" });

          const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
            addressType: "shipping",
            cart: {
              id: "gid://shopify/Cart/123",
              lines: [],
              cost: {
                subtotalAmount: { amount: "0.00", currencyCode: "USD" },
                totalAmount: { amount: "0.00", currencyCode: "USD" },
              },
              buyerIdentity: { countryCode: "US" },
              deliveryGroups: [],
              discountCodes: [],
              appliedGiftCards: [],
              discountAllocations: [],
              delivery: { addresses: [] },
              payment: { methods: [] },
            },
          };

          let caughtError: Error | undefined;

          const listenForEvent = waitForEvent(
            checkout,
            "checkout:addressChangeStart",
            (event: Event) => {
              try {
                (event as unknown as CheckoutAddressChangeStartEvent).respondWith(
                  Promise.resolve({}),
                );
              } catch (error) {
                caughtError = error as Error;
              }
            },
          );

          // Simulate message WITH an id but WITHOUT a source
          simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
            id: "test-request-id-123",
            source: null,
          });

          await listenForEvent;

          expect(caughtError).toBeDefined();
          expect(caughtError!.name).toBe("CheckoutRespondWithError");
          expect(caughtError!.message).toContain("no source window available");
        });

        it("allows responding to subsequent events after not responding to the first", async () => {
          const checkout = renderCheckout({ target: "inline" });
          let eventCount = 0;

          const testPayload: CheckoutProtocolMessageMap["checkout.addressChangeStart"] = {
            addressType: "shipping",
            cart: {
              id: "gid://shopify/Cart/123",
              lines: [],
              cost: {
                subtotalAmount: { amount: "0.00", currencyCode: "USD" },
                totalAmount: { amount: "0.00", currencyCode: "USD" },
              },
              buyerIdentity: { countryCode: "US" },
              deliveryGroups: [],
              discountCodes: [],
              appliedGiftCards: [],
              discountAllocations: [],
              delivery: { addresses: [] },
              payment: { methods: [] },
            },
          };

          checkout.addEventListener("checkout:addressChangeStart", (event: Event) => {
            eventCount++;
            // Only respond to the second event
            if (eventCount === 2) {
              (event as unknown as CheckoutAddressChangeStartEvent).respondWith(
                Promise.resolve({}),
              );
            }
          });

          // First event - don't respond
          simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
            id: "first-request-id",
            source: mockSourceWindow,
          });

          // Flush pending timers for first message processing
          await vi.runAllTimersAsync();

          // Second event - do respond
          simulateProtocolMessageEvent("checkout.addressChangeStart", testPayload, {
            id: "second-request-id",
            source: mockSourceWindow,
          });

          // Flush pending timers for promise resolution
          await vi.runAllTimersAsync();

          expect(eventCount).toBe(2);
          expect(mockSourceWindow.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              jsonrpc: "2.0",
              id: "second-request-id",
            }),
            window.origin ?? "",
          );
        });
      });
    });

    describe("checkout:paymentMethodChangeStart", () => {
      it("can dispatch event when target is inline (placeholder for future implementation)", async () => {
        const checkout = renderCheckout({ target: "inline" });
        const onPaymentMethodChangeStartSpy = vi.fn();

        const listenForEvent = waitForEvent(
          checkout,
          "checkout:paymentMethodChangeStart",
          onPaymentMethodChangeStartSpy,
        );

        const testPayload: CheckoutProtocolMessageMap["checkout.paymentMethodChangeStart"] = {
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.paymentMethodChangeStart", testPayload, {
          id: "test-request-id",
        });
        await listenForEvent;

        expect(onPaymentMethodChangeStartSpy).toHaveBeenCalledOnce();
      });

      it("does not dispatch event when target is popup", () => {
        const checkout = renderCheckout({ target: "popup" });
        const onPaymentMethodChangeStartSpy = vi.fn();

        checkout.addEventListener(
          "checkout:paymentMethodChangeStart",
          onPaymentMethodChangeStartSpy,
        );

        const testPayload: CheckoutProtocolMessageMap["checkout.paymentMethodChangeStart"] = {
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.paymentMethodChangeStart", testPayload);

        expect(onPaymentMethodChangeStartSpy).not.toHaveBeenCalled();
      });
    });

    describe("checkout:submitStart", () => {
      it("dispatches event and updates sessionId on the element when target is inline", async () => {
        const checkout = renderCheckout({ target: "inline" });

        expect(checkout.sessionId).toBeUndefined();

        const listenForEvent = waitForEvent(checkout, "checkout:submitStart");

        const testPayload: CheckoutProtocolMessageMap["checkout.submitStart"] = {
          sessionId: "element-session-id-789",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.submitStart", testPayload, {
          id: "test-request-id",
        });
        await listenForEvent;

        expect(checkout.sessionId).toBe("element-session-id-789");
      });

      it("does not dispatch event when target is popup", () => {
        const checkout = renderCheckout({ target: "popup" });
        const onSubmitStartSpy = vi.fn();

        checkout.addEventListener("checkout:submitStart", onSubmitStartSpy);

        const testPayload: CheckoutProtocolMessageMap["checkout.submitStart"] = {
          sessionId: "test-session-id",
          cart: {
            id: "gid://shopify/Cart/123",
            lines: [],
            cost: {
              subtotalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
              totalAmount: {
                amount: "0.00",
                currencyCode: "USD",
              },
            },
            buyerIdentity: {
              countryCode: "US",
            },
            deliveryGroups: [],
            discountCodes: [],
            appliedGiftCards: [],
            discountAllocations: [],
            delivery: {
              addresses: [],
            },
            payment: { methods: [] },
          },
        };

        simulateProtocolMessageEvent("checkout.submitStart", testPayload);

        expect(onSubmitStartSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("platform=web parameter in embed URL", () => {
    it("includes platform=web in popup URLs", () => {
      const checkout = renderCheckout({ target: "popup" });
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toContain("platform=web");
      expect(embedParam).toBe(EMBED_URL_PARAMS);
    });

    it("includes platform=web in new tab URLs", () => {
      const checkout = renderCheckout({ target: "auto" });
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toContain("platform=web");
      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=auto",
      );
    });

    it("includes platform=web in inline iframe URLs", () => {
      const checkout = renderCheckout({ target: "inline" });

      const iframe = checkout.shadowRoot!.querySelector("#checkout-iframe") as HTMLIFrameElement;
      const url = new URL(iframe.src);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toContain("platform=web");
      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto",
      );
    });

    it("includes platform=web when auth token is also present", () => {
      const checkout = renderCheckout({ target: "popup" });
      checkout.auth = "test-token";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toContain("platform=web");
      expect(embedParam).toContain("authentication=test-token");
      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=auto,authentication=test-token",
      );
    });

    it("includes platform=web in preload link href", () => {
      const checkout = renderCheckout();
      checkout.preload = true;

      const preloadLink = checkout.shadowRoot!.querySelector(
        'link[rel="preload"]',
      ) as HTMLLinkElement;

      expect(preloadLink.href).toBe(checkout.src);
    });
  });

  describe("colorScheme parameter in embed URL", () => {
    it("includes colorScheme in popup URLs", () => {
      const checkout = renderCheckout({ target: "popup" });
      checkout.colorScheme = "dark";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=dark",
      );
    });

    it("includes colorScheme in new tab URLs", () => {
      const checkout = renderCheckout({ target: "auto" });
      checkout.colorScheme = "light";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=light",
      );
    });

    it("includes colorScheme in inline iframe URLs", () => {
      const checkout = renderCheckout({
        target: "inline",
        "color-scheme": "dark",
      });

      const iframe = checkout.shadowRoot!.querySelector("#checkout-iframe") as HTMLIFrameElement;
      const url = new URL(iframe.src);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=dark",
      );
    });

    it("includes colorScheme when auth token is also present", () => {
      const checkout = renderCheckout({ target: "popup" });
      checkout.auth = "test-token";
      checkout.colorScheme = "dark";

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=dark,authentication=test-token",
      );
    });

    it("includes colorScheme=auto by default when not explicitly set", () => {
      const checkout = renderCheckout({ target: "popup" });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=auto",
      );
    });

    it('defaults colorScheme property to "auto" when color-scheme attribute is undefined', () => {
      const checkout = renderCheckout();

      expect(checkout.colorScheme).toBe("auto");
      expect(checkout.getAttribute("color-scheme")).toBeNull();

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toContain("colorscheme=auto");
    });
  });

  describe("branding", () => {
    it("includes branding=shop by default", () => {
      const checkout = renderCheckout();
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const calledUrl = windowOpenSpy.mock.calls[0]![0];
      const url = new URL(calledUrl!);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(EMBED_URL_PARAMS);
    });

    it("includes branding=app when target is inline", () => {
      const checkout = renderCheckout({ target: "inline" });

      const iframe = checkout.shadowRoot!.querySelector("#checkout-iframe") as HTMLIFrameElement;
      expect(iframe).not.toBeNull();

      const url = new URL(iframe.src);
      const embedParam = url.searchParams.get("embed");

      expect(embedParam).toBe(
        "protocol=2025-10,library=checkout-web-component,platform=web,branding=app,colorscheme=auto",
      );
    });
  });

  describe("it removes event listeners when the component is disconnected", () => {
    it.todo("should remove event listeners");
  });

  describe("it cleans up listeners when the popup is closed", () => {
    it.todo("should clean up listeners");
  });
});

// Test utilities
function simulateProtocolMessageEvent<Message extends keyof CheckoutProtocolMessageMap>(
  name: Message,
  body: CheckoutProtocolMessageMap[Message],
  options?: { id?: string; source?: MessageEventSource | null },
) {
  const event = new MessageEvent("message", {
    data: {
      jsonrpc: "2.0",
      method: name,
      params: body,
      ...(options?.id && { id: options.id }),
    },
    origin: window.origin ?? "",
    source: options?.source ?? null,
  });
  window.dispatchEvent(event);
}

function waitForEvent(element: HTMLElement, eventName: string, spyFn?: (...args: any[]) => any) {
  return new Promise<void>((resolve) => {
    const handler = (...args: any[]) => {
      spyFn?.(...args);
      element.removeEventListener(eventName, handler);
      resolve();
    };
    element.addEventListener(eventName, handler);
  });
}

function renderCheckout(attributes: Record<string, string | undefined> = {}): ShopifyCheckout {
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
  Object.defineProperty(window, "outerHeight", { value: height, writable: true });
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
