import { describe, expect, it } from "vitest";

import { loadComponents, supportedComponents, version } from "./cdn-loader";
import { CK_VERSION } from "./version";

describe("Checkout Kit CDN loader", () => {
  it("exposes the package version it was built from", () => {
    expect(version).toBe(CK_VERSION);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("lists and loads the embedded checkout component", async () => {
    expect(supportedComponents).toEqual(["shopify-checkout"]);

    await loadComponents(["shopify-checkout"]);
    await loadComponents(["shopify-checkout"]);

    expect(customElements.get("shopify-checkout")).toBeDefined();
  });

  it("resolves when the component is already registered", async () => {
    expect(customElements.get("shopify-checkout")).toBeDefined();

    await expect(loadComponents(["shopify-checkout"])).resolves.toBeUndefined();
  });

  it("rejects an empty list rather than loading nothing or everything", async () => {
    await expect(loadComponents([])).rejects.toThrow(
      "loadComponents() requires at least one component name.",
    );
  });

  it("accepts repeated names in one call", async () => {
    await expect(loadComponents(["shopify-checkout", "shopify-checkout"])).resolves.toBeUndefined();
  });

  it("rejects the whole call when any name is unsupported", async () => {
    await expect(loadComponents(["shopify-checkout", "wallets"])).rejects.toThrow(
      "Unsupported Checkout Kit component: wallets",
    );
  });

  it.each(["wallets", "constructor", "__proto__", "toString", ""])(
    "rejects unsupported component name %j",
    async (name) => {
      await expect(loadComponents([name])).rejects.toThrow(
        `Unsupported Checkout Kit component: ${name}`,
      );
    },
  );
});
