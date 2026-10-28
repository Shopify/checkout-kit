// @vitest-environment node
import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import { MAX_CART_LINES, MAX_LINE_QUANTITY, MAX_SESSION_STORES, SAMPLE_API_PATHS } from "./api";
import {
  configuredSampleOptions,
  handleSampleApiRequest,
  sampleMiddleware,
  type SampleServerOptions,
} from "./server";

const DOMAIN = "your-store.myshopify.com";
const CART_ID = "gid://shopify/Cart/synthetic-cart?key=synthetic-cart-key";
const CONTINUE_URL = "https://shop.app/checkouts/uc/session-1?key=synthetic-session-key";
const CREATE_URL = "https://shop.app/sessions";

const REQUEST = {
  environment: "production",
  countryCode: "CA",
  stores: [{ domain: DOMAIN, lines: [{ variantId: "123", quantity: 2 }] }],
};

/** A unique 253-character domain, the longest a store can have. */
function longestDomain(index: number): string {
  return `${String(index).padStart(2, "0")}${"a".repeat(61)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(56)}.test`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cartResponse(overrides: Record<string, unknown> = {}): Response {
  return json({
    data: {
      cartCreate: {
        cart: { id: CART_ID, cost: { totalAmount: { currencyCode: "CAD" } } },
        userErrors: [],
        ...overrides,
      },
    },
  });
}

function options(fetcher: typeof fetch, overrides: Partial<SampleServerOptions> = {}) {
  return {
    allowedShopDomains: new Set<string>(),
    sessions: { production: { createUrl: CREATE_URL, continuationHost: "shop.app" } },
    fetcher,
    ...overrides,
  } satisfies SampleServerOptions;
}

function session(
  payload: unknown,
  fetcher: typeof fetch,
  overrides?: Partial<SampleServerOptions>,
) {
  return handleSampleApiRequest(SAMPLE_API_PATHS.session, payload, options(fetcher, overrides));
}

describe("configuration", () => {
  it("reports the default storefront, store domains, and the configured environments only", async () => {
    const result = await handleSampleApiRequest(
      SAMPLE_API_PATHS.configuration,
      {},
      options(vi.fn(), {
        storefrontDomain: DOMAIN,
        storeDomains: [DOMAIN, "another.myshopify.com"],
      }),
    );

    expect(result).toEqual({
      status: 200,
      payload: {
        storefrontDomain: DOMAIN,
        storeDomains: [DOMAIN, "another.myshopify.com"],
        environments: ["production"],
      },
    });
    expect(JSON.stringify(result)).not.toContain(CREATE_URL);
  });

  it("limits storeDomains to MAX_SESSION_STORES", async () => {
    const manyDomains = Array(20)
      .fill("")
      .map((_, i) => `store-${i}.myshopify.com`);
    const result = await handleSampleApiRequest(
      SAMPLE_API_PATHS.configuration,
      {},
      options(vi.fn(), { storeDomains: manyDomains }),
    );

    expect(result.payload.storeDomains).toHaveLength(15);
  });
});

describe("session", () => {
  it("creates a cart, then a session from it, and returns only its session URL", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(cartResponse())
      .mockResolvedValueOnce(json({ continue_url: CONTINUE_URL }, 201));

    const result = await session(REQUEST, fetcher);

    expect(result).toEqual({
      status: 200,
      payload: { continueUrl: CONTINUE_URL, currencyCode: "CAD" },
    });
    expect(JSON.stringify(result)).not.toContain(CART_ID);

    const [cartUrl, cartInit] = fetcher.mock.calls[0] ?? [];
    expect(cartUrl).toBe(`https://${DOMAIN}/api/2026-07/graphql.json`);
    expect(cartInit?.redirect).toBe("manual");
    const cartBody = JSON.parse(String(cartInit?.body));
    expect(cartBody.query).toContain("@inContext(country: $country)");
    expect(cartBody.variables).toEqual({
      country: "CA",
      input: {
        buyerIdentity: { countryCode: "CA" },
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/123", quantity: 2 }],
      },
    });

    const [sessionUrl, sessionInit] = fetcher.mock.calls[1] ?? [];
    expect(sessionUrl).toBe(CREATE_URL);
    expect(JSON.parse(String(sessionInit?.body))).toEqual({ cart_ids: [CART_ID] });
  });

  it("uses the storefront's default market without a buyer country", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(cartResponse())
      .mockResolvedValueOnce(json({ continue_url: CONTINUE_URL }, 201));

    await session({ ...REQUEST, countryCode: undefined }, fetcher);

    const cartBody = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(cartBody.query).not.toContain("@inContext");
    expect(cartBody.variables.input).not.toHaveProperty("buyerIdentity");
  });

  it.each([
    ["an unknown environment", { environment: "staging" }],
    ["an unknown country", { countryCode: "XX" }],
    ["no stores", { stores: [] }],
    [
      "too many stores",
      { stores: Array(16).fill({ domain: DOMAIN, lines: [{ variantId: "123", quantity: 1 }] }) },
    ],
    [
      "a duplicate domain",
      {
        stores: [
          { domain: DOMAIN, lines: [{ variantId: "123", quantity: 1 }] },
          { domain: DOMAIN, lines: [{ variantId: "456", quantity: 1 }] },
        ],
      },
    ],
    [
      "a URL instead of a domain",
      { stores: [{ domain: `https://${DOMAIN}`, lines: [{ variantId: "123", quantity: 1 }] }] },
    ],
    ["no lines in a store", { stores: [{ domain: DOMAIN, lines: [] }] }],
    [
      "a non-numeric variant",
      { stores: [{ domain: DOMAIN, lines: [{ variantId: "gid://x", quantity: 1 }] }] },
    ],
    [
      "a duplicate variant in one store",
      {
        stores: [
          {
            domain: DOMAIN,
            lines: [
              { variantId: "123", quantity: 1 },
              { variantId: "123", quantity: 1 },
            ],
          },
        ],
      },
    ],
    [
      "a zero quantity",
      { stores: [{ domain: DOMAIN, lines: [{ variantId: "123", quantity: 0 }] }] },
    ],
    [
      "too large a quantity",
      { stores: [{ domain: DOMAIN, lines: [{ variantId: "123", quantity: 1000 }] }] },
    ],
  ])("rejects %s before calling upstream", async (_, change) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await session({ ...REQUEST, ...change }, fetcher)).toEqual({
      status: 400,
      payload: { error: "invalid_request" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("only allows configured shops for local development", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await session({ ...REQUEST, environment: "development" }, fetcher, {
      sessions: {
        development: { createUrl: CREATE_URL, continuationHost: "checkout.example.test" },
      },
    });

    expect(result).toEqual({
      status: 403,
      payload: { error: "shop_not_allowed", stage: "cart", domain: DOMAIN },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports a missing session endpoint before creating a cart", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await session(REQUEST, fetcher, { sessions: {} })).toEqual({
      status: 503,
      payload: { error: "configuration_required", stage: "session" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a subscription-only product",
      cartResponse({ cart: null, userErrors: [{ code: "VARIANT_REQUIRES_SELLING_PLAN" }] }),
      422,
      "cart_selling_plan_required",
    ],
    [
      "another user error",
      cartResponse({ cart: null, userErrors: [{ code: "INVALID", field: ["lines"] }] }),
      422,
      "cart_rejected",
    ],
    ["a GraphQL error", json({ errors: [{ message: "synthetic" }] }), 422, "cart_rejected"],
    ["a malformed cart", cartResponse({ cart: { id: "123" } }), 502, "upstream_invalid_response"],
    ["a redirect", new Response(null, { status: 302 }), 502, "upstream_redirect"],
    ["rate limiting", new Response(null, { status: 429 }), 429, "rate_limited"],
  ])("maps %s while creating the cart", async (_, response, status, error) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response);
    expect(await session(REQUEST, fetcher)).toEqual({
      status,
      payload: { error, stage: "cart", domain: DOMAIN },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports an unreachable storefront", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("offline"));
    expect(await session(REQUEST, fetcher)).toEqual({
      status: 502,
      payload: { error: "upstream_unavailable", stage: "cart", domain: DOMAIN },
    });
  });

  it.each([
    [400, 422, "session_rejected"],
    [401, 422, "session_rejected"],
    [403, 403, "session_access_denied"],
    [422, 422, "session_ineligible"],
    [500, 502, "upstream_unavailable"],
    [200, 502, "upstream_rejected"],
  ])("maps a %i session response", async (upstream, status, error) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(cartResponse())
      .mockResolvedValueOnce(json({}, upstream));
    expect(await session(REQUEST, fetcher)).toEqual({
      status,
      payload: { error, stage: "session" },
    });
  });

  it("rejects a session URL on an untrusted host", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(cartResponse())
      .mockResolvedValueOnce(
        json({ continue_url: "https://example.test/checkouts/uc/session-1?key=k" }, 201),
      );
    expect(await session(REQUEST, fetcher)).toEqual({
      status: 502,
      payload: { error: "upstream_invalid_response", stage: "session" },
    });
  });

  it("creates multiple carts and sends their IDs in order", async () => {
    const CART_ID_2 = "gid://shopify/Cart/cart-2?key=key-2";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({
          data: {
            cartCreate: {
              cart: { id: CART_ID, cost: { totalAmount: { currencyCode: "USD" } } },
              userErrors: [],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        json({
          data: {
            cartCreate: {
              cart: { id: CART_ID_2, cost: { totalAmount: { currencyCode: "USD" } } },
              userErrors: [],
            },
          },
        }),
      )
      .mockResolvedValueOnce(json({ continue_url: CONTINUE_URL }, 201));

    const result = await session(
      {
        environment: "production",
        stores: [
          { domain: DOMAIN, lines: [{ variantId: "123", quantity: 1 }] },
          { domain: "another.myshopify.com", lines: [{ variantId: "456", quantity: 2 }] },
        ],
      },
      fetcher,
    );

    expect(result).toEqual({
      status: 200,
      payload: { continueUrl: CONTINUE_URL, currencyCode: "USD" },
    });

    const sessionBody = JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body));
    expect(sessionBody).toEqual({ cart_ids: [CART_ID, CART_ID_2] });
  });

  it("reports disallowed domains with the failing store", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await session(
      {
        environment: "development",
        stores: [
          { domain: "allowed.example.test", lines: [{ variantId: "123", quantity: 1 }] },
          { domain: "forbidden.example.test", lines: [{ variantId: "456", quantity: 1 }] },
        ],
      },
      fetcher,
      {
        allowedShopDomains: new Set(["allowed.example.test"]),
        sessions: {
          development: { createUrl: CREATE_URL, continuationHost: "checkout.example.test" },
        },
      },
    );

    expect(result).toEqual({
      status: 403,
      payload: { error: "shop_not_allowed", stage: "cart", domain: "forbidden.example.test" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports the failing cart with the store domain", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(cartResponse())
      .mockResolvedValueOnce(json({ errors: [{ message: "synthetic" }] }));

    const result = await session(
      {
        environment: "production",
        stores: [
          { domain: DOMAIN, lines: [{ variantId: "123", quantity: 1 }] },
          { domain: "another.myshopify.com", lines: [{ variantId: "456", quantity: 1 }] },
        ],
      },
      fetcher,
    );

    expect(result).toEqual({
      status: 422,
      payload: { error: "cart_rejected", stage: "cart", domain: "another.myshopify.com" },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects currency mismatches without creating a session", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({
          data: {
            cartCreate: {
              cart: { id: CART_ID, cost: { totalAmount: { currencyCode: "USD" } } },
              userErrors: [],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        json({
          data: {
            cartCreate: {
              cart: {
                id: "gid://shopify/Cart/cart-2?key=key-2",
                cost: { totalAmount: { currencyCode: "CAD" } },
              },
              userErrors: [],
            },
          },
        }),
      );

    const result = await session(
      {
        environment: "production",
        stores: [
          { domain: "store-usd.myshopify.com", lines: [{ variantId: "123", quantity: 1 }] },
          { domain: "store-cad.myshopify.com", lines: [{ variantId: "456", quantity: 1 }] },
        ],
      },
      fetcher,
    );

    expect(result).toEqual({
      status: 422,
      payload: {
        error: "currency_mismatch",
        stage: "cart",
        currencies: [
          { domain: "store-usd.myshopify.com", currencyCode: "USD" },
          { domain: "store-cad.myshopify.com", currencyCode: "CAD" },
        ],
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("currency", () => {
  function currency(
    payload: unknown,
    fetcher: typeof fetch,
    overrides?: Partial<SampleServerOptions>,
  ) {
    return handleSampleApiRequest(SAMPLE_API_PATHS.currency, payload, options(fetcher, overrides));
  }

  it("queries the storefront and returns the currency code", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      json({
        data: {
          products: {
            nodes: [{ priceRange: { minVariantPrice: { currencyCode: "EUR" } } }],
          },
        },
      }),
    );

    const result = await currency(
      { environment: "production", domain: DOMAIN, countryCode: "DE" },
      fetcher,
    );

    expect(result).toEqual({ status: 200, payload: { currencyCode: "EUR" } });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(`https://${DOMAIN}/api/2026-07/graphql.json`);
    const body = JSON.parse(String(init?.body));
    expect(body.query).toContain("@inContext(country: $country)");
    expect(body.variables).toEqual({ country: "DE" });
  });

  it("queries without @inContext when countryCode is absent", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      json({
        data: {
          products: {
            nodes: [{ priceRange: { minVariantPrice: { currencyCode: "USD" } } }],
          },
        },
      }),
    );

    await currency({ environment: "production", domain: DOMAIN }, fetcher);

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body.query).not.toContain("@inContext");
  });

  it.each([
    ["an unknown environment", { environment: "staging", domain: DOMAIN }],
    ["a URL instead of a domain", { environment: "production", domain: `https://${DOMAIN}` }],
    ["an invalid country", { environment: "production", domain: DOMAIN, countryCode: "XX" }],
  ])("rejects %s before calling upstream", async (_, payload) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await currency(payload, fetcher)).toEqual({
      status: 400,
      payload: { error: "invalid_request" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects disallowed shops", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await currency({ environment: "development", domain: DOMAIN }, fetcher, {
      sessions: {
        development: { createUrl: CREATE_URL, continuationHost: "checkout.example.test" },
      },
    });

    expect(result).toEqual({
      status: 403,
      payload: { error: "shop_not_allowed", stage: "cart" },
    });
  });

  it("maps upstream errors", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect(await currency({ environment: "production", domain: DOMAIN }, fetcher)).toEqual({
      status: 429,
      payload: { error: "rate_limited", stage: "cart" },
    });
  });
});

describe("configuredSampleOptions", () => {
  it("reads the storefront and session settings", () => {
    const configured = configuredSampleOptions({
      CHECKOUT_KIT_UC_SHOP_DOMAINS: "store-one.example.test, store-two.example.test",
      CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS: "store-three.example.test",
      CHECKOUT_KIT_UC_SESSION_CREATE_URL: CREATE_URL,
      CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL: "https://sessions.example.test/sessions",
      VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST: "checkout.example.test",
    });

    expect(configured).toEqual({
      storefrontDomain: "store-one.example.test",
      storeDomains: ["store-one.example.test", "store-two.example.test"],
      allowedShopDomains: new Set([
        "store-one.example.test",
        "store-two.example.test",
        "store-three.example.test",
      ]),
      sessions: {
        production: { createUrl: CREATE_URL, continuationHost: "shop.app" },
        development: {
          createUrl: "https://sessions.example.test/sessions",
          continuationHost: "checkout.example.test",
        },
      },
    });
  });

  it("prefers STOREFRONT_DOMAIN as the default storefront", () => {
    expect(
      configuredSampleOptions({
        STOREFRONT_DOMAIN: DOMAIN,
        CHECKOUT_KIT_UC_SHOP_DOMAINS: "store-one.example.test",
      }).storefrontDomain,
    ).toBe(DOMAIN);
  });

  it("starts without sessions when nothing is configured", () => {
    expect(configuredSampleOptions({})).toEqual({
      storeDomains: [],
      allowedShopDomains: new Set(),
      sessions: {},
    });
  });

  it.each([
    [{ STOREFRONT_DOMAIN: "https://synthetic.example.test" }, /STOREFRONT_DOMAIN/],
    [{ CHECKOUT_KIT_UC_SESSION_CREATE_URL: "https://example.test/sessions" }, /shop\.app/],
    [{ CHECKOUT_KIT_UC_SESSION_CREATE_URL: `${CREATE_URL}?token=synthetic` }, /query/],
    [
      { CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL: "https://sessions.example.test" },
      /VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST/,
    ],
  ])("names the invalid setting without its value", (environment, message) => {
    expect(() => configuredSampleOptions(environment)).toThrow(message);
    expect(() => configuredSampleOptions(environment)).not.toThrow(/synthetic/);
  });
});

describe("sampleMiddleware", () => {
  interface FakeRequest {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }

  function call({
    url = SAMPLE_API_PATHS.configuration,
    method = "POST",
    headers = {},
    body = "{}",
  }: FakeRequest = {}) {
    const request = Object.assign(Readable.from([Buffer.from(body)]), {
      url,
      method,
      headers: { host: "127.0.0.1:5175", "content-type": "application/json", ...headers },
    }) as unknown as IncomingMessage;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 0,
      destroyed: false,
      writableEnded: false,
      setHeader: vi.fn(),
      end: vi.fn(),
    });
    const next = vi.fn();
    const done = sampleMiddleware(options(vi.fn()))(
      request,
      response as unknown as ServerResponse,
      next,
    );
    return { done, response, next };
  }

  it("answers the page's own requests", async () => {
    const { done, response, next } = call();
    await done;
    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(String(response.end.mock.calls[0]?.[0]))).toEqual({
      storeDomains: [],
      environments: ["production"],
    });
  });

  it("passes other paths to Vite", async () => {
    const { done, next } = call({ url: "/main.ts", method: "GET" });
    await done;
    expect(next).toHaveBeenCalled();
  });

  it.each([
    ["a GET", { method: "GET" }, 405],
    ["a query string", { url: `${SAMPLE_API_PATHS.configuration}?x=1` }, 405],
    ["another host", { headers: { host: "example.test" } }, 403],
    ["a cross-origin page", { headers: { origin: "https://example.test" } }, 403],
    ["a form post", { headers: { "content-type": "text/plain" } }, 415],
    ["malformed JSON", { body: "{" }, 400],
    ["an oversized body", { body: JSON.stringify({ padding: "x".repeat(64 * 1024) }) }, 413],
  ])("rejects %s", async (_, request, status) => {
    const { done, response } = call(request);
    await done;
    expect(response.statusCode).toBe(status);
  });

  it("reads the largest session request the page can send", async () => {
    // The longest domains, variant IDs, and quantities at the store and line limits.
    const stores = Array.from({ length: MAX_SESSION_STORES }, (_store, index) => ({
      domain: longestDomain(index),
      lines: Array.from({ length: MAX_CART_LINES }, (_line, line) => ({
        variantId: `9${String(line).padStart(19, "0")}`,
        quantity: MAX_LINE_QUANTITY,
      })),
    }));
    const body = JSON.stringify({ environment: "development", countryCode: "US", stores });
    expect(longestDomain(0)).toHaveLength(253);
    expect(body.length).toBeGreaterThan(16 * 1024);

    const { done, response } = call({ url: SAMPLE_API_PATHS.session, body });
    await done;

    // Parsed and validated: the unconfigured development shop is the first failure.
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(String(response.end.mock.calls[0]?.[0]))).toEqual({
      error: "shop_not_allowed",
      stage: "cart",
      domain: longestDomain(0),
    });
  });
});
