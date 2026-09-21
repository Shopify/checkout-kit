import { describe, expect, it, vi } from "vitest";

import { fetchWalletConfigs } from "./wallets-bootstrap";

function okResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  };
}

describe("fetchWalletConfigs", () => {
  it("calls POST /wallets/configs with the correct payload for cart flow", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse({ walletConfigs: [] }));

    await fetchWalletConfigs(
      {
        storeDomain: "shop.myshopify.com",
        accessToken: "token",
        country: "US",
        language: "en",
        flow: "cart",
        cartId: "gid://shopify/Cart/123",
      },
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith("https://shop.myshopify.com/wallets/configs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": "token",
      },
      body: expect.any(String),
    });

    const body = JSON.parse((fetcher.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.type).toBe("cart");
    expect(body.identifier).toBe("gid://shopify/Cart/123");
    expect(body.country).toBe("US");
  });

  it("sends product flow payload with variant and selling plan", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse({ walletConfigs: [] }));

    await fetchWalletConfigs(
      {
        storeDomain: "shop.myshopify.com",
        accessToken: "token",
        country: "CA",
        language: "fr",
        flow: "product",
        variantId: "gid://shopify/ProductVariant/456",
        sellingPlanId: "gid://shopify/SellingPlan/789",
      },
      fetcher,
    );

    const body = JSON.parse((fetcher.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.type).toBe("product");
    expect(body.identifier).toBe("gid://shopify/ProductVariant/456");
    expect(body.selling_plan_id).toBe("gid://shopify/SellingPlan/789");
  });

  it("maps the response to a WalletBootstrap", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      okResponse({
        shopId: "gid://shopify/Shop/1",
        presentmentCurrency: "CAD",
        walletConfigs: [{ name: "shop_pay", wallet_params: {} }],
        recommendedWallet: { name: "shop_pay", wallet_params: {} },
        fallbackWallet: null,
        flags: ["flag_a"],
        purchaseContext: { requiresShipping: true, hasSellingPlan: false },
        variantConfigs: [{ id: "42", requiresShipping: true }],
      }),
    );

    const result = await fetchWalletConfigs(
      {
        storeDomain: "shop.myshopify.com",
        accessToken: "token",
        country: "US",
        language: "en",
        flow: "product",
        variantId: "42",
      },
      fetcher,
    );

    expect(result.shopId).toBe("gid://shopify/Shop/1");
    expect(result.presentmentCurrency).toBe("CAD");
    expect(result.walletConfigs).toHaveLength(1);
    expect(result.recommendedWallet?.name).toBe("shop_pay");
    expect(result.fallbackWallet).toBeNull();
    expect(result.purchaseContext).toEqual({ requiresShipping: true, hasSellingPlan: false });
    expect(result.enabledFlags).toEqual(["flag_a"]);
    expect(result.variantParams[0]).toStrictEqual({ id: "42", requiresShipping: true });
  });

  it("rejects malformed purchase context instead of assuming digital", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      okResponse({
        purchaseContext: { requiresShipping: undefined, hasSellingPlan: false },
      }),
    );

    await expect(
      fetchWalletConfigs(
        {
          storeDomain: "shop.myshopify.com",
          accessToken: "token",
          country: "US",
          language: "en",
          flow: "product",
          variantId: "gid://shopify/ProductVariant/99",
        },
        fetcher,
      ),
    ).rejects.toThrow("invalid purchase context");
  });

  it("keeps variant ids as strings (avoids Number(gid) bug)", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      okResponse({
        variantConfigs: [{ id: "gid://shopify/ProductVariant/99", requiresShipping: false }],
      }),
    );

    const result = await fetchWalletConfigs(
      {
        storeDomain: "shop.myshopify.com",
        accessToken: "token",
        country: "US",
        language: "en",
        flow: "product",
        variantId: "99",
      },
      fetcher,
    );

    expect(result.variantParams[0]?.id).toBe("gid://shopify/ProductVariant/99");
  });

  it("strips protocol and trailing slash from storeDomain", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse({}));

    await fetchWalletConfigs(
      {
        storeDomain: "https://shop.myshopify.com/",
        accessToken: "token",
        country: "US",
        language: "en",
        flow: "cart",
      },
      fetcher,
    );

    expect(fetcher.mock.calls[0]![0]).toBe("https://shop.myshopify.com/wallets/configs");
  });

  it("requires a Storefront access token before making a request", async () => {
    const fetcher = vi.fn();

    await expect(
      fetchWalletConfigs(
        {
          storeDomain: "shop.myshopify.com",
          accessToken: "",
          country: "US",
          language: "en",
          flow: "cart",
        },
        fetcher,
      ),
    ).rejects.toThrow(/accessToken/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("throws on non-OK response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });

    await expect(
      fetchWalletConfigs(
        {
          storeDomain: "shop.myshopify.com",
          accessToken: "token",
          country: "US",
          language: "en",
          flow: "cart",
        },
        fetcher,
      ),
    ).rejects.toThrow(/500/);
  });
});
