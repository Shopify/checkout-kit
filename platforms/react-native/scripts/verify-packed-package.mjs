import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {after, before, test} from 'node:test';

const require = createRequire(import.meta.url);
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const Metro = require('metro');
const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
let consumer;
let installed;

before(async () => {
  consumer = await realpath(
    await mkdtemp(join(tmpdir(), 'checkout-kit-package-')),
  );
  installed = join(consumer, 'node_modules', manifest.name);
  await mkdir(installed, {recursive: true});
  const packed = JSON.parse(
    execFileSync('pnpm', ['pack', '--pack-destination', consumer, '--json'], {
      cwd: root,
      encoding: 'utf8',
    }),
  );
  execFileSync('tar', [
    '-xzf',
    packed.filename,
    '--strip-components=1',
    '-C',
    installed,
  ]);
  // Only link the consumer's peers and type packages. No workspace package is
  // available to the installed SDK, even though the test runs inside the repo.
  for (const name of ['react', 'react-native', '@babel/runtime', '@types']) {
    await mkdir(dirname(join(consumer, 'node_modules', name)), {
      recursive: true,
    });
    await symlink(
      join(root, 'node_modules', name),
      join(consumer, 'node_modules', name),
    );
  }
  await writeFile(
    join(consumer, 'babel.config.cjs'),
    `module.exports = {presets: [${JSON.stringify(require.resolve('@react-native/babel-preset'))}]};`,
  );
});

after(async () => {
  if (consumer) await rm(consumer, {recursive: true, force: true});
});

test('packed public declarations work outside the workspace', async () => {
  const fixture = await readFile(
    join(root, 'test/package-consumer/index.tsx'),
    'utf8',
  );
  await writeFile(
    join(consumer, 'index.tsx'),
    fixture.replaceAll("'../..'", `'${manifest.name}'`),
  );
  await writeFile(
    join(consumer, 'tsconfig.json'),
    await readFile(join(root, 'test/package-consumer/tsconfig.json')),
  );
  execFileSync(
    process.execPath,
    [require.resolve('typescript/bin/tsc'), '-p', consumer],
    {
      encoding: 'utf8',
      stdio: 'pipe',
    },
  );
});

test('packed native specs remain valid codegen inputs', async () => {
  const output = join(consumer, 'schema.json');
  execFileSync(process.execPath, [
    require.resolve(
      '@react-native/codegen/lib/cli/combine/combine-js-to-schema-cli.js',
    ),
    output,
    join(installed, manifest.codegenConfig.jsSrcsDir),
  ]);
  const schema = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(schema.modules.NativeShopifyCheckoutKit.type, 'NativeModule');
  assert.equal(schema.modules.RCTAcceleratedCheckoutButtons.type, 'Component');
});

test('packed CommonJS entry loads without transforming package sources', async () => {
  const fixture = join(consumer, 'commonjs.cjs');
  await writeFile(
    fixture,
    await readFile(join(root, 'test/package-consumer/commonjs.cjs')),
  );
  execFileSync(process.execPath, ['--no-experimental-strip-types', fixture], {
    cwd: consumer,
    encoding: 'utf8',
    stdio: 'pipe',
  });
});

for (const platform of ['ios', 'android']) {
  for (const [field, dev] of [
    ['react-native', true],
    ['main', false],
  ]) {
    test(`Metro bundles the packed ${field} entry for ${platform} (dev=${dev})`, async () => {
      const config = mergeConfig(getDefaultConfig(consumer), {
        projectRoot: consumer,
        watchFolders: [consumer, join(root, 'node_modules')],
        maxWorkers: 1,
        resolver: {useWatchman: false},
        reporter: {update() {}},
      });
      const result = await Metro.runBuild(config, {
        entry: join(installed, manifest[field]),
        platform,
        dev,
        minify: !dev,
      });
      assert.match(result.code, /RCTAcceleratedCheckoutButtons/);
      assert.match(result.code, /ShopifyCheckoutKit/);
    });
  }
}
