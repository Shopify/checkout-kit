import { describe, expect, it, vi } from "vitest";

import { createStorefrontCart } from "./storefront-api";

const DOMAIN = "your-store.myshopify.com";
const TOKEN = "shpat_test";
const LINES = [{ variantId: "123", quantity: 2 }];

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

describe("createStorefrontCart", () => {
  it("returns the cart GID on success", async () => {
    const cartId = "gid://shopify/Cart/Z2NwLXVzLWVhc3QxOjAxSlQ5";
    const fetcher = vi.fn().mockResolvedValue(okResponse(cartId));

    const result = await createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher);
    expect(result.cartId).toBe(cartId);
  });

  it("sends the correct URL, headers, and GID-formatted merchandise IDs", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/1"));
    await createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://your-store.myshopify.com/api/2025-04/graphql.json");
    expect((init.headers as Record<string, string>)["X-Shopify-Storefront-Access-Token"]).toBe(
      TOKEN,
    );

    const body = JSON.parse(init.body as string);
    expect(body.variables.lines).toEqual([
      { merchandiseId: "gid://shopify/ProductVariant/123", quantity: 2 },
    ]);
  });

  it("passes through variant IDs that are already GIDs", async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse("gid://shopify/Cart/1"));
    await createStorefrontCart(
      DOMAIN,
      TOKEN,
      [{ variantId: "gid://shopify/ProductVariant/999", quantity: 1 }],
      fetcher,
    );
    const body = JSON.parse((fetcher.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.variables.lines[0].merchandiseId).toBe("gid://shopify/ProductVariant/999");
  });

  it("throws on empty domain", async () => {
    await expect(createStorefrontCart("", TOKEN, LINES)).rejects.toThrow(/storefront domain/);
  });

  it("throws on empty access token", async () => {
    await expect(createStorefrontCart(DOMAIN, "", LINES)).rejects.toThrow(/access token/);
  });

  it("throws on empty lines", async () => {
    await expect(createStorefrontCart(DOMAIN, TOKEN, [])).rejects.toThrow(/at least one product/);
  });

  it("throws on network failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network"));
    await expect(createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher)).rejects.toThrow(
      /Could not reach/,
    );
  });

  it("throws on non-OK HTTP response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });
    await expect(createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher)).rejects.toThrow(/401/);
  });

  it("throws on GraphQL errors", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ errors: [{ message: "bad query" }] }),
    });
    await expect(createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher)).rejects.toThrow(/bad query/);
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
              userErrors: [{ field: ["lines", "0"], message: "invalid variant" }],
            },
          },
        }),
    });
    await expect(createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher)).rejects.toThrow(
      /invalid variant/,
    );
  });

  it("throws when the response has no cart ID", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { cartCreate: { cart: null, userErrors: [] } } }),
    });
    await expect(createStorefrontCart(DOMAIN, TOKEN, LINES, fetcher)).rejects.toThrow(/no cart ID/);
  });
});
