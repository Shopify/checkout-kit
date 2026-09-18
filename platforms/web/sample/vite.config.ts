import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "../package.json";

const here = dirname(fileURLToPath(import.meta.url));

const { SERVER_HOST, PORT } = process.env;

/**
 * The dev proxy URL (checkout-kit.shop.dev) is a shared dev proxy that
 * forwards to whichever worktree last ran `dev server`. Dev exposes no
 * env var for that target, so we read the host and port it forwards to
 * from the generated nginx vhost and bind Vite to them — keeping
 * shop.dev pointed at the running server in both roots and worktrees.
 *
 * The proxy terminates TLS and forwards plain HTTP, so the sample server
 * stays HTTP. Serving HTTPS here fails the upstream handshake and the
 * proxied URL answers 502.
 */
const DEV_NGINX_CONFIG_PATH = "/opt/nginx/etc/projects/checkout-kit/nginx.conf";

function readDevNginxProxyTarget(): { host: string; port: number } | undefined {
  try {
    const config = readFileSync(DEV_NGINX_CONFIG_PATH, "utf8");
    const [, host, port] = config.match(/proxy_pass\s+http:\/\/([^/:;\s]+):(\d+);/) ?? [];
    return host && port ? { host, port: Number(port) } : undefined;
  } catch {
    return undefined;
  }
}

const devServerProxyTarget = readDevNginxProxyTarget();
const devServerHost = devServerProxyTarget?.host ?? SERVER_HOST;
const devServerPort = devServerProxyTarget?.port ?? Number(PORT || 5173);
const devServerStrictPort = devServerProxyTarget != null;

export default defineConfig({
  define: {
    CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
  // Treat `sample/` as the project root so vite serves `index.html` from here.
  root: here,
  resolve: {
    alias: {
      // Same entry consumers use from npm (`import '@shopify/checkout-kit'`).
      "@shopify/checkout-kit/wallets": resolve(here, "../src/wallets-index.ts"),
      "@shopify/checkout-kit": resolve(here, "../src/index.ts"),
    },
  },
  build: {
    outDir: resolve(here, "dist"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(here, "index.html"),
        wallets: resolve(here, "wallets.html"),
      },
    },
  },
  server: {
    host: devServerHost,
    port: devServerPort,
    strictPort: devServerStrictPort,
    open: !devServerHost,
    cors: devServerHost ? { origin: "*" } : undefined,
    allowedHosts: [
      ...(devServerHost ? [".shop.dev", ".shopifycloud.tech"] : []),
      ...(SERVER_HOST ? [SERVER_HOST] : []),
      ...(devServerHost ? [devServerHost] : []),
    ].filter(Boolean),
  },
});
