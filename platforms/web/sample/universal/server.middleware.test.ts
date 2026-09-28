import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import { SAMPLE_API_PATHS } from "./policy";
import { universalSampleApiPlugin } from "./server";

type Middleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => Promise<void>;

const roots: string[] = [];

async function configuredMiddleware(hookName: "configureServer" | "configurePreviewServer") {
  const root = mkdtempSync(join(tmpdir(), "checkout-kit-sample-server-"));
  roots.push(root);
  writeFileSync(
    join(root, ".env"),
    [
      "STOREFRONT_DOMAIN=root.myshopify.com",
      "STOREFRONT_ACCESS_TOKEN=synthetic-private-value",
      "CHECKOUT_KIT_UC_SESSION_CREATE_URL=https://shop.app/sessions",
    ].join("\n"),
  );
  writeFileSync(
    join(root, ".env.local"),
    [
      "CHECKOUT_KIT_UC_SHOP_DOMAINS=one.myshopify.com,two.myshopify.com",
      "CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL=https://create.example.test/sessions",
      "VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST=checkout.example.test",
    ].join("\n"),
  );
  const hook = universalSampleApiPlugin(root)[hookName];
  if (typeof hook !== "function") throw new Error("Missing server hook");
  const use = vi.fn<(handler: Middleware) => void>();
  await Reflect.apply(hook, undefined, [{ middlewares: { use } }]);
  return use.mock.calls[0]![0];
}

function configurationRequest(origin = "http://localhost:5173", method = "POST") {
  return Object.assign(Readable.from([Buffer.from("{}")]), {
    url: SAMPLE_API_PATHS.configuration,
    method,
    headers: { host: "localhost:5173", origin, "content-type": "application/json" },
  }) as unknown as IncomingMessage;
}

function response() {
  return {
    destroyed: false,
    writableEnded: false,
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn(),
    once: vi.fn(),
  };
}

describe("Universal sample configuration route", () => {
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it.each(["configureServer", "configurePreviewServer"] as const)(
    "loads shared environment files at %s startup and keeps private settings server-side",
    async (hook) => {
      const middleware = await configuredMiddleware(hook);
      const result = response();
      await middleware(configurationRequest(), result as unknown as ServerResponse, vi.fn());
      expect(result.statusCode).toBe(200);
      expect(result.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
      expect(JSON.parse(result.end.mock.calls[0]![0])).toEqual({
        shopDomains: ["one.myshopify.com", "two.myshopify.com"],
        developmentContinuationHost: "checkout.example.test",
      });
      expect(result.end.mock.calls[0]![0]).not.toContain("synthetic-private-value");
      expect(result.end.mock.calls[0]![0]).not.toContain("create.example.test");
    },
  );

  it("rejects cross-origin and GET configuration requests", async () => {
    const middleware = await configuredMiddleware("configureServer");
    for (const [origin, method, status] of [
      ["https://untrusted.example.test", "POST", 403],
      ["http://localhost:5173", "GET", 405],
    ] as const) {
      const result = response();
      await middleware(
        configurationRequest(origin, method),
        result as unknown as ServerResponse,
        vi.fn(),
      );
      expect(result.statusCode).toBe(status);
      expect(JSON.parse(result.end.mock.calls[0]![0])).toEqual({ error: "invalid_request" });
    }
  });
});
