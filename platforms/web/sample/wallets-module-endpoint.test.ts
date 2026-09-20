import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "../src");

describe("wallets module endpoint (/wallets.js)", () => {
  it("vite.config.ts registers the walletsModuleEndpoint plugin serving /wallets.js", () => {
    const config = readFileSync(resolve(here, "vite.config.ts"), "utf8");
    expect(config).toContain("walletsModuleEndpoint");
    expect(config).toContain('req.url !== "/wallets.js"');
  });

  it("vite.config.ts enables CORS on all responses for cross-origin /@fs resolution", () => {
    const config = readFileSync(resolve(here, "vite.config.ts"), "utf8");
    expect(config).toContain("cors: true");
  });

  it("the /wallets.js endpoint sets CORS and Content-Type headers explicitly", () => {
    const config = readFileSync(resolve(here, "vite.config.ts"), "utf8");
    expect(config).toContain("Access-Control-Allow-Origin");
    expect(config).toContain("application/javascript");
  });

  it("the wallets entry self-registers idempotently", () => {
    const src = readFileSync(resolve(srcDir, "wallets-web-component.ts"), "utf8");
    expect(src).toContain('customElements.get("shopify-accelerated-checkout-buttons")');
    expect(src).toContain("customElements.define");
  });

  it("the PW bridge URL is a private constant loaded via dynamic import", () => {
    const src = readFileSync(resolve(srcDir, "wallets-pw-loader.ts"), "utf8");
    expect(src).toContain("import(");
    expect(src).toContain("portable-wallets.shop.dev");
  });
});
