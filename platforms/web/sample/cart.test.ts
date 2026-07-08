import { describe, expect, it, vi } from "vitest";

import {
  buildCartPermalink,
  buildProductsJsonUrl,
  fetchProductVariants,
  flattenProductVariants,
  cartLineTotalQuantity,
  isLikelyStorefrontDomain,
  normalizeStorefrontDomain,
  upsertCartLine,
  type CartLine,
} from "./cart";

describe("normalizeStorefrontDomain", () => {
  it("accepts bare storefront domains", () => {
    expect(normalizeStorefrontDomain("your-store.myshopify.com")).toBe("your-store.myshopify.com");
  });

  it("extracts the host from full storefront URLs", () => {
    expect(normalizeStorefrontDomain("https://YOUR-STORE.myshopify.com/products/book")).toBe(
      "your-store.myshopify.com",
    );
  });
});

describe("isLikelyStorefrontDomain", () => {
  it("accepts bare domains and full URLs", () => {
    expect(isLikelyStorefrontDomain("your-store.myshopify.com")).toBe(true);
    expect(isLikelyStorefrontDomain("https://your-store.myshopify.com/products/book")).toBe(true);
  });

  it("waits for a complete domain before auto-loading products", () => {
    expect(isLikelyStorefrontDomain("")).toBe(false);
    expect(isLikelyStorefrontDomain("your-store")).toBe(false);
    expect(isLikelyStorefrontDomain("not a domain")).toBe(false);
  });
});

describe("buildProductsJsonUrl", () => {
  it("points at the public products JSON endpoint", () => {
    expect(buildProductsJsonUrl("https://your-store.myshopify.com/")).toBe(
      "https://your-store.myshopify.com/products.json",
    );
  });
});

describe("flattenProductVariants", () => {
  it("flattens products.json products into selectable variants", () => {
    const variants = flattenProductVariants({
      products: [
        {
          title: "Physical Bundle",
          vendor: "Checkout Kit Test Shop",
          images: [{ src: "https://cdn.example.com/physical.png" }],
          variants: [
            { id: 1, title: "Blue", price: "25.00", available: true },
            { id: 2, title: "Red", price: "25.00", available: false },
          ],
        },
        {
          title: "Digital Bundle",
          vendor: "Checkout Kit Test Shop",
          variants: [{ id: 3, title: "Default Title", price: "10.00" }],
        },
      ],
    });

    expect(variants).toEqual([
      {
        id: "3",
        title: "Digital Bundle",
        productTitle: "Digital Bundle",
        variantTitle: "Default Title",
        vendor: "Checkout Kit Test Shop",
        price: "10.00",
        available: true,
        imageUrl: undefined,
      },
      {
        id: "1",
        title: "Physical Bundle - Blue",
        productTitle: "Physical Bundle",
        variantTitle: "Blue",
        vendor: "Checkout Kit Test Shop",
        price: "25.00",
        available: true,
        imageUrl: "https://cdn.example.com/physical.png",
      },
      {
        id: "2",
        title: "Physical Bundle - Red",
        productTitle: "Physical Bundle",
        variantTitle: "Red",
        vendor: "Checkout Kit Test Shop",
        price: "25.00",
        available: false,
        imageUrl: "https://cdn.example.com/physical.png",
      },
    ]);
  });
});

describe("fetchProductVariants", () => {
  it("fetches and flattens products.json variants", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          products: [
            {
              title: "Physical Bundle",
              variants: [{ id: 1, title: "Blue", price: "25.00" }],
            },
          ],
        }),
    });

    await expect(fetchProductVariants("your-store.myshopify.com", fetcher)).resolves.toEqual([
      {
        id: "1",
        title: "Physical Bundle - Blue",
        productTitle: "Physical Bundle",
        variantTitle: "Blue",
        vendor: "",
        price: "25.00",
        available: true,
        imageUrl: undefined,
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith("https://your-store.myshopify.com/products.json");
  });

  it("returns a useful error when the storefront does not expose products.json", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchProductVariants("your-store.myshopify.com", fetcher)).rejects.toThrow(
      "Could not load products from https://your-store.myshopify.com/products.json (HTTP 404). Confirm the storefront domain is correct and products are published to the Online Store channel.",
    );
  });
});

describe("upsertCartLine", () => {
  it("adds, updates, and removes lines by quantity", () => {
    expect(upsertCartLine([], "1", 2)).toEqual([{ variantId: "1", quantity: 2 }]);
    expect(upsertCartLine([{ variantId: "1", quantity: 2 }], "1", 3)).toEqual([
      { variantId: "1", quantity: 3 },
    ]);
    expect(upsertCartLine([{ variantId: "1", quantity: 2 }], "1", 0)).toEqual([]);
  });
});

describe("cartLineTotalQuantity", () => {
  it("sums selected line quantities", () => {
    expect(
      cartLineTotalQuantity([
        { variantId: "1", quantity: 2 },
        { variantId: "2", quantity: 3 },
      ]),
    ).toBe(5);
  });
});

describe("buildCartPermalink", () => {
  it("builds a multi-line cart permalink", () => {
    const lines: CartLine[] = [
      { variantId: "123", quantity: 1 },
      { variantId: "456", quantity: 2 },
    ];

    expect(buildCartPermalink("https://your-store.myshopify.com", lines)).toBe(
      "https://your-store.myshopify.com/cart/123:1,456:2",
    );
  });

  it("merges duplicate variant IDs and clamps quantities", () => {
    const lines: CartLine[] = [
      { variantId: "1", quantity: 1 },
      { variantId: "1", quantity: 999 },
      { variantId: "2", quantity: 0 },
    ];

    expect(buildCartPermalink("your-store.myshopify.com", lines)).toBe(
      "https://your-store.myshopify.com/cart/1:999,2:1",
    );
  });

  it("always produces an https permalink", () => {
    const permalink = buildCartPermalink("your-store.myshopify.com", [
      { variantId: "123", quantity: 1 },
    ]);

    expect(new URL(permalink).protocol).toBe("https:");
  });
});
