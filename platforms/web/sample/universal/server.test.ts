import { describe, expect, it, vi } from "vitest";

import { SAMPLE_API_PATHS } from "./policy";
import {
  configuredDevelopmentSession,
  configuredSampleOptions,
  handleSampleApiRequest,
} from "./server";

const CART_ID = "gid://shopify/Cart/c1-synthetic?key=synthetic-secret";
const CONTINUE_URL = "https://shop.app/checkouts/uc/synthetic-session?key=synthetic-secret";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function options(fetcher: typeof fetch, customDomains: string[] = []) {
  return {
    fetcher,
    allowedShopDomains: new Set(customDomains),
    productionSession: { createUrl: "https://shop.app/sessions", continuationHost: "shop.app" },
  };
}

describe("Universal sample local adapter", () => {
  it("preselects configured shops and exposes only browser configuration at runtime", async () => {
    const configured = configuredSampleOptions({
      STOREFRONT_DOMAIN: "fallback.myshopify.com",
      CHECKOUT_KIT_UC_SHOP_DOMAINS: "one.myshopify.com, TWO.example.test, one.myshopify.com",
      CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS: "extra.example.test",
      CHECKOUT_KIT_UC_SESSION_CREATE_URL: "https://shop.app/sessions",
      CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL: "https://create.example.test/sessions",
      VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST: "checkout.example.test",
    });
    expect(configured.allowedShopDomains).toEqual(
      new Set(["one.myshopify.com", "two.example.test", "extra.example.test"]),
    );
    const fetcher = vi.fn<typeof fetch>();
    const response = await handleSampleApiRequest(
      SAMPLE_API_PATHS.configuration,
      {},
      {
        ...configured,
        fetcher,
      },
    );
    expect(response).toEqual({
      status: 200,
      payload: {
        shopDomains: ["one.myshopify.com", "two.example.test"],
        developmentContinuationHost: "checkout.example.test",
      },
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain("create.example.test");
    expect(JSON.stringify(response)).not.toContain("extra.example.test");
  });

  it("uses the shared storefront domain only when the initial-shop setting is absent", () => {
    expect(configuredSampleOptions({ STOREFRONT_DOMAIN: "one.myshopify.com" }).shopDomains).toEqual(
      ["one.myshopify.com"],
    );
    expect(
      configuredSampleOptions({
        STOREFRONT_DOMAIN: "one.myshopify.com",
        CHECKOUT_KIT_UC_SHOP_DOMAINS: "",
      }).shopDomains,
    ).toEqual([]);
    expect(() =>
      configuredSampleOptions({
        CHECKOUT_KIT_UC_SHOP_DOMAINS: "https://synthetic-private.example.test/path",
      }),
    ).toThrow("CHECKOUT_KIT_UC_SHOP_DOMAINS or STOREFRONT_DOMAIN contains an invalid domain.");
    expect(() =>
      configuredSampleOptions({
        CHECKOUT_KIT_UC_SHOP_DOMAINS: Array.from(
          { length: 16 },
          (_, index) => `shop-${index}.myshopify.com`,
        ).join(","),
      }),
    ).toThrow("Configure at most 15 initial sample shops.");
  });

  it("requires production session configuration and keeps its destination on shop.app", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await handleSampleApiRequest(
      SAMPLE_API_PATHS.session,
      {
        environment: "production",
        cartIds: [CART_ID],
      },
      { ...configuredSampleOptions({}), fetcher },
    );
    expect(response).toEqual({ status: 503, payload: { error: "configuration_required" } });
    expect(fetcher).not.toHaveBeenCalled();
    for (const destination of [
      "https://shop.app.evil.test/sessions",
      "http://shop.app/sessions",
      "https://user:secret@shop.app/sessions",
      "https://shop.app/sessions?secret=value",
    ]) {
      expect(() =>
        configuredSampleOptions({ CHECKOUT_KIT_UC_SESSION_CREATE_URL: destination }),
      ).toThrow(
        "Configure CHECKOUT_KIT_UC_SESSION_CREATE_URL as an HTTPS endpoint on shop.app without credentials or query parameters.",
      );
    }
  });

  it("fetches only the fixed public catalog path on an approved shop", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ products: [{ title: "A" }] }));
    const result = await handleSampleApiRequest(
      SAMPLE_API_PATHS.catalog,
      { domain: "store-one.myshopify.com" },
      options(fetcher),
    );

    expect(result).toEqual({ status: 200, payload: { products: [{ title: "A" }] } });
    expect(fetcher).toHaveBeenCalledWith(
      "https://store-one.myshopify.com/products.json?limit=20",
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    );

    const blocked = await handleSampleApiRequest(
      SAMPLE_API_PATHS.catalog,
      { domain: "store-one.myshopify.com.evil.test" },
      options(fetcher),
    );
    expect(blocked).toEqual({ status: 403, payload: { error: "shop_not_allowed" } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("creates one tokenless Storefront cart with fixed GraphQL operation and full GID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        data: {
          cartCreate: {
            cart: { id: CART_ID, cost: { totalAmount: { currencyCode: "CAD" } } },
            userErrors: [],
          },
        },
      }),
    );
    const result = await handleSampleApiRequest(
      SAMPLE_API_PATHS.cart,
      {
        domain: "store-one.myshopify.com",
        environment: "production",
        countryCode: "CA",
        lines: [{ variantId: "123", quantity: 2 }],
      },
      options(fetcher),
    );

    expect(result).toEqual({ status: 200, payload: { cartId: CART_ID, currencyCode: "CAD" } });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://store-one.myshopify.com/api/2026-07/graphql.json");
    expect(init).toMatchObject({ method: "POST", redirect: "manual", cache: "no-store" });
    expect(init?.headers).not.toHaveProperty("Authorization");
    const body = JSON.parse(String(init?.body));
    expect(body.query).toContain("@inContext(country: $country)");
    expect(body.query).toContain("cartCreate(input: $input)");
    expect(body.variables).toEqual({
      country: "CA",
      input: {
        buyerIdentity: { countryCode: "CA" },
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/123", quantity: 2 }],
      },
    });
  });

  it("enforces exact custom-domain approval and rejects bad cart inputs before a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const base = {
      environment: "production",
      countryCode: "CA",
      lines: [{ variantId: "123", quantity: 1 }],
    };
    const custom = options(fetcher, ["approved.example.com"]);
    const blocked = await handleSampleApiRequest(
      SAMPLE_API_PATHS.cart,
      { ...base, domain: "approved.example.com.evil.test" },
      custom,
    );
    expect(blocked.payload).toEqual({ error: "shop_not_allowed" });
    const badLines = await handleSampleApiRequest(
      SAMPLE_API_PATHS.cart,
      {
        ...base,
        domain: "approved.example.com",
        lines: [{ variantId: "123) { id }", quantity: 1 }],
      },
      custom,
    );
    expect(badLines.payload).toEqual({ error: "invalid_request" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects upstream redirects and never includes a raw upstream error body", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { Location: "https://evil.test/" } }),
      )
      .mockResolvedValueOnce(new Response(`invalid gid ${CART_ID}`, { status: 400 }));
    const cartInput = {
      domain: "store-one.myshopify.com",
      environment: "production",
      countryCode: "CA",
      lines: [{ variantId: "123", quantity: 1 }],
    };
    const redirect = await handleSampleApiRequest(
      SAMPLE_API_PATHS.cart,
      cartInput,
      options(fetcher),
    );
    const rejection = await handleSampleApiRequest(
      SAMPLE_API_PATHS.cart,
      cartInput,
      options(fetcher),
    );

    expect(redirect.payload).toEqual({ error: "upstream_redirect" });
    expect(rejection.payload).toEqual({ error: "upstream_rejected" });
    expect(JSON.stringify(rejection)).not.toContain(CART_ID);
  });

  it("rejects oversized upstream JSON even when a response claims a smaller size", async () => {
    const oversizedCart = JSON.stringify({
      data: {
        cartCreate: {
          cart: { id: CART_ID, cost: { totalAmount: { currencyCode: "CAD" } } },
          userErrors: [],
        },
      },
      padding: "x".repeat(256 * 1024),
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(oversizedCart, {
        status: 200,
        headers: { "Content-Type": "application/json", "Content-Length": "1" },
      }),
    );
    const result = await handleSampleApiRequest(
      SAMPLE_API_PATHS.cart,
      {
        domain: "store-one.myshopify.com",
        environment: "production",
        countryCode: "CA",
        lines: [{ variantId: "123", quantity: 1 }],
      },
      options(fetcher),
    );

    expect(result).toEqual({ status: 502, payload: { error: "upstream_invalid_response" } });
    expect(JSON.stringify(result)).not.toContain(CART_ID);
  });

  it("rejects an advertised oversized catalog response before parsing it", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{"products":[]}', {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(8 * 1024 * 1024 + 1),
        },
      }),
    );
    const result = await handleSampleApiRequest(
      SAMPLE_API_PATHS.catalog,
      { domain: "store-one.myshopify.com" },
      options(fetcher),
    );

    expect(result).toEqual({ status: 502, payload: { error: "upstream_invalid_response" } });
  });

  it("creates a session with only secret-bearing cart IDs and validates its continuation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ continue_url: CONTINUE_URL }, 201))
      .mockResolvedValueOnce(
        jsonResponse({ continue_url: "https://evil.test/checkouts/uc/id?key=x" }, 201),
      );
    const request = { environment: "production", cartIds: [CART_ID] };
    const success = await handleSampleApiRequest(
      SAMPLE_API_PATHS.session,
      request,
      options(fetcher),
    );
    expect(success).toEqual({ status: 200, payload: { continueUrl: CONTINUE_URL } });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://shop.app/sessions");
    expect(init).toMatchObject({ method: "POST", redirect: "manual" });
    expect(JSON.parse(String(init?.body))).toEqual({ cart_ids: [CART_ID] });

    const rejected = await handleSampleApiRequest(
      SAMPLE_API_PATHS.session,
      request,
      options(fetcher),
    );
    expect(rejected).toEqual({ status: 502, payload: { error: "upstream_invalid_response" } });
  });

  it("requires exact, server-configured development destinations", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { continue_url: "https://continue.example.test/checkouts/uc/synthetic?key=synthetic" },
          201,
        ),
      );
    const request = { environment: "development", cartIds: [CART_ID] };
    const unavailable = await handleSampleApiRequest(
      SAMPLE_API_PATHS.session,
      request,
      options(fetcher),
    );
    expect(unavailable).toEqual({ status: 503, payload: { error: "configuration_required" } });
    expect(fetcher).not.toHaveBeenCalled();

    const destination = configuredDevelopmentSession(
      "https://create.example.test/sessions",
      "continue.example.test",
    );
    const result = await handleSampleApiRequest(SAMPLE_API_PATHS.session, request, {
      ...options(fetcher),
      developmentSession: destination,
    });
    expect(result).toEqual({
      status: 200,
      payload: {
        continueUrl: "https://continue.example.test/checkouts/uc/synthetic?key=synthetic",
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://create.example.test/sessions",
      expect.objectContaining({ method: "POST", redirect: "manual" }),
    );
  });

  it("rejects invalid development configuration without repeating its value", () => {
    expect(configuredDevelopmentSession(undefined, undefined)).toBeNull();
    for (const [createUrl, host] of [
      ["https://secret.example.test/sessions", undefined],
      ["https://user:secret@create.example.test/sessions", "continue.example.test"],
      ["http://create.example.test/sessions", "continue.example.test"],
      ["https://create.example.test/sessions?secret=value", "continue.example.test"],
      ["https://create.example.test/sessions", "continue.example.test.evil/path"],
    ] as const) {
      let error: unknown;
      try {
        configuredDevelopmentSession(createUrl, host);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain("secret.example.test");
    }
  });

  it("rejects missing cart secrets and more than 15 carts before network access", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const missingKey = await handleSampleApiRequest(
      SAMPLE_API_PATHS.session,
      { environment: "production", cartIds: ["gid://shopify/Cart/c1-synthetic"] },
      options(fetcher),
    );
    const tooMany = await handleSampleApiRequest(
      SAMPLE_API_PATHS.session,
      {
        environment: "production",
        cartIds: Array.from(
          { length: 16 },
          (_, index) => `gid://shopify/Cart/c1-synthetic-${index}?key=synthetic-secret`,
        ),
      },
      options(fetcher),
    );
    expect(missingKey.status).toBe(400);
    expect(tooMany.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
