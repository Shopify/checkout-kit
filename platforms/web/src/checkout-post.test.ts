import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openCheckoutWindow } from "./checkout-window";

describe("internal POST form navigation", () => {
  const src = "https://checkout.example.com/start?keep=1";
  const features = "popup,width=600,height=600";
  let target: string;
  let body: URLSearchParams;
  let popup: Window;

  function open() {
    return openCheckoutWindow(src, target, { features, body });
  }

  beforeEach(() => {
    popup = {
      close: vi.fn(),
      closed: false,
      focus: vi.fn(),
      postMessage: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);
    vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});

    target = "";
    body = new URLSearchParams([
      ["context", "example+/=&<>"],
      ["item", "one"],
      ["item", "two"],
    ]);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("POSTs form values and repeated fields into the opened popup", () => {
    vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(
      function (this: HTMLFormElement) {
        expect(window.open).toHaveBeenCalledExactlyOnceWith(
          "about:blank",
          this.target,
          expect.stringContaining("width="),
        );
        expect(this.isConnected).toBe(true);
        expect(this.hidden).toBe(true);
        expect(this.method).toBe("post");
        expect(this.enctype).toBe("application/x-www-form-urlencoded");
        expect(this.acceptCharset).toBe("UTF-8");
        expect(Array.from(new FormData(this).entries())).toEqual([
          ["context", "example+/=&<>"],
          ["item", "one"],
          ["item", "two"],
        ]);

        const url = new URL(this.action);
        expect(url.origin).toBe("https://checkout.example.com");
        expect(url.searchParams.get("keep")).toBe("1");
        expect(url.searchParams.has("context")).toBe(false);
        expect(url.searchParams.has("item")).toBe(false);
      },
    );

    open();

    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
    expect(document.querySelector("form")).toBeNull();
  });

  it.each(["auto", "_blank", "", "_self", "_PARENT", "_top", "_unfencedTop"])(
    "uses a named destination for target=%s",
    (value) => {
      target = value;
      vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(
        function (this: HTMLFormElement) {
          expect(this.target).toMatch(/^checkout-/);
          expect(vi.mocked(window.open).mock.calls[0]?.slice(0, 2)).toEqual([
            "about:blank",
            this.target,
          ]);
        },
      );

      open();

      expect(window.open).toHaveBeenCalledOnce();
      expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
    },
  );

  it("preserves an explicit named window target", () => {
    target = "merchant-checkout";
    vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(
      function (this: HTMLFormElement) {
        expect(this.target).toBe("merchant-checkout");
      },
    );

    open();

    expect(window.open).toHaveBeenCalledExactlyOnceWith(
      "about:blank",
      "merchant-checkout",
      features,
    );
    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
  });

  it("returns null without submitting when the popup is blocked", () => {
    vi.mocked(window.open).mockReturnValue(null);

    expect(open()).toBeNull();

    expect(window.open).toHaveBeenCalledOnce();
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
    expect(document.querySelector("form")).toBeNull();
  });

  it("removes the form and closes the blank popup if submission throws", () => {
    vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(() => {
      throw new Error("Submission failed");
    });

    expect(() => open()).toThrow("Submission failed");

    expect(popup.close).toHaveBeenCalledOnce();
    expect(document.querySelector("form")).toBeNull();
  });

  it("returns the opened window for protocol communication, focus, and close", () => {
    expect(open()).toBe(popup);
  });

  it("uses GET when no body is supplied", () => {
    const result = openCheckoutWindow(src, "", { features });

    expect(result).toBe(popup);
    expect(window.open).toHaveBeenCalledExactlyOnceWith(src, "", features);
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
  });

  it("preserves GET navigation without popup features", () => {
    openCheckoutWindow(src, "auto");

    expect(window.open).toHaveBeenCalledExactlyOnceWith(src, "auto");
    expect(HTMLFormElement.prototype.submit).not.toHaveBeenCalled();
  });

  it("opens POST navigation without popup features", () => {
    openCheckoutWindow(src, "_blank", { body });

    expect(window.open).toHaveBeenCalledExactlyOnceWith(
      "about:blank",
      expect.stringMatching(/^checkout-/),
    );
    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
  });

  it("allows an empty POST body", () => {
    body = new URLSearchParams();
    vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(
      function (this: HTMLFormElement) {
        expect(Array.from(new FormData(this).entries())).toEqual([]);
      },
    );

    open();

    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
  });

  it("supports field names that overlap with form properties", () => {
    body = new URLSearchParams({
      submit: "submit-value",
      append: "append-value",
      remove: "remove-value",
      action: "action-value",
    });
    vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(
      function (this: HTMLFormElement) {
        expect(Array.from(new FormData(this).entries())).toEqual([
          ["submit", "submit-value"],
          ["append", "append-value"],
          ["remove", "remove-value"],
          ["action", "action-value"],
        ]);
      },
    );

    open();

    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
    expect(document.querySelector("form")).toBeNull();
  });

  it("rejects empty field names before opening a window", () => {
    body = new URLSearchParams([["", "value"]]);

    expect(() => open()).toThrow("POST form fields must have a name");
    expect(window.open).not.toHaveBeenCalled();
  });

  it("preserves Unicode and a supplied _charset_ field", () => {
    body = new URLSearchParams({ message: "café ☕", _charset_: "custom" });
    vi.mocked(HTMLFormElement.prototype.submit).mockImplementation(
      function (this: HTMLFormElement) {
        expect(Array.from(new FormData(this).entries())).toEqual([
          ["message", "café ☕"],
          ["_charset_", "custom"],
        ]);
      },
    );

    open();

    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce();
  });
});
