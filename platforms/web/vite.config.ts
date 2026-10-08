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
      insertTypesEntry: true,
      rollupTypes: true,
      bundledPackages: ['@shopify/checkout-kit-protocol'],
      beforeWriteFile(filePath, content) {
        tagNames.add(filePath, content);
      },
      async afterBuild() {
        const entry = fromRoot('dist/index.d.ts');
        await writeFile(entry, appendTagNameMap(await readFile(entry, 'utf8'), tagNames.tags));
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
      entry: fromRoot('src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Zero runtime deps — bundle everything reachable from src/index.ts.
      external: [],
      output: {
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
