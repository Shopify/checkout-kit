import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type ViteDevServer } from "vite";

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

/**
 * Vite plugin that serves `/wallets.js` as a browser-importable ESM
 * module endpoint. Hydrogen (or any cross-origin consumer) loads:
 *
 *   <script type="module" src="https://checkout-kit.shop.dev/wallets.js">
 *
 * The endpoint transforms `src/wallets-index.ts` through Vite's full
 * module pipeline (aliases, HMR, source maps) and returns it as
 * `application/javascript` with CORS headers.
 *
 * The module self-registers `<shopify-accelerated-checkout-buttons>` as
 * a side effect (idempotent). It privately loads the PW runtime from
 * portable-wallets.shop.dev — Hydrogen never sees that URL.
 */
function walletsModuleEndpoint() {
  const WALLETS_ENTRY = resolve(here, "../src/wallets-index.ts");
  return {
    name: "wallets-module-endpoint",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/wallets.js") return next();

        // CORS — this endpoint is the cross-origin delivery boundary.
        const origin = req.headers.origin;
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Vary", "Origin");
        }

        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.setHeader("Access-Control-Max-Age", "86400");
          res.statusCode = 204;
          res.end();
          return;
        }

        // Transform the wallets entry through Vite's module graph.
        server
          .transformRequest(WALLETS_ENTRY)
          .then((result) => {
            if (!result) {
              res.statusCode = 500;
              res.end("Transform failed");
              return undefined;
            }
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            res.end(result.code);
            return undefined;
          })
          .catch((err: Error) => {
            res.statusCode = 500;
            res.end(err.message);
          });
      });
    },
  };
}

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
  plugins: [walletsModuleEndpoint()],
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
    // CORS on all responses so cross-origin module imports resolve
    // their sub-dependencies (/@fs/ paths) from the same server.
    cors: true,
    allowedHosts: [
      ...(devServerHost ? [".shop.dev", ".shopifycloud.tech"] : []),
      ...(SERVER_HOST ? [SERVER_HOST] : []),
      ...(devServerHost ? [devServerHost] : []),
    ].filter(Boolean),
  },
});
