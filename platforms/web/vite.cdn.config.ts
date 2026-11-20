import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig, type Plugin } from "vite";

import packageJson from "./package.json" with { type: "json" };
import { injectCdnChunkUrls } from "./scripts/cdn-chunk-urls.ts";
import {
  allCdnComponents,
  cdnComponentsFor,
  resolveCdnChannel,
} from "./scripts/cdn-components.mjs";

// The components built for this channel (cdn-components.json; scripts/build-cdn.mjs runs one
// build per component, then the loader).
const channel = resolveCdnChannel();
const components = cdnComponentsFor(channel);
const allComponentModules = new Set(allCdnComponents().map(({ module }) => module));
const outputDirectory = fileURLToPath(new URL("./dist-cdn/", import.meta.url));

export default defineConfig(({ mode }) => {
  const component = components.find(({ name }) => name === mode);
  if (!component && allCdnComponents().some(({ name }) => name === mode)) {
    throw new Error(`${mode} doesn't ship on the ${channel} CDN channel (cdn-components.json).`);
  }
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
      // A component the loader imports but this channel doesn't build would be bundled into the
      // loader. Gate its loader entry on the channel instead.
      const unbuilt = chunk.dynamicImports.filter(
        (id) => allComponentModules.has(id) && componentPaths[id] === undefined,
      );
      if (unbuilt.length > 0) {
        throw new Error(
          `The CDN loader imports ${unbuilt.join(", ")}, which the ${channel} channel doesn't build.`,
        );
      }
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
        // Every component, built or not, so an unbuilt one can't be bundled into the loader.
        external: component ? [] : [...allComponentModules],
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
