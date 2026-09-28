import { describe, expect, it } from "vitest";

import {
  canonicalBareDomain,
  configuredShopDomains,
  isAllowedShopDomain,
  isCartGid,
  isContinuationUrl,
  MAX_SESSION_CARTS,
  STOREFRONT_API_VERSION,
} from "./policy";

describe("Universal sample destination policy", () => {
  it("allows only Shopify-owned shop patterns or exact configured custom domains", () => {
    const custom = configuredShopDomains(
      " approved.example.com, second.example.org, shop-three.example.test ",
    );
    expect(isAllowedShopDomain("store-one.myshopify.com", "production", custom)).toBe(true);
    expect(isAllowedShopDomain("shop-three.example.test", "development", custom)).toBe(true);
    expect(isAllowedShopDomain("unlisted.example.test", "development", custom)).toBe(false);
    expect(isAllowedShopDomain("approved.example.com", "production", custom)).toBe(true);
    expect(isAllowedShopDomain("approved.example.com.evil.test", "production", custom)).toBe(false);
    expect(isAllowedShopDomain("store-one.myshopify.com.evil.test", "production", custom)).toBe(
      false,
    );
    expect(isAllowedShopDomain("store-one.myshopify.com", "development", custom)).toBe(false);
    expect(isAllowedShopDomain("https://store-one.myshopify.com", "production", custom)).toBe(
      false,
    );
    expect(isAllowedShopDomain("127.0.0.1", "production", custom)).toBe(false);
    expect(isAllowedShopDomain("localhost", "production", custom)).toBe(false);
  });

  it("rejects invalid custom configuration without repeating its value", () => {
    expect(canonicalBareDomain("APPROVED.EXAMPLE.COM")).toBe("approved.example.com");
    expect(() => configuredShopDomains("https://secret.example.com/path")).toThrow(
      /CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS contains an invalid domain/,
    );
    let caught: unknown;
    try {
      configuredShopDomains("https://secret.example.com/path");
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).not.toContain("secret.example.com");
  });

  it("requires full secret-bearing Cart GIDs without exposing their contents", () => {
    expect(isCartGid("gid://shopify/Cart/c1-synthetic?key=synthetic-secret")).toBe(true);
    expect(isCartGid("gid://shopify/Cart/c1-synthetic")).toBe(false);
    expect(isCartGid("gid://other/Cart/c1-synthetic?key=synthetic-secret")).toBe(false);
    expect(isCartGid("gid://shopify/ProductVariant/123?key=synthetic-secret")).toBe(false);
    expect(isCartGid("gid://shopify/Cart/c1-synthetic?key=a&key=b")).toBe(false);
  });

  it("accepts only HTTPS continuation URLs on the environment's exact host and path", () => {
    const production = "https://shop.app/checkouts/uc/synthetic-session?key=synthetic-secret";
    const development =
      "https://continue.example.test/checkouts/uc/synthetic-session?key=synthetic-secret";
    expect(isContinuationUrl(production, "production")).toBe(true);
    expect(isContinuationUrl(development, "development")).toBe(false);
    expect(isContinuationUrl(development, "development", "continue.example.test")).toBe(true);
    expect(isContinuationUrl(production, "development", "continue.example.test")).toBe(false);
    expect(isContinuationUrl(development, "development", "continue.example.test.evil.test")).toBe(
      false,
    );
    expect(isContinuationUrl(development, "development", "https://continue.example.test")).toBe(
      false,
    );
    expect(
      isContinuationUrl("https://shop.app.evil.test/checkouts/uc/id?key=x", "production"),
    ).toBe(false);
    expect(isContinuationUrl("http://shop.app/checkouts/uc/id?key=x", "production")).toBe(false);
    expect(isContinuationUrl("https://user@shop.app/checkouts/uc/id?key=x", "production")).toBe(
      false,
    );
    expect(isContinuationUrl("https://shop.app:444/checkouts/uc/id?key=x", "production")).toBe(
      false,
    );
    expect(isContinuationUrl("https://shop.app/other/id?key=x", "production")).toBe(false);
    expect(isContinuationUrl("https://shop.app/checkouts/uc/id", "production")).toBe(false);
    expect(isContinuationUrl("https://shop.app/checkouts/uc/id?key=x#section", "production")).toBe(
      false,
    );
  });

  it("pins the supported API version and Core cart cap", () => {
    expect(STOREFRONT_API_VERSION).toBe("2026-07");
    expect(MAX_SESSION_CARTS).toBe(15);
  });
});
