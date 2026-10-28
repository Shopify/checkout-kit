import { existsSync, readdirSync } from "node:fs";

const packageDirectories = ["components", "internal", "internal/core"].flatMap((parent) =>
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
const packageBoundaries = packageDirectories.map((directory) => ({
  name: `${directory.replaceAll("/", "-")}-uses-package-imports`,
  comment:
    "Imports across packages or core modules must use declared package exports, never relative source paths.",
  severity: "error",
  from: { pathNot: `^${directory}/` },
  to: { path: `^${directory}/`, dependencyTypes: ["local"] },
}));

export default {
  forbidden: [
    ...packageBoundaries,
    {
      name: "internal-packages-do-not-import-components",
      severity: "error",
      from: { path: "^internal/" },
      to: { path: "^(components/|src/)" },
    },
    {
      name: "telemetry-does-not-depend-on-checkout",
      comment: "Telemetry is shared infrastructure; checkout depends on it, never the reverse.",
      severity: "error",
      from: { path: "^internal/telemetry/" },
      to: { path: "^internal/(?:core/)?checkout/" },
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
    tsPreCompilationDeps: true,
    // Telemetry owns its test/config project; its runtime still participates in these checks.
    exclude: "^internal/telemetry/(?!src(?:/|$))",
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "default"] },
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
