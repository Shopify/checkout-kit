import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "../package.json";

const here = dirname(fileURLToPath(import.meta.url));
const { SERVER_HOST, PORT } = process.env;
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

const proxyTarget = readDevNginxProxyTarget();
const serverHost = proxyTarget?.host ?? SERVER_HOST;
const serverPort = proxyTarget?.port ?? Number(PORT || 5173);

export default defineConfig({
  define: {
    CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
  // Treat `sample/` as the project root so vite serves `index.html` from here.
  root: here,
  resolve: {
    // Same entries consumers use from npm. Match the specific subpath first.
    alias: [
      {
        find: "@shopify/checkout-kit/wallets",
        replacement: resolve(here, "../src/wallets-index.ts"),
      },
      {
        find: "@shopify/checkout-kit",
        replacement: resolve(here, "../src/index.ts"),
      },
    ],
  },
  build: {
    outDir: resolve(here, "dist"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        checkout: resolve(here, "index.html"),
        wallets: resolve(here, "wallets.html"),
      },
    },
  },
  server: {
    host: serverHost,
    port: serverPort,
    strictPort: proxyTarget != null,
    open: !serverHost,
    cors: serverHost ? { origin: "*" } : undefined,
    allowedHosts: [
      ...(serverHost ? [".shop.dev", ".shopifycloud.tech", serverHost] : []),
      ...(SERVER_HOST ? [SERVER_HOST] : []),
    ],
  },
});
