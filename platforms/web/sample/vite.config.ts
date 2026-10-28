import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "../package.json";
import { universalSessionSampleApiPlugin } from "./universal-session/server";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const useCdn = mode === "cdn";

  return {
    define: {
      CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
      "import.meta.env.VITE_CK_TELEMETRY": JSON.stringify(
        process.env.VITE_CK_TELEMETRY === "production" ? "production" : "",
      ),
    },
    // Treat `sample/` as the project root so Vite serves `index.html` from here.
    root: here,
    envDir: false,
    envPrefix: [],
    plugins: [universalSessionSampleApiPlugin(resolve(here, "universal-session"))],
    resolve: {
      alias: [
        {
          find: "@shopify/checkout-kit/shopify-checkout",
          replacement: resolve(here, "../src/shopify-checkout.ts"),
        },
        {
          find: "@shopify/checkout-kit/shopify-universal-checkout",
          replacement: resolve(here, "../src/shopify-universal-checkout.ts"),
        },
        {
          find: "@shopify/checkout-kit/shop-pay",
          replacement: resolve(here, "../src/shop-pay.ts"),
        },
        { find: /^@shopify\/checkout-kit$/, replacement: resolve(here, "../src/index.ts") },
      ],
    },
    build: {
      outDir: resolve(here, useCdn ? "dist-cdn" : "dist"),
      emptyOutDir: true,
      target: "es2022",
      sourcemap: true,
      rollupOptions: {
        input: {
          checkout: resolve(here, "index.html"),
          universal: resolve(here, "universal-checkout/index.html"),
          shopPay: resolve(here, "shop-pay/index.html"),
        },
      },
    },
    server: {
      port: 5173,
      open: true,
    },
  };
});
