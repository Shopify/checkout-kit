import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSampleConfiguration } from "./configuration";
import { SAMPLE_API_PATHS } from "./policy";

describe("Universal sample runtime configuration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads only the allowed browser fields without persisting the response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          shopDomains: ["one.myshopify.com", "two.myshopify.com", "one.myshopify.com"],
          developmentContinuationHost: "checkout.example.test",
          STOREFRONT_ACCESS_TOKEN: "synthetic-private-value",
          sessionCreateUrl: "https://create.example.test/sessions",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await loadSampleConfiguration()).toEqual({
      shopDomains: ["one.myshopify.com", "two.myshopify.com"],
      developmentContinuationHost: "checkout.example.test",
    });
    expect(fetcher).toHaveBeenCalledWith(
      SAMPLE_API_PATHS.configuration,
      expect.objectContaining({
        method: "POST",
        body: "{}",
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
  });

  it.each([
    null,
    {},
    { shopDomains: ["https://one.myshopify.com/"] },
    { shopDomains: [123] },
    { shopDomains: [], developmentContinuationHost: "https://checkout.example.test/" },
    { shopDomains: Array.from({ length: 16 }, (_, index) => `shop-${index}.myshopify.com`) },
  ])("rejects malformed configuration without returning its contents", async (value) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(value))));
    await expect(loadSampleConfiguration()).rejects.toThrow("Invalid sample configuration.");
  });

  it("reports an unavailable adapter without showing the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("synthetic-private-value", { status: 503 })),
    );
    await expect(loadSampleConfiguration()).rejects.toThrow("Sample configuration is unavailable.");
  });
});
