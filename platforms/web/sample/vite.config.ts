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
    alias: {
      // Same entry consumers use from npm (`import '@shopify/checkout-kit'`).
      "@shopify/checkout-kit": resolve(here, "../src/index.ts"),
    },
  },
  build: {
    outDir: resolve(here, "dist"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
