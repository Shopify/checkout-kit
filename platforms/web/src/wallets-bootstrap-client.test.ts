import { describe, expect, it, vi } from "vitest";

import {
  createWalletBootstrapClient,
  WalletBootstrapError,
  type WalletBootstrapTransport,
  type WalletBootstrapTransportRequest,
} from "./wallets-bootstrap-client";
import type { WalletPurchaseSnapshot } from "./wallets.types";

function walletConfig(name = "shop_pay"): Record<string, unknown> {
  return {
    name,
    supports_subs: true,
    supports_def_opts: false,
    wallet_params: { channel: "headless" },
  };
}

function validResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    shopId: "gid://shopify/Shop/1",
    presentmentCurrency: "USD",
    walletConfigs: [walletConfig()],
    recommendedWallet: walletConfig(),
    fallbackWallet: null,
    flags: ["flag-a"],
    variantConfigs: [{ id: "gid://shopify/ProductVariant/1", requiresShipping: true }],
    purchaseContext: { requiresShipping: true, hasSellingPlan: false },
    ...overrides,
  };
}

function cartPurchase(overrides: Partial<WalletPurchaseSnapshot> = {}): WalletPurchaseSnapshot {
  return {
    storeDomain: "example.myshopify.com",
    country: "US",
    locale: "en",
    currency: "USD",
    cartId: "gid://shopify/Cart/opaque?key=private",
    ...overrides,
  };
}

