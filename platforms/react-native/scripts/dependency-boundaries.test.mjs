import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const platform = fileURLToPath(new URL('../', import.meta.url));
const declarations = 'export const value = 1; export type Value = number;\n';

test('React Native dependency boundaries', async t => {
  const root = mkdtempSync(join(tmpdir(), 'checkout-kit-rn-boundaries-'));
  const write = (path, contents) => {
    mkdirSync(dirname(join(root, path)), {recursive: true});
    writeFileSync(join(root, path), contents);
  };
  const workspace = (directory, name, exports) => {
    write(
      `${directory}/package.json`,
      JSON.stringify({name, type: 'module', exports}),
    );
    mkdirSync(join(root, 'node_modules/@shopify'), {recursive: true});
    symlinkSync(join(root, directory), join(root, 'node_modules', name), 'dir');
  };
  const cases = [
    [
      'accelerated uses checkout exports',
      'components/shopify-accelerated-checkouts/src/checkout.ts',
      '@shopify/checkout-kit-react-native-checkout',
      [],
    ],
    [
      'accelerated uses checkout context export',
      'components/shopify-accelerated-checkouts/src/context.ts',
      '@shopify/checkout-kit-react-native-checkout/context',
      [],
    ],
    [
      'checkout cannot depend on accelerated',
      'components/shopify-checkout/src/accelerated.ts',
      '@shopify/checkout-kit-react-native-accelerated',
      ['checkout-is-independent-of-accelerated'],
    ],
    [
      'accelerated cannot reach checkout implementation',
      'components/shopify-accelerated-checkouts/src/private.ts',
      '../../shopify-checkout/src/implementation',
      ['use-checkout-entrypoints'],
    ],
    [
      'checkout uses its own implementation',
      'components/shopify-checkout/src/local.ts',
      './implementation',
      [],
    ],
    [
      'component uses core exports',
      'components/shopify-accelerated-checkouts/src/core.ts',
      '@shopify/checkout-kit-react-native-core/configuration',
      [],
    ],
    [
      'component cannot bypass core exports',
      'components/shopify-accelerated-checkouts/src/relative-core.ts',
      '../../../internal/core/src/configuration',
      ['use-core-exports'],
    ],
    [
      'core uses its own implementation',
      'internal/core/src/local.ts',
      './configuration',
      [],
    ],
    [
      'core cannot depend on components',
      'internal/core/src/component.ts',
      '@shopify/checkout-kit-react-native-checkout',
      ['core-does-not-import-components'],
    ],
    [
      'component cannot import umbrella',
      'components/shopify-accelerated-checkouts/src/umbrella.ts',
      '../../../src/public',
      ['components-do-not-import-umbrella'],
    ],
    [
      'type-only imports respect core boundaries',
      'components/shopify-accelerated-checkouts/src/core-type.ts',
      '../../../internal/core/src/configuration',
      ['use-core-exports'],
      true,
    ],
    [
      'type-only imports respect feature direction',
      'components/shopify-checkout/src/accelerated-type.ts',
      '@shopify/checkout-kit-react-native-accelerated',
      ['checkout-is-independent-of-accelerated'],
      true,
    ],
  ];

  try {
    copyFileSync(
      join(platform, 'dependency-cruiser.config.mjs'),
      join(root, 'dependency-cruiser.config.mjs'),
    );
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react',
        },
      }),
    );
    workspace(
      'components/shopify-checkout',
      '@shopify/checkout-kit-react-native-checkout',
      {'.': './src/index.ts', './context': './src/context.tsx'},
    );
    workspace(
      'components/shopify-accelerated-checkouts',
      '@shopify/checkout-kit-react-native-accelerated',
      {'.': './src/index.tsx'},
    );
    workspace('internal/core', '@shopify/checkout-kit-react-native-core', {
      './configuration': './src/configuration.ts',
    });
    for (const path of [
      'src/public.ts',
      'components/shopify-checkout/src/index.ts',
      'components/shopify-checkout/src/context.tsx',
      'components/shopify-checkout/src/implementation.ts',
      'components/shopify-accelerated-checkouts/src/index.tsx',
      'internal/core/src/configuration.ts',
    ])
      write(path, declarations);
    for (const [, path, specifier, , typeOnly] of cases) {
      write(
        path,
        `export ${typeOnly ? 'type {Value}' : '{value}'} from ${JSON.stringify(specifier)};\n`,
      );
    }
    const cruise = spawnSync(
      process.execPath,
      [
        join(
          platform,
          'node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
        ),
        '--config',
        'dependency-cruiser.config.mjs',
        '--output-type',
        'json',
        ...cases.map(([, path]) => path),
      ],
      {cwd: root, encoding: 'utf8'},
    );
    assert.equal(cruise.status, 0, cruise.stderr);
    const result = JSON.parse(cruise.stdout);
    for (const [name, path, , expected] of cases) {
      await t.test(name, () => {
        const module = result.modules.find(entry => entry.source === path);
        assert.ok(module, `Missing fixture module ${path}`);
        assert.equal(module.dependencies.length, 1);
        assert.equal(
          module.dependencies[0].couldNotResolve,
          false,
          `Unresolved fixture import in ${path}`,
        );
        assert.deepEqual(
          result.summary.violations
            .filter(violation => violation.from === path)
            .map(violation => violation.rule.name)
            .toSorted(),
          expected.toSorted(),
        );
      });
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
