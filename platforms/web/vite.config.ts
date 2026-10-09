import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

import browserslistToEsbuild from 'browserslist-to-esbuild';
import {defineConfig} from 'vitest/config';
import {dts} from 'rolldown-plugin-dts';

import packageJson from './package.json' with {type: 'json'};

const root = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (...parts: string[]) => resolve(root, ...parts);

export default defineConfig({
  // Generated declarations must not go through the JS transform.
  oxc: {exclude: [/\.js$/, /\.d\.[cm]?ts$/]},
  define: {
    CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
  plugins: [
    // Bundles declarations with Rolldown. Unlike API Extractor it keeps
    // `declare global` augmentations (microsoft/rushstack#1709), so each
    // component's HTMLElementTagNameMap entry ships as written in its types
    // module. Default options; `apply: 'build'` because Vitest shares this
    // config and the plugin needs Rolldown build input.
    ...dts().map((plugin) => ({...plugin, apply: 'build' as const})),
    {
      // `dist/<component>.d.ts` is the declaration file for the component
      // entry (`@shopify/checkout-kit/shopify-checkout`). The entry has no
      // exports of its own, so load the root declarations: a component import
      // alone then brings the tag-name typing.
      name: 'checkout-kit:component-entry-declarations',
      async closeBundle() {
        await writeFile(fromRoot('dist/shopify-checkout.d.ts'), 'import "./index.js";\n\nexport {};\n');
      },
    },
  ],
  build: {
    target: browserslistToEsbuild(),
    sourcemap: true,
    minify: true,
    emptyOutDir: true,
    outDir: fromRoot('dist'),
    lib: {
      entry: {
        index: fromRoot('src/index.ts'),
        'shopify-checkout': fromRoot('src/components/shopify-checkout/register.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Zero runtime dependencies — bundle the npm entries and their dependencies.
      external: [],
      output: {
        chunkFileNames: 'chunks/[name].js',
        minify: {
          compress: true,
          mangle: true,
          codegen: true,
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        // Prevent checkout URLs from being fetched in unit tests.
        settings: {
          disableIframePageLoading: true,
          disableErrorCapturing: true,
        },
      },
    },
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'sample/**/*.test.ts', 'scripts/**/*.test.ts'],
    // Package tests run against the build via pnpm verify.
    exclude: ['**/node_modules/**', 'scripts/*package.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['sample/**', 'src/**/*.test.ts', 'src/**/*.test-helpers.ts', 'src/**/*.d.ts'],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
