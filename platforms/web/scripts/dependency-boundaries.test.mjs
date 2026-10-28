import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const platform = fileURLToPath(new URL("../", import.meta.url));
const declarations = "export const value = 1; export type Value = number;\n";

test("Web dependency boundaries", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "checkout-kit-web-boundaries-"));
  const write = (path, contents) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  };
  const workspace = (directory, name, exports) => {
    write(`${directory}/package.json`, JSON.stringify({ name, type: "module", exports }));
    mkdirSync(join(root, "node_modules/@shopify"), { recursive: true });
    symlinkSync(join(root, directory), join(root, "node_modules", name), "dir");
  };
  const cases = [
    ["umbrella uses component exports", "src/component.ts", "@shopify/checkout-kit-checkout", []],
    [
      "sibling uses component exports",
      "components/example/src/component.ts",
      "@shopify/checkout-kit-checkout",
      [],
    ],
    [
      "component uses its own implementation",
      "components/shopify-checkout/src/local.ts",
      "./implementation",
      [],
    ],
    [
      "sibling cannot reach component implementation",
      "components/example/src/private.ts",
      "../../shopify-checkout/src/implementation",
      ["components-shopify-checkout-uses-package-imports"],
    ],
    [
      "sibling cannot bypass exports with a relative entrypoint",
      "components/example/src/relative-entry.ts",
      "../../shopify-checkout/src/index",
      ["components-shopify-checkout-uses-package-imports"],
    ],
    [
      "new components receive their own implementation boundary",
      "components/shopify-checkout/src/other.ts",
      "../../example/src/implementation",
      ["components-example-uses-package-imports"],
    ],
    [
      "component uses shared core exports",
      "components/example/src/core.ts",
      "@shopify/checkout-kit-core/checkout",
      [],
    ],
    [
      "core uses telemetry exports",
      "internal/core/checkout/src/telemetry.ts",
      "@shopify/checkout-kit-telemetry",
      [],
    ],
    [
      "telemetry uses protocol exports",
      "internal/telemetry/src/protocol.ts",
      "@shopify/checkout-kit-protocol",
      [],
    ],
    [
      "telemetry cannot depend on checkout core",
      "internal/telemetry/src/checkout.ts",
      "@shopify/checkout-kit-core/checkout",
      ["telemetry-does-not-depend-on-checkout"],
    ],
    [
      "telemetry cannot depend on components",
      "internal/telemetry/src/component.ts",
      "@shopify/checkout-kit-checkout",
      ["internal-packages-do-not-import-components"],
    ],
    [
      "component cannot import umbrella",
      "components/example/src/umbrella.ts",
      "../../../src/public",
      ["components-do-not-import-the-umbrella"],
    ],
    [
      "type-only imports respect component boundaries",
      "components/example/src/private-type.ts",
      "../../shopify-checkout/src/implementation",
      ["components-shopify-checkout-uses-package-imports"],
      true,
    ],
    [
      "type-only imports respect telemetry direction",
      "internal/telemetry/src/checkout-type.ts",
      "@shopify/checkout-kit-core/checkout",
      ["telemetry-does-not-depend-on-checkout"],
      true,
    ],
  ];

  try {
    // Copy the real configuration so package discovery runs against the fixture.
    copyFileSync(
      join(platform, "dependency-cruiser.config.mjs"),
      join(root, "dependency-cruiser.config.mjs"),
    );
    write(
      "tsconfig.json",
      JSON.stringify({ compilerOptions: { module: "ESNext", moduleResolution: "bundler" } }),
    );
    workspace("components/shopify-checkout", "@shopify/checkout-kit-checkout", {
      ".": "./src/index.ts",
      "./register": "./src/register.ts",
    });
    workspace("components/example", "@shopify/example", { ".": "./src/index.ts" });
    workspace("internal/core", "@shopify/checkout-kit-core", {
      "./checkout": "./checkout/src/index.ts",
    });
    workspace("internal/telemetry", "@shopify/checkout-kit-telemetry", { ".": "./src/index.ts" });
    workspace("protocol", "@shopify/checkout-kit-protocol", { ".": "./src/index.ts" });
    for (const path of [
      "src/public.ts",
      "components/shopify-checkout/src/index.ts",
      "components/shopify-checkout/src/register.ts",
      "components/shopify-checkout/src/implementation.ts",
      "components/example/src/index.ts",
      "components/example/src/implementation.ts",
      "internal/core/checkout/src/index.ts",
      "internal/telemetry/src/index.ts",
      "protocol/src/index.ts",
    ])
      write(path, declarations);
    for (const [, path, specifier, , typeOnly] of cases) {
      write(
        path,
        `export ${typeOnly ? "type {Value}" : "{value}"} from ${JSON.stringify(specifier)};\n`,
      );
    }
    const cruise = spawnSync(
      process.execPath,
      [
        join(platform, "node_modules/dependency-cruiser/bin/dependency-cruise.mjs"),
        "--config",
        "dependency-cruiser.config.mjs",
        "--output-type",
        "json",
        ...cases.map(([, path]) => path),
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(cruise.status, 0, cruise.stderr);
    const result = JSON.parse(cruise.stdout);
    for (const [name, path, , expected] of cases) {
      await t.test(name, () => {
        const module = result.modules.find((entry) => entry.source === path);
        assert.ok(module, `Missing fixture module ${path}`);
        assert.equal(module.dependencies.length, 1);
        assert.equal(
          module.dependencies[0].couldNotResolve,
          false,
          `Unresolved fixture import in ${path}`,
        );
        assert.deepEqual(
          result.summary.violations
            .filter((violation) => violation.from === path)
            .map((violation) => violation.rule.name)
            .toSorted(),
          expected.toSorted(),
        );
      });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Web runtime reachability scans telemetry and ignores type-only paths", () => {
  const root = mkdtempSync(join(tmpdir(), "checkout-kit-web-reachability-"));
  try {
    for (const directory of ["src", "components", "internal/core", "internal/telemetry/src"])
      mkdirSync(join(root, directory), { recursive: true });
    for (const config of ["dependency-cruiser.config.mjs", "dependency-cruiser.runtime.config.mjs"])
      copyFileSync(join(platform, config), join(root, config));
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { module: "ESNext", moduleResolution: "bundler" } }),
    );
    writeFileSync(
      join(root, "src/index.ts"),
      'export type {Value} from "./type-referenced"; export {value} from "./runtime-referenced"; export {telemetryValue} from "../internal/telemetry/src/index";\n',
    );
    writeFileSync(
      join(root, "src/type-referenced.ts"),
      'export {value} from "./unshipped"; export type Value = number;\n',
    );
    writeFileSync(join(root, "src/unshipped.ts"), declarations);
    writeFileSync(join(root, "src/runtime-referenced.ts"), declarations);
    writeFileSync(
      join(root, "internal/telemetry/src/index.ts"),
      'export const telemetryValue = 1; export type {Value} from "./types";\n',
    );
    writeFileSync(join(root, "internal/telemetry/src/types.ts"), "export type Value = number;\n");
    writeFileSync(join(root, "internal/telemetry/src/unshipped.ts"), declarations);
    const cruise = spawnSync(
      process.execPath,
      [
        join(platform, "node_modules/dependency-cruiser/bin/dependency-cruise.mjs"),
        "--config",
        "dependency-cruiser.runtime.config.mjs",
        "--output-type",
        "json",
        "src",
        "components",
        "internal",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(cruise.status, 0, cruise.stderr);
    const result = JSON.parse(cruise.stdout);
    assert.equal(
      result.modules.find((entry) => entry.source === "src/index.ts").dependencies.length,
      2,
    );
    assert.ok(result.modules.some((entry) => entry.source === "internal/telemetry/src/types.ts"));
    assert.deepEqual(
      result.summary.violations.map(({ from, rule }) => [from, rule.name]).toSorted(),
      [
        [
          "internal/telemetry/src/unshipped.ts",
          "all-runtime-source-is-reachable-from-public-entrypoint",
        ],
        ["src/type-referenced.ts", "all-runtime-source-is-reachable-from-public-entrypoint"],
        ["src/unshipped.ts", "all-runtime-source-is-reachable-from-public-entrypoint"],
      ],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
