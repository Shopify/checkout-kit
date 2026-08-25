import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbeddedCheckoutProtocol } from "@shopify/checkout-kit-protocol";

import { version } from "../package.json";

import "./checkout-web-component";
import { CK_VERSION } from "./checkout";

const EMBED_PROTOCOL_VERSION = EmbeddedCheckoutProtocol.specVersion;

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

  describe("attributes", () => {
    describe("src", () => {
      it("changing the src attribute reflects to the src property", () => {
        const checkout = renderCheckout();
        const newSrc = "https://example.com/checkout/456";
        checkout.setAttribute("src", newSrc);

        expect(checkout.src).toBe(newSrc);
      });
    });

    describe("appearance", () => {
      it("changing the appearance attribute reflects to the appearance property", () => {
        const checkout = renderCheckout();
        checkout.setAttribute("appearance", "app:dark");

        expect(checkout.appearance).toBe("app:dark");
      });

      it("defaults to storefront when the appearance attribute is unset", () => {
        const checkout = renderCheckout();

        expect(checkout.appearance).toBe("storefront");
      });
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

    describe("appearance", () => {
      it("changing the appearance property reflects to the appearance attribute", () => {
        const checkout = renderCheckout();
        checkout.appearance = "app:light";

        expect(checkout.getAttribute("appearance")).toBe("app:light");
      });

      it("removes the appearance attribute when assigned undefined", () => {
        const checkout = renderCheckout({ appearance: "app:dark" });

        checkout.appearance = undefined;

        expect(checkout.hasAttribute("appearance")).toBe(false);
        expect(checkout.appearance).toBe("storefront");
      });
    });

    describe("logLevel", () => {
      it("defaults to 'error' when the attribute is absent", () => {
        const checkout = renderCheckout();
        expect(checkout.hasAttribute("log-level")).toBe(false);
        expect(checkout.logLevel).toBe("error");
      });

      it("reflects the log-level attribute to the property", () => {
        const checkout = renderCheckout({ "log-level": "error" });
        expect(checkout.logLevel).toBe("error");
      });

      it("sets the log-level attribute when assigned", () => {
        const checkout = renderCheckout();
        checkout.logLevel = "debug";
        expect(checkout.getAttribute("log-level")).toBe("debug");
      });

      it("falls back to 'error' when the attribute holds an invalid value", () => {
        const checkout = renderCheckout({ "log-level": "verbose" });
        expect(checkout.logLevel).toBe("error");
      });

      it("removes the log-level attribute when assigned undefined", () => {
        const checkout = renderCheckout({ "log-level": "warn" });
        expect(checkout.hasAttribute("log-level")).toBe(true);
        checkout.logLevel = undefined;
        expect(checkout.hasAttribute("log-level")).toBe(false);
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

    it.each([
      ["app:light", "light", "app"],
      ["app:dark", "dark", "app"],
      ["app:automatic", "automatic", "app"],
      ["storefront", "web_default", "shop"],
    ] as const)(
      "sets checkout params for appearance=%s and replaces incoming appearance params",
      (appearance, colorScheme, branding) => {
        const checkout = renderCheckout({
          src: "https://example.com/checkout?ec_color_scheme=light&ck_branding=app&keep=1",
          appearance,
        });

        const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

        checkout.open();

        const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
        expect(url.searchParams.getAll("ec_color_scheme")).toEqual([colorScheme]);
        expect(url.searchParams.getAll("ck_branding")).toEqual([branding]);
        expect(url.searchParams.get("keep")).toBe("1");
        expect(url.searchParams.get("ec_version")).toBe(EMBED_PROTOCOL_VERSION);
      },
    );

    it("sets storefront appearance query params when appearance is unset", () => {
      const checkout = renderCheckout({
        src: "https://example.com/checkout?ec_color_scheme=dark&ck_branding=shop&keep=1",
      });

      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.get("ec_color_scheme")).toBe("web_default");
      expect(url.searchParams.get("ck_branding")).toBe("shop");
      expect(url.searchParams.get("keep")).toBe("1");
    });

    it("omits invalid appearance values and does not warn when log-level is error", () => {
      const checkout = renderCheckout({
        src: "https://example.com/checkout?ec_color_scheme=dark&ck_branding=shop&keep=1",
        appearance: "sepia",
        "log-level": "error",
      });
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.get("ec_color_scheme")).toBeNull();
      expect(url.searchParams.get("ck_branding")).toBeNull();
      expect(url.searchParams.get("keep")).toBe("1");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("omits invalid appearance values and warns when log-level is warn", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const checkout = renderCheckout({
        src: "https://example.com/checkout?ec_color_scheme=dark&ck_branding=shop&keep=1",
        appearance: "sepia",
        "log-level": "warn",
      });
      const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(createMockWindow());

      checkout.open();

      const url = new URL(expectWindowOpenArgs(windowOpenSpy)[0] as string);
      expect(url.searchParams.get("ec_color_scheme")).toBeNull();
      expect(url.searchParams.get("ck_branding")).toBeNull();
      expect(url.searchParams.get("keep")).toBe("1");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('appearance="sepia" is not supported and will be ignored'),
      );
    });

    it("handles invalid src URL gracefully", () => {
      const checkout = renderCheckout({ "log-level": "warn" });
      checkout.src = "invalid-url";

      const windowOpenSpy = vi.spyOn(window, "open");
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      checkout.open();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "<shopify-checkout>: src property is empty or invalid, cannot open checkout",
      );
      expect(windowOpenSpy).not.toHaveBeenCalled();
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

    it("uses the package version", () => {
      expect(CK_VERSION).toBe(version);
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

  describe("overlay focus control", () => {
    it("is a button without navigation attributes", () => {
      const checkout = renderCheckout();
      const button = checkout.shadowRoot!.querySelector<HTMLButtonElement>("#overlay-link");
      expect(button!.type).toBe("button");
      expect(button!.hasAttribute("href")).toBe(false);
      expect(button!.hasAttribute("target")).toBe(false);
    });
  });

  describe("lifecycle", () => {
    it("replaces the protocol message listener on reconnect and aborts it on disconnect", () => {
      const addEventListener = vi.spyOn(window, "addEventListener");
      const checkout = renderCheckout();
      const firstOptions = addEventListener.mock.calls.find(
        ([type]) => type === "message",
      )?.[2] as AddEventListenerOptions;

      checkout.connectedCallback();
      const messageListenerOptions = addEventListener.mock.calls.filter(
        ([type]) => type === "message",
      );
      const secondOptions = messageListenerOptions[1]?.[2] as AddEventListenerOptions;

      expect(firstOptions.signal?.aborted).toBe(true);
      expect(secondOptions.signal?.aborted).toBe(false);

      checkout.disconnectedCallback();

      expect(secondOptions.signal?.aborted).toBe(true);
    });

    it("preserves the shadow tree across element moves", () => {
      const checkout = renderCheckout();
      const wrapper = checkout.shadowRoot!.querySelector("#shopify-element-wrapper");

      const newParent = document.createElement("div");
      document.body.appendChild(newParent);
      newParent.appendChild(checkout);

      expect(checkout.shadowRoot!.querySelector("#shopify-element-wrapper")).toBe(wrapper);
      expect(checkout.shadowRoot!.querySelector("iframe")).toBeNull();
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

function createMockWindow() {
  return {
    addEventListener: vi.fn(),
    close: vi.fn(),
    closed: false,
    focus: vi.fn(),
    postMessage: vi.fn(),
  } as unknown as Window;
}
