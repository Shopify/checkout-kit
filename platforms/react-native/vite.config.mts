import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import babel from '@rolldown/plugin-babel';
import {esmExternalRequirePlugin} from 'rolldown/plugins';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';
import manifest from './package.json' with {type: 'json'};

const root = fileURLToPath(new URL('.', import.meta.url));
const privatePackages = Object.entries(manifest.devDependencies)
  .filter(
    ([name, version]) =>
      version === 'workspace:*' && !manifest.bundledDependencies.includes(name),
  )
  .map(([name]) => name);

export default defineConfig(async () => ({
  plugins: [
    {
      // Generate Fabric view configs before Vite strips the spec types. Both
      // outputs then contain executable JS; raw specs ship for native codegen.
      ...(await babel({
        include: /\/internal\/core\/src\/specs\/.*\.ts$/,
        presets: [
          [
            'module:@react-native/babel-preset',
            {disableImportExportTransform: true},
          ],
        ],
      })),
      enforce: 'pre',
    },
    dts({
      tsconfigPath: resolve(root, 'tsconfig.build.json'),
      rollupTypes: true,
      bundledPackages: privatePackages,
    }),
  ],
  build: {
    outDir: 'lib',
    emptyOutDir: true,
    // Metro applies the app's target and optimization settings afterwards.
    target: 'esnext',
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(root, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rolldownOptions: {
      output: {
        // Keep source locations without embedding TypeScript in both maps.
        // Original-source debugging requires the matching sources separately.
        sourcemapExcludeSources: true,
      },
      // Keep Babel's native-runtime requires statically discoverable by Metro
      // in the ESM output, rather than wrapping them in dynamic require helpers.
      plugins: [
        esmExternalRequirePlugin({external: [/^(react|react-native)(\/|$)/]}),
      ],
    },
  },
}));
