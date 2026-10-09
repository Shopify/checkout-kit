import {fileURLToPath} from 'node:url';

import browserslistToEsbuild from 'browserslist-to-esbuild';
import {defineConfig, type Plugin} from 'vite';

import packageJson from './package.json';

// Failed imports need a fresh URL on retry. Inject the component chunk's
// hashed filename once the bundler has resolved the chunk graph.
function injectCdnChunkUrls(): Plugin {
  return {
    name: 'checkout-kit:inject-cdn-chunk-urls',
    renderChunk(code, chunk) {
      if (chunk.name !== 'web-components') return null;
      const target = chunk.dynamicImports.find((file) => /(^|\/)shopify-checkout-/.test(file));
      if (!target) {
        this.error('CDN loader does not dynamically import the shopify-checkout chunk.');
      }
      return {
        code: code.replaceAll('CHECKOUT_KIT_SHOPIFY_CHECKOUT_CHUNK', JSON.stringify(`./${target}`)),
        map: null,
      };
    },
  };
}

export default defineConfig({
  define: {
    CHECKOUT_KIT_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
  plugins: [injectCdnChunkUrls()],
  build: {
    target: browserslistToEsbuild(),
    sourcemap: true,
    minify: true,
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('./dist-cdn', import.meta.url)),
    lib: {
      entry: {
        'web-components': fileURLToPath(new URL('./src/cdn-loader.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [],
      output: {
        minify: {
          compress: true,
          mangle: true,
          codegen: true,
        },
        // Registration modules share a filename; name chunks after their component.
        chunkFileNames: (chunk) => {
          const component = chunk.facadeModuleId?.match(/\/components\/([^/]+)\/register\.ts$/)?.[1];
          return `assets/${component ?? '[name]'}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
