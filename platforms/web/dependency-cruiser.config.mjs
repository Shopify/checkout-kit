export default {
  forbidden: [
    {
      name: "component-access-through-exports",
      comment: "The umbrella may use a component package only through its declared entrypoint.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^components/[^/]+/src/(?!(index|register)\\.ts$)" },
    },
    {
      name: "components-do-not-import-the-umbrella",
      severity: "error",
      from: { path: "^components/" },
      to: { path: "^src/" },
    },
    {
      name: "no-circular-runtime-dependencies",
      comment: "Runtime source modules must not participate in circular dependencies.",
      severity: "error",
      from: {},
      to: {
        circular: true,
        viaOnly: { dependencyTypesNot: ["type-only"] },
      },
    },
    {
      name: "all-runtime-source-is-reachable-from-public-entrypoint",
      comment:
        "Production source must be reachable from a package entry (src/index.ts or a component's register.ts) so it is either shipped or deleted.",
      severity: "error",
      from: { path: "^src/(index|shopify-checkout|cdn-loader)\\.ts$" },
      to: {
        reachable: false,
        pathNot: [
          "(?:^|/)package\\.json$",
          "(^|/)node_modules/",
          "^package\\.json$",
          // The entries themselves; a module doesn't count as reachable from itself.
          "^src/(index|shopify-checkout|cdn-loader)\\.ts$",
          // Type-only modules are erased at compile time, so nothing reaches them at runtime.
          "\\.types\\.ts$",
          "\\.d\\.ts$",
          "\\.test\\.ts$",
          "\\.test-helpers\\.ts$",
        ],
      },
    },
    {
      name: "models-do-not-depend-on-component-runtime",
      comment:
        "Protocol-to-public-model adapters stay independent of component lifecycle and presentation.",
      severity: "error",
      from: { path: "^components/shopify-checkout/src/models/" },
      to: {
        path: "^components/shopify-checkout/src/(?!models/)",
      },
    },
  ],
  options: {
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "default"] },
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
