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
 * env var for that target, so we read it from the generated nginx vhost
 * and bind Vite to it — keeping shop.dev pointed at the running server
 * in both roots and worktrees.
 */
const DEV_NGINX_CONFIG_PATH = "/opt/nginx/etc/projects/checkout-kit/nginx.conf";

function readDevNginxProxyHost(): string | undefined {
  try {
    const config = readFileSync(DEV_NGINX_CONFIG_PATH, "utf8");
    return config.match(/proxy_pass\s+http:\/\/([^/:;\s]+):\d+;/)?.[1];
  } catch {
    return undefined;
  }
}

const devServerProxyHost = readDevNginxProxyHost();
const devServerHost = devServerProxyHost ?? SERVER_HOST;
const devServerStrictPort = devServerProxyHost != null;

/**
 * Read the dev SSL certificates so the sample server can serve HTTPS
 * locally behind the shop.dev proxy.
 */
function readDevHttpsConfig(): { key: Buffer; cert: Buffer } | undefined {
  try {
    return {
      key: readFileSync(
        resolve(process.env.HOME ?? "~", ".local/share/dev/ssl/shop.dev/star.shop.dev.key"),
      ),
      cert: readFileSync(
        resolve(process.env.HOME ?? "~", ".local/share/dev/ssl/shop.dev/combined.cer"),
      ),
    };
  } catch {
    return undefined;
  }
}

const httpsConfig = devServerHost ? readDevHttpsConfig() : undefined;

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
    port: Number(PORT || 5173),
    strictPort: devServerStrictPort,
    open: !devServerHost,
    https: httpsConfig,
    cors: devServerHost ? { origin: "*" } : undefined,
    allowedHosts: [
      ...(devServerHost ? [".shop.dev", ".shopifycloud.tech"] : []),
      ...(SERVER_HOST ? [SERVER_HOST] : []),
      ...(devServerHost ? [devServerHost] : []),
    ].filter(Boolean),
  },
});
