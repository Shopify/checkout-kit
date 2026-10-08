import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

import browserslistToEsbuild from 'browserslist-to-esbuild';
import {defineConfig} from 'vitest/config';
import dts from 'vite-plugin-dts';

import packageJson from './package.json';

const root = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (...parts: string[]) => resolve(root, ...parts);

// API Extractor (rollupTypes) drops `declare global` blocks, so the published
// declarations lose the element's tag-name typing. Add it back to the rolled-up
// entry, where `ShopifyCheckout` is declared. Keep in sync with
// src/checkout-web-component.ts.
const tagNameMap = `
declare global {
  interface HTMLElementTagNameMap {
    "shopify-checkout": ShopifyCheckout;
  }
}
`;

async function addTagNameMap() {
  const file = fromRoot('dist/index.d.ts');
  const declarations = await readFile(file, 'utf8');
  if (!/^export declare class ShopifyCheckout\b/m.test(declarations)) {
    throw new Error('dist/index.d.ts no longer declares ShopifyCheckout; update addTagNameMap.');
  }
  if (!declarations.includes('interface HTMLElementTagNameMap')) {
    await writeFile(file, `${declarations.trimEnd()}\n${tagNameMap}`);
  }
}

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
      afterBuild: addTagNameMap,
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
    include: ['src/**/*.test.ts', 'sample/**/*.test.ts'],
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
