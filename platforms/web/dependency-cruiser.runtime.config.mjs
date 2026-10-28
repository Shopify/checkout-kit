import config from "./dependency-cruiser.config.mjs";

// Reachability must use runtime edges; type references do not ship a module.
export default {
  forbidden: [
    {
      name: "all-runtime-source-is-reachable-from-public-entrypoint",
      comment:
        "Production source must be reachable from a package entry (src/index.ts or a component's register.ts) so it is either shipped or deleted.",
      severity: "error",
      from: {
        path: "^src/(index|shopify-checkout|shopify-universal-checkout|shop-pay|cdn-loader)\\.ts$",
      },
      to: {
        reachable: false,
        pathNot: [
          "(?:^|/)package\\.json$",
          "(^|/)node_modules/",
          "^package\\.json$",
          // The entries themselves; a module doesn't count as reachable from itself.
          "^src/(index|shopify-checkout|shopify-universal-checkout|shop-pay|cdn-loader)\\.ts$",
          // Type-only modules are erased at compile time, so nothing reaches them at runtime.
          "\\.types\\.ts$",
          "^internal/telemetry/src/types\\.ts$",
          "\\.d\\.ts$",
          "\\.test\\.ts$",
          "\\.test-helpers\\.ts$",
          // Dedicated test directories contain fixtures, not shipped runtime source.
          "(^|/)test/",
        ],
      },
    },
  ],
  options: { ...config.options, tsPreCompilationDeps: false },
};
