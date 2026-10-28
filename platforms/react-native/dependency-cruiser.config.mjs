export default {
  forbidden: [
    {
      name: 'no-runtime-cycles',
      severity: 'error',
      from: {},
      to: {circular: true, viaOnly: {dependencyTypesNot: ['type-only']}},
    },
    {
      name: 'components-do-not-import-umbrella',
      severity: 'error',
      from: {path: '^components/'},
      to: {path: '^src/'},
    },
    {
      name: 'core-does-not-import-components',
      severity: 'error',
      from: {path: '^internal/'},
      to: {path: '^(src|components)/'},
    },
    {
      name: 'use-core-exports',
      comment:
        'Imports from outside core must use its declared package exports.',
      severity: 'error',
      from: {pathNot: '^internal/core/'},
      to: {path: '^internal/core/', dependencyTypes: ['local']},
    },
    {
      name: 'checkout-is-independent-of-accelerated',
      severity: 'error',
      from: {path: '^components/shopify-checkout/'},
      to: {path: '^components/shopify-accelerated-checkouts/'},
    },
    {
      name: 'use-checkout-entrypoints',
      severity: 'error',
      from: {pathNot: '^components/shopify-checkout/'},
      to: {
        path: '^components/shopify-checkout/src/',
        pathNot: '^components/shopify-checkout/src/(index.ts|context.tsx)$',
      },
    },
    {
      name: 'use-accelerated-entrypoint',
      severity: 'error',
      from: {pathNot: '^components/shopify-accelerated-checkouts/'},
      to: {
        path: '^components/shopify-accelerated-checkouts/src/',
        pathNot: '^components/shopify-accelerated-checkouts/src/index.tsx$',
      },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {path: 'node_modules'},
    tsConfig: {fileName: 'tsconfig.json'},
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
