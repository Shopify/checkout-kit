import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig, type Plugin } from "vite";

import packageJson from "./package.json" with { type: "json" };
import { injectCdnChunkUrls } from "./scripts/cdn-chunk-urls.ts";

const components = [
  {
    name: "shopify-checkout",
    module: "@shopify/checkout-kit-checkout/register",
  },
  {
    name: "shopify-universal-checkout",
    module: "@shopify/checkout-kit-universal-checkout/register",
  },
  {
    name: "shop-pay",
    module: "@shopify/checkout-kit-shop-pay/register",
  },
];
const outputDirectory = fileURLToPath(new URL("./dist-cdn/", import.meta.url));

export default defineConfig(({ mode }) => {
  const component = components.find(({ name }) => name === mode);
  const componentPaths: Record<string, string> = {};
  if (!component) {
    // Component builds run first; the first one cleans the entire CDN output.
    for (const { name, module } of components) {
      const directory = new URL(`./dist-cdn/assets/${name}/`, import.meta.url);
      const file = readdirSync(directory).find((file) => file.endsWith(".js"));
      if (!file) throw new Error(`Build the ${name} CDN component before the loader.`);
      componentPaths[module] = `./assets/${name}/${file}`;
    }
  }

  const injectCdnChunkUrlPlugin: Plugin = {
    name: "checkout-kit:inject-cdn-chunk-urls",
    renderChunk(code, chunk) {
      if (chunk.name !== "checkout-kit") return null;
      const imports = chunk.dynamicImports.map((id) =>
        (componentPaths[id] ?? id).replace(/^\.\//, ""),
      );
      return { code: injectCdnChunkUrls(code, imports), map: null };
    },
  };

  return {
    define: {
      CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
    },
    plugins: component ? [] : [injectCdnChunkUrlPlugin],
    build: {
      target: browserslistToEsbuild(),
      sourcemap: true,
      minify: true,
      emptyOutDir: component === components[0],
      outDir: outputDirectory,
      lib: {
        entry: component
          ? {
              [component.name]: fileURLToPath(
                new URL(`./components/${component.name}/src/register.ts`, import.meta.url),
              ),
            }
          : { "checkout-kit": fileURLToPath(new URL("./src/cdn-loader.ts", import.meta.url)) },
        formats: ["es"],
        fileName: (_, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        external: component ? [] : components.map(({ module }) => module),
        output: {
          // Each component owns its complete dependency graph. Otherwise an entry
          // retry would still import a shared dependency URL poisoned by a failure.
          codeSplitting: false,
          entryFileNames: component ? "assets/[name]/[hash].js" : "[name].js",
          paths: componentPaths,
          minify: { compress: true, mangle: true, codegen: true },
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
