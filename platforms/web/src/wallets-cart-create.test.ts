import { describe, expect, it, vi } from "vitest";

import { storefrontCartCreate } from "./wallets-cart-create";

const OPTS = {
  storeDomain: "shop.myshopify.com",
  accessToken: "shpat_test",
  variantId: "gid://shopify/ProductVariant/42",
};

function okResponse(cartId: string) {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        data: { cartCreate: { cart: { id: cartId }, userErrors: [] } },
      }),
  };
}

describe("storefrontCartCreate", () => {
  it("returns the cart GID on success", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/new-1"));
    const id = await storefrontCartCreate(OPTS, fetcher);
    expect(id).toBe("gid://shopify/Cart/new-1");
  });

  it("uses the supported API version and sends merchandiseId as a GID", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/1"));
    await storefrontCartCreate(OPTS, fetcher);

    expect(fetcher.mock.calls[0]![0]).toBe("https://shop.myshopify.com/api/2026-04/graphql.json");
    const body = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(body.variables.input.lines[0].merchandiseId).toBe("gid://shopify/ProductVariant/42");
  });

  it("prefixes a bare numeric variant ID with the GID", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/1"));
    await storefrontCartCreate({ ...OPTS, variantId: "42" }, fetcher);

    const body = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(body.variables.input.lines[0].merchandiseId).toBe("gid://shopify/ProductVariant/42");
  });

  it("includes sellingPlanId when provided", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/1"));
    await storefrontCartCreate({ ...OPTS, sellingPlanId: "gid://shopify/SellingPlan/99" }, fetcher);

    const body = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(body.variables.input.lines[0].sellingPlanId).toBe("gid://shopify/SellingPlan/99");
  });

  it("fails closed when storeDomain is missing", async () => {
    await expect(storefrontCartCreate({ ...OPTS, storeDomain: "" })).rejects.toThrow(/storeDomain/);
  });

  it("fails closed when accessToken is missing", async () => {
    await expect(storefrontCartCreate({ ...OPTS, accessToken: "" })).rejects.toThrow(/accessToken/);
  });

  it("fails closed when variantId is missing", async () => {
    await expect(storefrontCartCreate({ ...OPTS, variantId: "" })).rejects.toThrow(/variantId/);
  });

  it("throws on non-OK response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });
    await expect(storefrontCartCreate(OPTS, fetcher)).rejects.toThrow(/401/);
  });

  it("throws on user errors", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            cartCreate: {
              cart: null,
              userErrors: [{ field: ["lines"], message: "invalid variant" }],
            },
          },
        }),
    });
    await expect(storefrontCartCreate(OPTS, fetcher)).rejects.toThrow(/invalid variant/);
  });

  it("forwards the abort signal to the fetcher", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/1"));
    await storefrontCartCreate({ ...OPTS, signal: controller.signal }, fetcher);
    expect(fetcher.mock.calls[0]![1].signal).toBe(controller.signal);
  });
});
