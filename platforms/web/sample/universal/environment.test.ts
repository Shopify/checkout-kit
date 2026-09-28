import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadSampleEnvironment } from "./environment";

const roots: string[] = [];

function root(): string {
  const path = mkdtempSync(join(tmpdir(), "checkout-kit-sample-env-"));
  roots.push(path);
  return path;
}

describe("Universal sample environment loading", () => {
  afterEach(() => {
    for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true });
  });

  it("reads root .env and .env.local with shared sample precedence and shell fallback", () => {
    const path = root();
    writeFileSync(
      join(path, ".env"),
      [
        "STOREFRONT_DOMAIN=root.myshopify.com",
        "CHECKOUT_KIT_UC_SHOP_DOMAINS=root.myshopify.com",
        "STOREFRONT_ACCESS_TOKEN=synthetic-private-value",
      ].join("\n"),
    );
    writeFileSync(
      join(path, ".env.local"),
      [
        'CHECKOUT_KIT_UC_SHOP_DOMAINS="one.myshopify.com,two.myshopify.com"',
        "CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS=",
      ].join("\n"),
    );

    const environment = loadSampleEnvironment(path, {
      STOREFRONT_DOMAIN: "shell.myshopify.com",
      CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS: "shell.example.test",
      CHECKOUT_KIT_UC_SESSION_CREATE_URL: "https://shop.app/sessions",
      VITE_SECRET: "synthetic-private-value",
    });
    expect(environment).toEqual({
      STOREFRONT_DOMAIN: "root.myshopify.com",
      CHECKOUT_KIT_UC_SHOP_DOMAINS: "one.myshopify.com,two.myshopify.com",
      CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS: "",
      CHECKOUT_KIT_UC_SESSION_CREATE_URL: "https://shop.app/sessions",
    });
    expect(JSON.stringify(environment)).not.toContain("synthetic-private-value");
  });

  it("allows missing files and preserves an explicitly empty initial-shop override", () => {
    const path = root();
    expect(loadSampleEnvironment(path, {})).toEqual({});
    writeFileSync(join(path, ".env.local"), "CHECKOUT_KIT_UC_SHOP_DOMAINS=\n");
    expect(
      loadSampleEnvironment(path, {
        CHECKOUT_KIT_UC_SHOP_DOMAINS: "shell.myshopify.com",
      }),
    ).toEqual({ CHECKOUT_KIT_UC_SHOP_DOMAINS: "" });
  });
});
