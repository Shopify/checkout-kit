// Verifies the published npm entry points after pnpm build.
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Window } from "happy-dom";
import { build } from "vite";
import { afterEach, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const rootEntry = "@shopify/checkout-kit";
const componentEntry = "@shopify/checkout-kit/shopify-checkout";

describe("npm component entry points", () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function createConsumer(): Promise<string> {
    const fixture = await mkdtemp(join(tmpdir(), "checkout-kit-consumer-"));
    fixtures.push(fixture);
    const packageDir = join(fixture, "node_modules/@shopify/checkout-kit");
    await mkdir(packageDir, { recursive: true });
    await cp(join(packageRoot, "package.json"), join(packageDir, "package.json"));
    await cp(join(packageRoot, "dist"), join(packageDir, "dist"), { recursive: true });
    return fixture;
  }

  it.each([
    { name: "component subpath", entries: [componentEntry] },
    { name: "legacy root", entries: [rootEntry] },
    { name: "component followed by root", entries: [componentEntry, rootEntry] },
    { name: "root followed by component", entries: [rootEntry, componentEntry] },
  ])("preserves registration after consumer bundling: $name", async ({ entries }) => {
    const fixture = await createConsumer();
    const entry = join(fixture, "main.js");
    await writeFile(
      entry,
      entries.map((specifier) => `import ${JSON.stringify(specifier)};`).join("\n"),
    );

    const modules: string[] = [];
    const result = await build({
      plugins: [
        {
          name: "record-consumer-modules",
          moduleParsed(module) {
            modules.push(module.id);
          },
        },
      ],
      configFile: false,
      root: fixture,
      logLevel: "silent",
      build: {
        write: false,
        lib: { entry, formats: ["iife"], name: "Consumer" },
      },
    });

    const window = new Window({
      settings: {
        enableJavaScriptEvaluation: true,
        suppressInsecureJavaScriptEnvironmentWarning: true,
      },
    });
    try {
      for (const bundle of [result].flat()) {
        if (!("output" in bundle)) continue;
        for (const output of bundle.output) {
          if (output.type !== "chunk") continue;
          window.eval(output.code);
        }
      }
      expect(window.customElements.get("shopify-checkout")).toBeDefined();
      const element = window.document.createElement("shopify-checkout");
      expect(typeof (element as unknown as { open: unknown }).open).toBe("function");
      // Component consumers must not go through the umbrella entry.
      expect(modules.some((id) => id.endsWith("/dist/index.js"))).toBe(entries.includes(rootEntry));
    } finally {
      await window.happyDOM.close();
    }
  });

  it("resolves the component import and public types in a TypeScript consumer", async () => {
    const fixture = await createConsumer();
    const entry = join(fixture, "main.ts");
    await writeFile(
      entry,
      `
      import '${componentEntry}';
      import type { ShopifyCheckout } from '${rootEntry}';
      const checkout = document.createElement('shopify-checkout') as ShopifyCheckout;
      checkout.open();
    `,
    );
    expect(() =>
      execFileSync(
        process.execPath,
        [
          fileURLToPath(import.meta.resolve("typescript/bin/tsc")),
          "--noEmit",
          "--strict",
          "--noUncheckedSideEffectImports",
          "--module",
          "ESNext",
          "--moduleResolution",
          "Bundler",
          "--target",
          "ES2022",
          "--skipLibCheck",
          entry,
        ],
        { stdio: "pipe" },
      ),
    ).not.toThrow();
  });
});