function productPurchase(overrides: Partial<WalletPurchaseSnapshot> = {}): WalletPurchaseSnapshot {
  return {
    storeDomain: "example.myshopify.com",
    country: "CA",
    locale: "fr-CA",
    currency: "CAD",
    variantId: "gid://shopify/ProductVariant/1",
    ...overrides,
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe("createWalletBootstrapClient", () => {
  it("passes an opaque cart reference to the private transport", async () => {
    const transport = vi.fn().mockResolvedValue(
      validResponse({
        purchaseContext: undefined,
      }),
    );
    const client = createWalletBootstrapClient(transport);
    const signal = new AbortController().signal;

    await client.load({ purchase: cartPurchase(), signal });

    expect(transport).toHaveBeenCalledExactlyOnceWith({
      storeDomain: "example.myshopify.com",
      country: "US",
      locale: "en",
      currency: "USD",
      purchase: {
        type: "cart",
        cartReference: "gid://shopify/Cart/opaque?key=private",
      },
      signal: expect.any(AbortSignal),
    });
    const transportRequest = transport.mock.calls[0]![0] as WalletBootstrapTransportRequest;
    expect(transportRequest.signal).not.toBe(signal);
  });

  it("passes product selection to the private transport", async () => {
    const transport = vi.fn().mockResolvedValue(validResponse());
    const client = createWalletBootstrapClient(transport);

    await client.load({
      purchase: productPurchase({
        sellingPlanId: "gid://shopify/SellingPlan/2",
      }),
      signal: new AbortController().signal,
    });

    expect(transport.mock.calls[0]![0]).toMatchObject({
      purchase: {
        type: "product",
        variantId: "gid://shopify/ProductVariant/1",
        sellingPlanId: "gid://shopify/SellingPlan/2",
      },
    });
  });

  it("keeps authorization outside the request and result contracts", async () => {
    const privateCredential = "private credential";
    const transport: WalletBootstrapTransport = async (request) => {
      expect(JSON.stringify(request)).not.toContain(privateCredential);
      return validResponse();
    };
    const client = createWalletBootstrapClient(transport);

    const result = await client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });

    expect(JSON.stringify(result)).not.toContain(privateCredential);
  });

  it("maps a strictly validated bootstrap response", async () => {
    const transport = vi.fn().mockResolvedValue(validResponse());
    const client = createWalletBootstrapClient(transport);

    const result = await client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });

    expect(result).toStrictEqual({
      shopId: "gid://shopify/Shop/1",
      presentmentCurrency: "USD",
      walletConfigs: [walletConfig()],
      recommendedWallet: walletConfig(),
      fallbackWallet: null,
      enabledFlags: ["flag-a"],
      variantParams: [{ id: "gid://shopify/ProductVariant/1", requiresShipping: true }],
      purchaseContext: { requiresShipping: true, hasSellingPlan: false },
    });
  });

  it("accepts cart bootstrap without product purchase context", async () => {
    const response = validResponse();
    delete response.purchaseContext;
    const client = createWalletBootstrapClient(vi.fn().mockResolvedValue(response));

    const result = await client.load({
      purchase: cartPurchase(),
      signal: new AbortController().signal,
    });

    expect(result.purchaseContext).toBeUndefined();
  });

  it("requires authoritative purchase context for product bootstrap", async () => {
    const response = validResponse();
    delete response.purchaseContext;
    const client = createWalletBootstrapClient(vi.fn().mockResolvedValue(response));

    await expect(
      client.load({
        purchase: productPurchase(),
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "bootstrap_response_invalid" });
  });

  it.each([
    { purchaseContext: { hasSellingPlan: false } },
    { purchaseContext: { requiresShipping: true } },
    { purchaseContext: { requiresShipping: "yes", hasSellingPlan: false } },
    { purchaseContext: { requiresShipping: true, hasSellingPlan: 0 } },
  ])("rejects malformed purchase context", async (override) => {
    const client = createWalletBootstrapClient(vi.fn().mockResolvedValue(validResponse(override)));

    await expect(
      client.load({
        purchase: productPurchase(),
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "bootstrap_response_invalid" });
  });

  it.each([
    null,
    {},
    validResponse({ walletConfigs: "shop_pay" }),
    validResponse({ walletConfigs: [{ name: "shop_pay", wallet_params: null }] }),
    validResponse({ recommendedWallet: undefined }),
    validResponse({ fallbackWallet: undefined }),
    validResponse({ flags: ["flag-a", 1] }),
    validResponse({ variantConfigs: [{ id: "variant" }] }),
    validResponse({ shopId: 1 }),
    validResponse({ presentmentCurrency: null }),
  ])("rejects a malformed bootstrap response", async (response) => {
    const client = createWalletBootstrapClient(vi.fn().mockResolvedValue(response));

    await expect(
      client.load({
        purchase: productPurchase(),
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: "bootstrap_response_invalid",
      message: "Wallet configuration is unavailable.",
    });
  });

  it.each([
    cartPurchase({ variantId: "gid://shopify/ProductVariant/1" }),
    productPurchase({ cartId: "gid://shopify/Cart/1" }),
    cartPurchase({ sellingPlanId: "gid://shopify/SellingPlan/1" }),
    cartPurchase({ cartId: undefined }),
    productPurchase({ variantId: undefined }),
    productPurchase({ storeDomain: "" }),
    productPurchase({ country: undefined }),
    productPurchase({ locale: " " }),
  ])("rejects invalid purchase configuration before transport", async (purchase) => {
    const transport = vi.fn();
    const client = createWalletBootstrapClient(transport);

    await expect(
      client.load({ purchase, signal: new AbortController().signal }),
    ).rejects.toMatchObject({ code: "bootstrap_request_invalid" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent requests for the same purchase", async () => {
    const pending = deferred<unknown>();
    const transport = vi.fn(() => pending.promise);
    const client = createWalletBootstrapClient(transport);
    const signal = new AbortController().signal;
    const purchase = productPurchase();

    const first = client.load({ purchase, signal });
    const second = client.load({ purchase: { ...purchase }, signal });

    expect(first).toBe(second);
    expect(transport).toHaveBeenCalledOnce();
    pending.resolve(validResponse());
    await expect(first).resolves.toMatchObject({ shopId: "gid://shopify/Shop/1" });
  });

  it("restarts the same purchase for a new generation", async () => {
    const firstResponse = deferred<unknown>();
    const transportSignals: AbortSignal[] = [];
    const transport = vi
      .fn()
      .mockImplementationOnce((request: WalletBootstrapTransportRequest) => {
        transportSignals.push(request.signal);
        return firstResponse.promise;
      })
      .mockImplementationOnce((request: WalletBootstrapTransportRequest) => {
        transportSignals.push(request.signal);
        return Promise.resolve(validResponse());
      });
    const client = createWalletBootstrapClient(transport);

    const first = client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });
    const second = client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });

    expect(transport).toHaveBeenCalledTimes(2);
    expect(transportSignals[0]?.aborted).toBe(true);
    await expect(second).resolves.toMatchObject({ shopId: "gid://shopify/Shop/1" });
    firstResponse.resolve(validResponse());
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborts an active bootstrap when the next purchase is invalid", async () => {
    const pending = deferred<unknown>();
    let transportSignal: AbortSignal | undefined;
    const transport = vi.fn((request: WalletBootstrapTransportRequest) => {
      transportSignal = request.signal;
      return pending.promise;
    });
    const client = createWalletBootstrapClient(transport);

    const first = client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });
    const invalid = client.load({
      purchase: productPurchase({ variantId: undefined }),
      signal: new AbortController().signal,
    });

    expect(transportSignal?.aborted).toBe(true);
    await expect(invalid).rejects.toMatchObject({ code: "bootstrap_request_invalid" });
    pending.resolve(validResponse());
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborts an older generation before starting a different purchase", async () => {
    const firstResponse = deferred<unknown>();
    const transportSignals: AbortSignal[] = [];
    const transport = vi.fn(async (request: WalletBootstrapTransportRequest): Promise<unknown> => {
      transportSignals.push(request.signal);
      if (request.purchase.type === "cart") return firstResponse.promise;
      return validResponse();
    });
    const client = createWalletBootstrapClient(transport);

    const first = client.load({
      purchase: cartPurchase(),
      signal: new AbortController().signal,
    });
    const second = client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });

    expect(transportSignals[0]?.aborted).toBe(true);
    await expect(second).resolves.toMatchObject({
      purchaseContext: { requiresShipping: true, hasSellingPlan: false },
    });
    firstResponse.resolve(validResponse({ purchaseContext: undefined }));
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborts transport when the calling generation is aborted", async () => {
    const pending = deferred<unknown>();
    let transportSignal: AbortSignal | undefined;
    const transport = vi.fn((request: WalletBootstrapTransportRequest) => {
      transportSignal = request.signal;
      return pending.promise;
    });
    const client = createWalletBootstrapClient(transport);
    const generation = new AbortController();

    const result = client.load({ purchase: productPurchase(), signal: generation.signal });
    generation.abort();

    expect(transportSignal?.aborted).toBe(true);
    pending.resolve(validResponse());
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("cancel aborts an active bootstrap", async () => {
    const pending = deferred<unknown>();
    let transportSignal: AbortSignal | undefined;
    const client = createWalletBootstrapClient((request) => {
      transportSignal = request.signal;
      return pending.promise;
    });

    const result = client.load({
      purchase: productPurchase(),
      signal: new AbortController().signal,
    });
    client.cancel();

    expect(transportSignal?.aborted).toBe(true);
    pending.resolve(validResponse());
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not call transport for an already-aborted generation", async () => {
    const transport = vi.fn();
    const client = createWalletBootstrapClient(transport);
    const generation = new AbortController();
    generation.abort();

    await expect(
      client.load({ purchase: productPurchase(), signal: generation.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("allows retry after a transport failure", async () => {
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(validResponse());
    const client = createWalletBootstrapClient(transport);

    await expect(
      client.load({
        purchase: productPurchase(),
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "bootstrap_transport_failed" });
    await expect(
      client.load({
        purchase: productPurchase(),
        signal: new AbortController().signal,
      }),
    ).resolves.toMatchObject({ shopId: "gid://shopify/Shop/1" });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("redacts transport failures and opaque cart references", async () => {
    const sensitive = "gid://shopify/Cart/opaque?key=private";
    const transport = vi.fn().mockRejectedValue(new Error(`failure for ${sensitive}`));
    const client = createWalletBootstrapClient(transport);

    const failure = await client
      .load({
        purchase: cartPurchase({ cartId: sensitive }),
        signal: new AbortController().signal,
      })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(WalletBootstrapError);
    expect((failure as WalletBootstrapError).message).toBe("Wallet configuration is unavailable.");
    expect((failure as WalletBootstrapError).message).not.toContain(sensitive);
    expect(failure).not.toHaveProperty("cause");
  });
});
