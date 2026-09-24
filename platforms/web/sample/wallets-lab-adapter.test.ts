import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WalletAdapterRequest } from "../src/wallets-adapter";
import {
  WalletLabAdapter,
  type WalletLabEvent,
  type WalletLabSettings,
} from "./wallets-lab-adapter";

function request(overrides: Partial<WalletAdapterRequest> = {}): WalletAdapterRequest {
  return {
    purchase: {
      storeDomain: "fixture.myshopify.com",
      country: "CA",
      locale: "en-CA",
      currency: "CAD",
      variantId: "gid://shopify/ProductVariant/1",
    },
    walletCount: 0,
    layout: "horizontal",
    getCart: vi.fn().mockResolvedValue("private-cart-reference"),
    mount: document.createElement("div"),
    signal: new AbortController().signal,
    ...overrides,
  };
}

describe("WalletLabAdapter", () => {
  let settings: WalletLabSettings;
  let events: WalletLabEvent[];

  beforeEach(() => {
    settings = { scenario: "ready", delayMs: 0 };
    events = [];
  });

  function adapter() {
    return new WalletLabAdapter(
      () => settings,
      (event) => events.push(event),
    );
  }

  it("renders deterministic wallets into the private mount", async () => {
    const input = request({ walletCount: 2 });

    await expect(adapter().start(input)).resolves.toEqual({
      status: "ready",
      wallets: ["shop_pay", "apple_pay"],
      failed: [],
    });
    expect(input.mount.querySelectorAll("button")).toHaveLength(2);
    expect(input.mount.textContent).toContain("Shop Pay");
    expect(input.mount.textContent).toContain("Apple Pay");
  });

  it("invokes getCart only after a product wallet is activated", async () => {
    const getCart = vi.fn().mockResolvedValue("private-cart-reference");
    const input = request({ getCart });

    await adapter().start(input);
    input.mount.querySelector<HTMLButtonElement>("button")?.click();
    await vi.waitFor(() => expect(getCart).toHaveBeenCalledOnce());

    expect(getCart).toHaveBeenCalledWith({
      purchase: input.purchase,
      wallet: "shop_pay",
      signal: input.signal,
    });
    expect(JSON.stringify(events)).not.toContain("private-cart-reference");
  });

  it("holds the loading scenario until the developer releases it", async () => {
    settings.scenario = "slow-ready";
    const instance = adapter();
    let settled = false;
    const outcome = instance.start(request()).then((value) => {
      settled = true;
      return value;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    instance.release();

    await expect(outcome).resolves.toMatchObject({ status: "ready" });
  });

  it("reports partial provider outcomes", async () => {
    settings.scenario = "partial";

    await expect(adapter().start(request())).resolves.toEqual({
      status: "ready",
      wallets: ["shop_pay", "apple_pay"],
      failed: ["paypal"],
    });
  });

  it("keeps opaque cart references out of fixture events", async () => {
    const input = request({
      purchase: {
        storeDomain: "fixture.myshopify.com",
        country: "CA",
        locale: "en-CA",
        currency: "CAD",
        cartId: "private-cart-reference",
      },
      getCart: undefined,
    });
    const instance = adapter();

    await instance.start(input);
    await instance.cartUpdated();

    expect(JSON.stringify(events)).not.toContain("private-cart-reference");
    expect(events).toContainEqual({ source: "adapter", name: "cartUpdated:complete" });
  });

  it("surfaces deterministic setup and cart refresh failures", async () => {
    const instance = adapter();
    settings.scenario = "setup-error";
    await expect(instance.start(request())).rejects.toThrow("Fixture setup failure");

    settings.scenario = "ready";
    await instance.start(request());
    settings.scenario = "cart-refresh-error";
    await expect(instance.cartUpdated()).rejects.toThrow("Fixture cart refresh failure");
  });
});
