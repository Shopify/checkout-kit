// Verifies the published npm entry points after pnpm build.
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Window } from "happy-dom";
import ts from "typescript";
import { build } from "vite";
import { afterEach, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const rootEntry = "@shopify/checkout-kit";
const componentEntry = "@shopify/checkout-kit/shopify-checkout";
// Each component's npm subpath is its tag name.
const components = [
  { tag: "shopify-checkout", className: "ShopifyCheckout" },
  { tag: "shopify-universal-checkout", className: "ShopifyUniversalCheckout" },
  { tag: "shop-pay", className: "ShopPay" },
] as const;
const siblingsOf = (tag: string) =>
  components.map((component) => component.tag).filter((name) => name !== tag);

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

  const importRoot = `import { ShopifyCheckout } from ${JSON.stringify(rootEntry)};`;
  const importComponent = `import ${JSON.stringify(componentEntry)};`;

  it("exports exactly the supported components and consumer types in the built declarations", () => {
    const entry = join(packageRoot, "dist/index.d.ts");
    const program = ts.createProgram([entry], {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
    });
    const checker = program.getTypeChecker();
    const module = checker.getSymbolAtLocation(program.getSourceFile(entry)!);
    const names = new Set(checker.getExportsOfModule(module!).map((symbol) => symbol.name));
    expect(names).toEqual(
      new Set([
        "ShopPay",
        "ShopPayErrorCode",
        "ShopPayErrorEventEntry",
        "ShopPayEventMap",
        "ShopPayFailure",
        "ShopPayResourceEventEntry",
        "ShopPayResourceStatus",
        "ShopPaySnapshot",
        "ShopifyCheckout",
        "ShopifyCheckoutAppearance",
        "ShopifyCheckoutError",
        "ShopifyCheckoutErrorCode",
        "ShopifyCheckoutEventMap",
        "ShopifyCheckoutLogLevel",
        "ShopifyCheckoutMessageRejectedDetail",
        "ShopifyCheckoutSnapshot",
        "ShopifyCheckoutTarget",
        "ShopifyUniversalCheckout",
        "ShopifyUniversalCheckoutErrorCode",
        "ShopifyUniversalCheckoutErrorEventEntry",
        "ShopifyUniversalCheckoutEventMap",
        "ShopifyUniversalCheckoutFailure",
        "ShopifyUniversalCheckoutResourceEventEntry",
        "ShopifyUniversalCheckoutResourceStatus",
        "ShopifyUniversalCheckoutSnapshot",
      ]),
    );
  });

  it("exports only component constructors at runtime", async () => {
    const { window } = await bundleAndRun(
      `import * as kit from "${rootEntry}"; globalThis.kitExports = Object.keys(kit);`,
    );
    try {
      expect(new Set(window.eval("globalThis.kitExports"))).toEqual(
        new Set(["ShopPay", "ShopifyCheckout", "ShopifyUniversalCheckout"]),
      );
    } finally {
      await window.happyDOM.close();
    }
  });

  it.each([
    {
      name: "component import",
      source: importComponent,
      registered: ["shopify-checkout"],
      root: false,
    },
    {
      name: "root import alone registers nothing",
      source: `${importRoot}\nglobalThis.checkoutClass = ShopifyCheckout;`,
      registered: [],
      root: true,
    },
    {
      name: "root import then register()",
      source: `${importRoot}\nShopifyCheckout.register();`,
      registered: ["shopify-checkout"],
      root: true,
    },
    {
      name: "root import then a custom tag name",
      source: `${importRoot}\nShopifyCheckout.register("acme-checkout");`,
      registered: ["acme-checkout"],
      root: true,
    },
    {
      name: "component import then a custom tag name",
      source: `${importComponent}\n${importRoot}\nShopifyCheckout.register("acme-checkout");`,
      registered: ["shopify-checkout", "acme-checkout"],
      root: true,
    },
    {
      name: "root import followed by component import",
      source: `${importRoot}\n${importComponent}\nShopifyCheckout.register();`,
      registered: ["shopify-checkout"],
      root: true,
    },
  ])("registers after consumer bundling: $name", async ({ source, registered, root }) => {
    const { window, modules } = await bundleAndRun(source);
    try {
      const tags = [...components.map(({ tag }) => tag), "acme-checkout"];
      expect(
        Object.fromEntries(tags.map((tag) => [tag, Boolean(window.customElements.get(tag))])),
      ).toEqual(Object.fromEntries(tags.map((tag) => [tag, registered.includes(tag)])));
      for (const tag of registered) {
        const element = window.document.createElement(tag);
        expect(typeof (element as unknown as { open: unknown }).open).toBe("function");
      }
      // Component consumers must not go through the umbrella entry.
      expect(modules.some((id) => id.endsWith("/dist/index.js"))).toBe(root);
    } finally {
      await window.happyDOM.close();
    }
  });

  it("leaves an existing <shopify-checkout> in place when the component entry loads", async () => {
    // For example a second copy of Checkout Kit, such as the CDN loader alongside a bundle.
    const { window } = await bundleAndRun(
      importComponent,
      'customElements.define("shopify-checkout", class Existing extends HTMLElement {});',
    );
    try {
      expect(window.customElements.get("shopify-checkout")?.name).toBe("Existing");
    } finally {
      await window.happyDOM.close();
    }
  });

  it.each(["shopify-universal-checkout", "shop-pay"])(
    "registers %s without registering its siblings after consumer bundling",
    async (tag) => {
      const { window } = await bundleAndRun(`import "@shopify/checkout-kit/${tag}";`);
      try {
        const element = window.document.createElement(tag);
        for (const sibling of siblingsOf(tag)) {
          expect(window.customElements.get(sibling)).toBeUndefined();
        }
        expect("open" in element && typeof element.open === "function").toBe(true);
        expect("close" in element && typeof element.close === "function").toBe(true);
      } finally {
        await window.happyDOM.close();
      }
    },
  );

  // Bundles `source` as a consumer would, then evaluates it in a fresh window after `prelude`.
  async function bundleAndRun(source: string, prelude = "") {
    const fixture = await createConsumer();
    const entry = join(fixture, "main.js");
    await writeFile(entry, source);

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
    if (prelude) window.eval(prelude);
    for (const bundle of [result].flat()) {
      if (!("output" in bundle)) continue;
      for (const output of bundle.output) {
        if (output.type === "chunk") window.eval(output.code);
      }
    }
    return { window, modules };
  }

  it.each(components)("keeps $tag consumer declarations isolated", async ({ tag, className }) => {
    const fixture = await createConsumer();
    const entry = join(fixture, "main.ts");
    await writeFile(
      entry,
      `
        import '@shopify/checkout-kit/${tag}';
        import type { ${className} } from '@shopify/checkout-kit/${tag}';
        const checkout: ${className} = document.createElement('${tag}');
        checkout.open();
        document.querySelector('${tag}')?.close();

        ${siblingsOf(tag)
          .map(
            (sibling) => `
        // @ts-expect-error Importing one component must not type its sibling's tag.
        document.createElement('${sibling}').open();
        // @ts-expect-error Selector typing must stay isolated too.
        document.querySelector('${sibling}')?.close();`,
          )
          .join("\n")}
      `,
    );
    const compilation = spawnSync(
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
        entry,
      ],
      { encoding: "utf8" },
    );
    expect(compilation.status).toBe(0);
  });
});
