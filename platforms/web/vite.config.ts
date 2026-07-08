import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

import {defineConfig} from 'vitest/config';
import dts from 'vite-plugin-dts';

const root = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (...parts: string[]) => resolve(root, ...parts);

export default defineConfig({
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
    }),
  ],
  build: {
    target: 'es2022',
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
    include: ['src/**/*.test.ts', 'sample/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
