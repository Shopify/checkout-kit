export default {
  forbidden: [
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
        "Production source must be reachable from a public entrypoint (the npm entry src/index.ts, a component's register.ts, or the CDN loader src/cdn-loader.ts) so it is either shipped or deleted.",
      severity: "error",
      from: { path: "^src/(index|cdn-loader|components/[^/]+/register)\\.ts$" },
      to: {
        reachable: false,
        pathNot: [
          "(^|/)node_modules/",
          "^package\\.json$",
          // The entries themselves; a module doesn't count as reachable from itself.
          "^src/(index|cdn-loader|components/[^/]+/register)\\.ts$",
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
      from: { path: "^src/models/" },
      to: {
        path: "^src/(?!models/)",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
