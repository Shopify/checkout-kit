import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

import browserslistToEsbuild from 'browserslist-to-esbuild';
import {defineConfig} from 'vitest/config';
import dts from 'vite-plugin-dts';

import packageJson from './package.json';
import {appendTagNameMap, createTagNameCollector} from './scripts/tag-name-map';

const root = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (...parts: string[]) => resolve(root, ...parts);

// Restores custom element tag-name typing that API Extractor drops from the
// rolled-up declarations (microsoft/rushstack#1709); see scripts/tag-name-map.ts.
const tagNames = createTagNameCollector();

export default defineConfig({
  define: {
    CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
  plugins: [
    dts({
      entryRoot: fromRoot('src'),
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      outDir: fromRoot('dist'),
      tsconfigPath: fromRoot('tsconfig.json'),
      // TypeScript 6 defaults rootDir to the tsconfig directory; keep declarations rooted at src
      // so the rolled-up dist/index.d.ts entry resolves.
      compilerOptions: { rootDir: fromRoot('src') },
      insertTypesEntry: true,
      rollupTypes: true,
      bundledPackages: ['@shopify/checkout-kit-protocol'],
      beforeWriteFile(filePath, content) {
        tagNames.add(filePath, content);
      },
      async afterBuild() {
        const entry = fromRoot('dist/index.d.ts');
        await writeFile(entry, appendTagNameMap(await readFile(entry, 'utf8'), tagNames.tags));
        // Component entries have no exports of their own and roll up to `export {}`. Load the root
        // declarations so a component import alone brings the tag-name typing.
        await writeFile(fromRoot('dist/shopify-checkout.d.ts'), 'import "./index.js";\n\nexport {};\n');
      },
    }),
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
