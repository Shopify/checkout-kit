import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "../package.json";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
  // Treat `sample/` as the project root so vite serves `index.html` from here.
  root: here,
  resolve: {
    alias: [
      {
        find: /^@shopify\/checkout-kit\/universal$/,
        replacement: resolve(here, "../src/universal.ts"),
      },
      // Exact matching keeps the standard import from swallowing `/universal`.
      { find: /^@shopify\/checkout-kit$/, replacement: resolve(here, "../src/index.ts") },
    ],
  },
  build: {
    outDir: resolve(here, "dist"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(here, "index.html"),
        universal: resolve(here, "universal.html"),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
