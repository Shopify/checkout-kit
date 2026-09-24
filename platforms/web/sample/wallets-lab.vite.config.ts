import { mergeConfig } from "vite";

import sampleConfig from "./vite.config";

/**
 * Runs the deterministic wallet lab beside the integrated Checkout Kit server.
 * It deliberately avoids checkout-kit.shop.dev, which Hydrogen reserves for
 * the browser-importable /wallets.js runtime.
 */
const walletsLabConfig = mergeConfig(sampleConfig, {
  server: {
    host: "127.0.0.1",
    port: 4178,
    strictPort: true,
    open: "/wallets.html",
    cors: false,
  },
});

export default {
  ...walletsLabConfig,
  server: {
    ...walletsLabConfig.server,
    // Vite merges configuration arrays, but this isolated server must not
    // inherit the base sample's proxy host allowlist.
    allowedHosts: ["127.0.0.1", "localhost"],
  },
};
