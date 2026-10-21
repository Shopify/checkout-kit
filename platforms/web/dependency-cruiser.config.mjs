import { existsSync, readdirSync } from "node:fs";

const packageDirectories = ["internal", "internal/core"].flatMap((parent) =>
  readdirSync(new URL(`./${parent}/`, import.meta.url), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (existsSync(new URL(`./${parent}/${entry.name}/package.json`, import.meta.url)) ||
          (parent === "internal/core" &&
            existsSync(new URL(`./${parent}/${entry.name}/src/`, import.meta.url)))),
    )
    .map((entry) => `${parent}/${entry.name}`),
);
const internalPackageBoundaries = packageDirectories.map((directory) => ({
  name: `${directory.replaceAll("/", "-")}-uses-package-imports`,
  comment:
    "Imports across packages or core modules must use declared package exports, never relative source paths.",
  severity: "error",
  from: { pathNot: `^${directory}/` },
  to: { path: `^${directory}/`, dependencyTypes: ["local"] },
}));

export default {
  forbidden: [
    ...internalPackageBoundaries,
    {
      name: "internal-packages-do-not-import-components",
      severity: "error",
      from: { path: "^internal/" },
      to: { path: "^(components/|src/)" },
    },
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
      from: { path: "^internal/(?:core/)?checkout/src/models/" },
      to: {
        path: "^(components/|src/)",
      },
    },
  ],
  options: {
    // Telemetry owns its test/config project; its runtime still participates in these checks.
    exclude: "^internal/telemetry/(?!src/)",
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "default"] },
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
