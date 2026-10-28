import { describe, expect, it, vi } from "vitest";

import { SAMPLE_API_PATHS, type SessionRequest } from "./api";
import {
  describeSessionFailure,
  loadSampleConfiguration,
  loadSampleCurrency,
  requestUniversalSession,
} from "./session-client";

const REQUEST: SessionRequest = {
  environment: "production",
  stores: [{ domain: "your-store.myshopify.com", lines: [{ variantId: "123", quantity: 1 }] }],
};
const CONTINUE_URL = "https://shop.app/checkouts/uc/session-1?key=synthetic-key";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("loadSampleConfiguration", () => {
  it("posts to the local server and returns the allowed fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      json({
        storefrontDomain: "your-store.myshopify.com",
        storeDomains: ["your-store.myshopify.com", "another.myshopify.com"],
        environments: ["production", "production"],
      }),
    );

    expect(await loadSampleConfiguration(fetcher)).toEqual({
      storefrontDomain: "your-store.myshopify.com",
      storeDomains: ["your-store.myshopify.com", "another.myshopify.com"],
      environments: ["production"],
    });
    expect(fetcher).toHaveBeenCalledWith(
      SAMPLE_API_PATHS.configuration,
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it.each([
    ["an error status", json({}, 503), "Sample configuration is unavailable."],
    [
      "unknown environments",
      json({ environments: ["staging"], storeDomains: [] }),
      "Invalid sample configuration.",
    ],
    [
      "a storefront URL",
      json({ storefrontDomain: "https://example.test", storeDomains: [], environments: [] }),
      "Invalid sample configuration.",
    ],
    ["missing storeDomains", json({ environments: [] }), "Invalid sample configuration."],
    [
      "invalid storeDomains",
      json({ storeDomains: ["https://example.test"], environments: [] }),
      "Invalid sample configuration.",
    ],
  ])("rejects %s", async (_, response, message) => {
    await expect(
      loadSampleConfiguration(vi.fn<typeof fetch>().mockResolvedValue(response)),
    ).rejects.toThrow(message);
  });
});

describe("requestUniversalSession", () => {
  it("returns the prepared session", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ continueUrl: CONTINUE_URL, currencyCode: "CAD" }));

    expect(await requestUniversalSession(REQUEST, { fetcher })).toEqual({
      ok: true,
      continueUrl: CONTINUE_URL,
      currencyCode: "CAD",
    });
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(REQUEST);
  });

  it("returns a known failure and its stage", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ error: "session_ineligible", stage: "session" }, 422));

    expect(await requestUniversalSession(REQUEST, { fetcher })).toEqual({
      ok: false,
      code: "session_ineligible",
      stage: "session",
    });
  });

  it("returns a failure with the failing domain", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json({ error: "shop_not_allowed", stage: "cart", domain: "example.test" }, 403),
      );

    expect(await requestUniversalSession(REQUEST, { fetcher })).toEqual({
      ok: false,
      code: "shop_not_allowed",
      stage: "cart",
      domain: "example.test",
    });
  });

  it("returns a currency mismatch with all store currencies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      json(
        {
          error: "currency_mismatch",
          stage: "cart",
          currencies: [
            { domain: "a.myshopify.com", currencyCode: "USD" },
            { domain: "b.myshopify.com", currencyCode: "CAD" },
          ],
        },
        422,
      ),
    );

    expect(await requestUniversalSession(REQUEST, { fetcher })).toEqual({
      ok: false,
      code: "currency_mismatch",
      stage: "cart",
      currencies: [
        { domain: "a.myshopify.com", currencyCode: "USD" },
        { domain: "b.myshopify.com", currencyCode: "CAD" },
      ],
    });
  });

  it("does not pass through unknown failure codes", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ error: "synthetic message", stage: "elsewhere" }, 500));

    expect(await requestUniversalSession(REQUEST, { fetcher })).toEqual({
      ok: false,
      code: "upstream_invalid_response",
    });
  });

  it("reports a missing local server", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    expect(await requestUniversalSession(REQUEST, { fetcher })).toEqual({
      ok: false,
      code: "server_unavailable",
    });
  });
});

describe("loadSampleCurrency", () => {
  it("returns the currency code for a storefront", async () => {
    global.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ currencyCode: "USD" })) as typeof fetch;

    expect(
      await loadSampleCurrency(
        { environment: "production", domain: "your-store.myshopify.com" },
        AbortSignal.timeout(1000),
      ),
    ).toBe("USD");
  });

  it("rejects on a server error", async () => {
    global.fetch = vi.fn<typeof fetch>().mockResolvedValue(json({}, 503)) as typeof fetch;

    await expect(
      loadSampleCurrency({ environment: "production", domain: "example.test" }),
    ).rejects.toThrow("Currency preview failed");
  });

  it("rejects on an invalid response", async () => {
    global.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ currencyCode: 42 })) as typeof fetch;

    await expect(
      loadSampleCurrency({ environment: "production", domain: "example.test" }),
    ).rejects.toThrow("Invalid currency response");
  });
});

describe("describeSessionFailure", () => {
  it("names the step that failed", () => {
    expect(
      describeSessionFailure({ ok: false, code: "rate_limited", stage: "session" }, "production"),
    ).toMatch(/^The session service/);
    expect(
      describeSessionFailure({ ok: false, code: "rate_limited", stage: "cart" }, "production"),
    ).toMatch(/^The storefront/);
  });

  it("names the settings for the selected environment", () => {
    expect(
      describeSessionFailure({ ok: false, code: "configuration_required" }, "production"),
    ).toContain("CHECKOUT_KIT_UC_SESSION_CREATE_URL");
    expect(
      describeSessionFailure({ ok: false, code: "configuration_required" }, "development"),
    ).toContain("CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL");
  });

  it("describes currency mismatches with store domains and codes", () => {
    const message = describeSessionFailure(
      {
        ok: false,
        code: "currency_mismatch",
        currencies: [
          { domain: "a.myshopify.com", currencyCode: "USD" },
          { domain: "b.myshopify.com", currencyCode: "CAD" },
        ],
      },
      "production",
    );
    expect(message).toContain("a.myshopify.com: USD");
    expect(message).toContain("b.myshopify.com: CAD");
  });

  it("includes the failing domain when present", () => {
    expect(
      describeSessionFailure(
        { ok: false, code: "shop_not_allowed", domain: "example.test" },
        "production",
      ),
    ).toContain("(example.test)");
  });
});
