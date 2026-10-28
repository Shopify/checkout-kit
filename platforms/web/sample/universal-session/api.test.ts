import { describe, expect, it } from "vitest";

import {
  canonicalBareDomain,
  classifyPastedSource,
  isAllowedShopDomain,
  isContinuationUrl,
} from "./api";

const CONTINUE_URL = "https://shop.app/checkouts/uc/session-1?key=synthetic-key";

describe("canonicalBareDomain", () => {
  it("lowercases a bare hostname", () => {
    expect(canonicalBareDomain("Your-Store.myshopify.com")).toBe("your-store.myshopify.com");
  });

  it.each([
    "https://your-store.myshopify.com",
    "your-store.myshopify.com/products",
    " your-store.myshopify.com",
    "localhost",
    "your-store.myshopify.c0m",
    42,
  ])("rejects %s", (value) => {
    expect(canonicalBareDomain(value)).toBeNull();
  });
});

describe("isAllowedShopDomain", () => {
  const configured = new Set(["store.example.test"]);

  it("allows production myshopify.com shops without configuration", () => {
    expect(isAllowedShopDomain("your-store.myshopify.com", "production", new Set())).toBe(true);
    expect(isAllowedShopDomain("your-store.myshopify.com", "development", new Set())).toBe(false);
  });

  it("allows configured shops in either environment", () => {
    expect(isAllowedShopDomain("store.example.test", "production", configured)).toBe(true);
    expect(isAllowedShopDomain("store.example.test", "development", configured)).toBe(true);
    expect(isAllowedShopDomain("other.example.test", "production", configured)).toBe(false);
  });
});

describe("isContinuationUrl", () => {
  it("accepts a keyed session URL on the environment's host", () => {
    expect(isContinuationUrl(CONTINUE_URL, "production")).toBe(true);
    expect(
      isContinuationUrl(
        "https://checkout.example.test/checkouts/uc/session-1?key=k",
        "development",
        "checkout.example.test",
      ),
    ).toBe(true);
  });

  it.each([
    ["another host", "https://example.test/checkouts/uc/session-1?key=k"],
    ["HTTP", "http://shop.app/checkouts/uc/session-1?key=k"],
    ["a missing key", "https://shop.app/checkouts/uc/session-1"],
    ["two keys", "https://shop.app/checkouts/uc/session-1?key=a&key=b"],
    ["another path", "https://shop.app/checkouts/cn/session-1?key=k"],
    ["a fragment", `${CONTINUE_URL}#fragment`],
    ["credentials", "https://user:pass@shop.app/checkouts/uc/session-1?key=k"],
  ])("rejects %s", (_, value) => {
    expect(isContinuationUrl(value, "production")).toBe(false);
  });

  it("rejects development URLs without a configured host", () => {
    expect(isContinuationUrl(CONTINUE_URL, "development")).toBe(false);
  });
});

describe("classifyPastedSource", () => {
  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["not a url", "invalid"],
    ["http://shop.app/checkouts/uc/session-1?key=k", "invalid"],
    ["https://your-store.myshopify.com/cart/1:1", "unexpected"],
    [` ${CONTINUE_URL} `, "valid"],
    ["https://checkout.example.test/checkouts/uc/session-1?key=k", "valid"],
  ])("classifies %j as %s", (value, status) => {
    expect(classifyPastedSource(value)).toBe(status);
  });
});
