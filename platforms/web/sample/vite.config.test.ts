// @vitest-environment node
import { fileURLToPath } from "node:url";
import { createServer, type ViteDevServer } from "vite";
import { afterEach, expect, it, vi } from "vitest";

const servers: ViteDevServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([undefined, "console", "production"])(
  "honors telemetry mode %s without exposing other environment values",
  async (mode) => {
    vi.stubEnv("VITE_CK_TELEMETRY", mode);
    vi.stubEnv("VITE_SECRET", "synthetic-private-value");
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const server = await createServer({
      configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
      server: { middlewareMode: true, hmr: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    servers.push(server);
    const { createTelemetry } = await server.ssrLoadModule(
      "@shopify/checkout-kit-core/checkout/telemetry",
    );
    const client = createTelemetry();
    client.recordNavigationRetry({ reason: "timeout", result: "started" });
    await client.flush();
    await client.shutdown();

    expect(fetch).toHaveBeenCalledTimes(mode === "production" ? 1 : 0);
    expect(log).toHaveBeenCalledTimes(mode === "production" ? 0 : 1);
    expect(server.config.env).not.toHaveProperty("VITE_SECRET");
    expect(JSON.stringify(server.config.define)).not.toContain("synthetic-private-value");
  },
);
