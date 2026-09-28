import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "../package.json";
import { universalSampleApiPlugin } from "./universal/server";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [universalSampleApiPlugin(resolve(here, "../../.."))],
  // The local configuration route supplies the page's allowlisted runtime fields.
  envDir: false,
  envPrefix: [],
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
    host: "127.0.0.1",
    port: 5173,
    open: true,
  },
  preview: {
    host: "127.0.0.1",
  },
});
