import { describe, expect, it } from "vitest";

import { parseShopDomain } from "./domain";

describe("parseShopDomain", () => {
  it("normalizes bare domains and HTTPS homepages for duplicate detection", () => {
    expect(parseShopDomain("  SHOP-ONE.example.com  ")).toEqual({
      ok: true,
      domain: "shop-one.example.com",
    });
    expect(parseShopDomain("https://shop-one.example.com/")).toEqual({
      ok: true,
      domain: "shop-one.example.com",
    });
  });

  it.each([
    "http://shop-one.example.com",
    "https://user:secret@shop-one.example.com",
    "shop-one.example.com:443",
    "https://shop-one.example.com/products/book",
    "https://shop-one.example.com/?token=secret",
    "shop-one..example.com",
    "localhost",
    "//shop-one.example.com",
  ])("rejects ambiguous or unsafe input %s before normalizing it", (raw) => {
    expect(parseShopDomain(raw).ok).toBe(false);
  });
});
