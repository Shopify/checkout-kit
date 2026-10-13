import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {inspectSdkPackages} from './check-sdk-packages.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'checkout-kit-package-boundaries-'));
  const write = (path, data) => {
    const file = join(root, path, 'package.json');
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, JSON.stringify(data));
  };
  write('platforms/web', {name: '@shopify/checkout-kit', version: '4.0.0'});
  write('platforms/react-native', {name: '@shopify/checkout-kit-react-native', version: '4.0.0', checkoutKit: {nativeSdkVersions: {ios: '3.2.0', android: '3.2.1'}}});
  const component = {name: '@shopify/internal-checkout', version: '0.0.0', private: true, exports: {'.': './src/index.ts'}};
  write('platforms/web/components/shopify-checkout', component);
  try { run({root, write, component}); } finally { rmSync(root, {recursive: true, force: true}); }
}

test('allows private source packages and independently published protocols', () => fixture(({root, write, component}) => {
  write('platforms/web/components/shopify-checkout', {...component, dependencies: {'@shopify/checkout-kit-protocol': 'workspace:*'}});
  write('protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript', {name: '@shopify/checkout-kit-protocol', version: '2026.10.9', private: false});
  assert.deepEqual(inspectSdkPackages(root).errors, []);
}));

test('rejects accidentally publishable components and missing entrypoints', () => fixture(({root, write, component}) => {
  write('platforms/web/components/shopify-checkout', {...component, private: false, exports: {}});
  const errors = inspectSdkPackages(root).errors.join('\n');
  assert.match(errors, /must be private/);
  assert.match(errors, /declare exports/);
}));

test('rejects features with no manifest', () => fixture(({root}) => {
  mkdirSync(join(root, 'platforms/web/components/wallet'));
  assert.match(inspectSdkPackages(root).errors.join('\n'), /wallet: missing package manifest/);
}));

test('rejects private packages in the published dependency graph', () => fixture(({root, write}) => {
  write('platforms/web', {name: '@shopify/checkout-kit', version: '4.0.0', dependencies: {'@shopify/internal-checkout': '4.0.0'}});
  assert.match(inspectSdkPackages(root).errors.join('\n'), /must not make consumers install private package/);
}));

for (const [platform, name] of [['web', '@shopify/checkout-kit'], ['react-native', '@shopify/checkout-kit-react-native']]) {
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    test(`rejects the undiscovered private protocol workspace in ${platform} ${field}`, () => fixture(({root, write}) => {
      write('protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript', {
        name: '@shopify/checkout-kit-protocol', version: '0.0.0', private: true,
      });
      write(`platforms/${platform}`, {name, version: '4.0.0', [field]: {'@shopify/checkout-kit-protocol': 'workspace:*'}});
      const errors = inspectSdkPackages(root).errors;
      assert.equal(errors.length, 1);
      assert.match(errors[0], new RegExp(`platforms/${platform}: ${field} references unrecognized workspace package @shopify/checkout-kit-protocol`));
    }));
  }
}

test('allows private workspaces as build-time dependencies and registry runtime dependencies', () => fixture(({root, write}) => {
  write('protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript', {
    name: '@shopify/checkout-kit-protocol', version: '0.0.0', private: true,
  });
  write('platforms/web', {
    name: '@shopify/checkout-kit', version: '4.0.0',
    devDependencies: {'@shopify/checkout-kit-protocol': 'workspace:*'},
    dependencies: {'some-published-package': '^1.0.0'},
    optionalDependencies: {'some-optional-package': '^1.0.0'},
    peerDependencies: {'some-peer-package': '^1.0.0'},
  });
  assert.deepEqual(inspectSdkPackages(root).errors, []);
}));

test('rejects dependencies from private components back to their umbrella', () => fixture(({root, write, component}) => {
  write('platforms/web/components/shopify-checkout', {...component, dependencies: {'@shopify/checkout-kit': 'workspace:*'}});
  assert.match(inspectSdkPackages(root).errors.join('\n'), /must not depend on the umbrella/);
}));

test('rejects internal dependencies on features and native dependencies on Web implementation', () => fixture(({root, write, component}) => {
  write('platforms/web/internal/telemetry', {...component, name: '@shopify/telemetry', dependencies: {'@shopify/internal-checkout': 'workspace:*'}});
  write('platforms/react-native/internal/bindings', {...component, name: '@shopify/native-bindings', dependencies: {'@shopify/internal-checkout': 'workspace:*'}});
  const errors = inspectSdkPackages(root).errors.join('\n');
  assert.match(errors, /internal packages must not depend on component/);
  assert.match(errors, /must not depend on each other's implementations/);
}));

test('allows public releases without modifying private versions or native pins', () => fixture(({root, write}) => {
  write('platforms/web', {name: '@shopify/checkout-kit', version: '5.0.0'});
  const files = [
    'platforms/web/package.json',
    'platforms/react-native/package.json',
    'platforms/web/components/shopify-checkout/package.json',
  ];
  const before = files.map(file => readFileSync(join(root, file), 'utf8'));
  assert.deepEqual(inspectSdkPackages(root).errors, []);
  assert.deepEqual(files.map(file => readFileSync(join(root, file), 'utf8')), before);
}));

test('rejects duplicate workspace package names', () => fixture(({root, write, component}) => {
  write('platforms/web/components/another-checkout', component);
  assert.match(inspectSdkPackages(root).errors.join('\n'), /duplicate package name/);
}));
