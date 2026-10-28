import { describe, expect, it } from "vitest";

import { injectCdnChunkUrls } from "./cdn-chunk-urls";

describe("CDN component chunk URLs", () => {
  it("injects a URL for every component placeholder", () => {
    const loader = [
      "const alpha = CHECKOUT_KIT_SHOPIFY_ALPHA_CHUNK;",
      "const beta = CHECKOUT_KIT_SHOPIFY_BETA_CHUNK;",
    ].join("\n");

    expect(
      injectCdnChunkUrls(loader, [
        "assets/shopify-alpha/abc-def456.js",
        "assets/shopify-beta/ghi_jkl789.js",
      ]),
    ).toBe(
      [
        'const alpha = "./assets/shopify-alpha/abc-def456.js";',
        'const beta = "./assets/shopify-beta/ghi_jkl789.js";',
      ].join("\n"),
    );
  });

  it("fails the build when a component placeholder has no emitted chunk", () => {
    expect(() => injectCdnChunkUrls("const alpha = CHECKOUT_KIT_SHOPIFY_ALPHA_CHUNK;", [])).toThrow(
      "CDN loader has no chunk URL for CHECKOUT_KIT_SHOPIFY_ALPHA_CHUNK. Add a static component registration import with a matching chunk name.",
    );
  });
});
