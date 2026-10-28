import { afterEach, describe, expect, it, vi } from "vitest";
import "./register";
import { ShopifyUniversalCheckoutCloseEvent } from "./shopify-universal-checkout";
import {
  ShopifyUniversalCheckoutStartEvent,
  ShopifyUniversalCheckoutUpdateEvent,
  ShopifyUniversalCheckoutCompleteEvent,
} from "./session";

describe("universal presentation conventions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });
  it("keeps lifecycle events on the component", () => {
    const parent = document.createElement("div");
    const element = document.createElement("shopify-universal-checkout");
    parent.append(element);
    const listener = vi.fn();
    for (const name of ["start", "update", "complete", "close"])
      parent.addEventListener(name, listener);
    element.dispatchEvent(new ShopifyUniversalCheckoutStartEvent([]));
    element.dispatchEvent(new ShopifyUniversalCheckoutUpdateEvent([]));
    element.dispatchEvent(new ShopifyUniversalCheckoutCompleteEvent([]));
    element.dispatchEvent(new ShopifyUniversalCheckoutCloseEvent());
    expect(listener).not.toHaveBeenCalled();
  });
  it("reports unsupported browsers before opening a window", () => {
    const element = document.createElement("shopify-universal-checkout");
    element.src = "https://shop.example.com/checkouts/uc/test";
    const open = vi.spyOn(window, "open");
    vi.stubGlobal("HTMLDialogElement", undefined);
    const error = vi.fn();
    element.addEventListener("error", error);
    element.open();
    expect(open).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0]![0].detail).toEqual([
      { error: { code: "unsupported_browser", message: expect.any(String) } },
    ]);
  });
});
