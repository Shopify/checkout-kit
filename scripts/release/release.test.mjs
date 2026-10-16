import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {REPO_ROOT, VERSION_FILES, syncVersions} from './sync-versions.mjs';

const changelog = createRequire(import.meta.url)('./changelog.cjs');

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'checkout-kit-native-versions-'));
  const write = (file, text) => {
    mkdirSync(dirname(join(root, file)), {recursive: true});
    writeFileSync(join(root, file), text);
  };
  const read = file => readFileSync(join(root, file), 'utf8');
  const versions = {swift: '12.34.56-rc.7', android: '21.43.65-beta.2'};
  for (const [platform, version] of Object.entries(versions)) {
    write(`platforms/${platform}/package.json`, JSON.stringify({version, private: true}));
  }
  for (const [, file] of VERSION_FILES) write(file, readFileSync(join(REPO_ROOT, file), 'utf8'));
  try { run({root, write, read, versions}); } finally { rmSync(root, {recursive: true, force: true}); }
}

test('changelog entries contain only the reviewed summary', async () => {
  const line = await changelog.getReleaseLine({summary: 'Fix sheet dismissal.\n\nMigrate with `present()`.', commit: 'abc1234def'}, 'patch');
  assert.equal(line, '\n- Fix sheet dismissal.\n\n  Migrate with `present()`.');
  assert.equal(await changelog.getDependencyReleaseLine([], [], {}), '');
});

test('the changeset command runs only for a known platform', () => {
  const result = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/release/changeset.mjs'), 'ios'], {encoding: 'utf8'});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage: pnpm changeset <swift\|android\|react-native\|web>/);
});

test('each platform writes summary-only changelogs and versions its own SDK package', () => {
  for (const platform of ['swift', 'android', 'react-native', 'web']) {
    const config = JSON.parse(readFileSync(join(REPO_ROOT, `platforms/${platform}/.changeset/config.json`), 'utf8'));
    assert.equal(config.changelog, '../../../scripts/release/changelog.cjs', platform);
  }
  // Changesets doesn't version a workspace's root package unless it is listed.
  for (const platform of ['web', 'react-native']) {
    assert.match(readFileSync(join(REPO_ROOT, `platforms/${platform}/pnpm-workspace.yaml`), 'utf8'), /^\s*-\s*\.\s*$/m, platform);
  }
});

// Releases arrive here already versioned. A workflow that consumed changesets
// again would bump the same notes a second time.
test('no workflow versions packages', () => {
  const dir = join(REPO_ROOT, '.github/workflows');
  for (const file of readdirSync(dir).filter(name => /\.ya?ml$/.test(name))) {
    assert.doesNotMatch(readFileSync(join(dir, file), 'utf8'), /changesets\/action|changeset\b[^\n]*\bversion\b/, file);
  }
});

test('copies all native versions without changing unrelated values', () => fixture(({root, read, write, versions}) => {
  // Expectations are independent of VERSION_FILES and its regular expressions.
  // In particular, losing the user-agent matcher’s global flag must fail here.
  const cases = [
    ['ShopifyCheckoutKit.podspec',
      '  s.version = "1.2.3"\n  s.ios.deployment_target = "15.0"\n',
      `  s.version = "${versions.swift}"\n  s.ios.deployment_target = "15.0"\n`],
    ['platforms/swift/Sources/ShopifyCheckout/ShopifyCheckoutKit.swift',
      '// Compatible with 1.2.3\npublic let version = "1.2.3"\n',
      `// Compatible with 1.2.3\npublic let version = "${versions.swift}"\n`],
    ['platforms/swift/Sources/ShopifyCheckout/MetaData.swift',
      '    package static let version = "1.2.3"\n    package static let wireVersion = "1.2.3"\n',
      `    package static let version = "${versions.swift}"\n    package static let wireVersion = "1.2.3"\n`],
    ['platforms/swift/Tests/ShopifyCheckoutTests/UserAgentTests.swift',
      [
        String.raw`"ShopifyCheckoutKit/1.2.3 (iOS;Swift \(SwiftVersion.current!)) AcceleratedCheckouts"`,
        String.raw`"ShopifyCheckoutKit/1.2.3 (iOS;Swift \(SwiftVersion.current!)) ReactNative AcceleratedCheckouts"`,
        String.raw`"ShopifyCheckoutKit/1.2.3 (iOS;Swift \(SwiftVersion.current!)) ReactNative/0.74.5 AcceleratedCheckouts"`,
        String.raw`"ShopifyCheckoutKit/1.2.3 (iOS;Swift \(SwiftVersion.current!))"`,
        'let otherVersion = "1.2.3"',
      ].join('\n'),
      [
        String.raw`"ShopifyCheckoutKit/${versions.swift} (iOS;Swift \(SwiftVersion.current!)) AcceleratedCheckouts"`,
        String.raw`"ShopifyCheckoutKit/${versions.swift} (iOS;Swift \(SwiftVersion.current!)) ReactNative AcceleratedCheckouts"`,
        String.raw`"ShopifyCheckoutKit/${versions.swift} (iOS;Swift \(SwiftVersion.current!)) ReactNative/0.74.5 AcceleratedCheckouts"`,
        String.raw`"ShopifyCheckoutKit/${versions.swift} (iOS;Swift \(SwiftVersion.current!))"`,
        'let otherVersion = "1.2.3"',
      ].join('\n')],
    ['platforms/android/gradle/libs.versions.toml',
      '[versions]\ncheckoutKitAndroid = "1.2.3"\nembeddedCheckoutProtocolAndroidRelease = "2026.01.01.0"\nembeddedCheckoutProtocolAndroid = "2025.12.01.0"\notherDependency = "1.2.3"\n',
      `[versions]\ncheckoutKitAndroid = "${versions.android}"\nembeddedCheckoutProtocolAndroidRelease = "2026.01.01.0"\nembeddedCheckoutProtocolAndroid = "2025.12.01.0"\notherDependency = "1.2.3"\n`],
  ];
  for (const [file, before] of cases) write(file, before);
  assert.deepEqual(syncVersions({root}).sort(), cases.map(([file]) => file).sort());
  for (const [file, , expected] of cases) assert.equal(read(file), expected, file);
  assert.deepEqual(syncVersions({root, check: true}), []);
  assert.deepEqual(syncVersions({root}), [], 'a second sync is a no-op');
}));

test('check mode reports drift without writing files', () => fixture(({root, read}) => {
  const before = VERSION_FILES.map(([, file]) => read(file));
  assert.throws(() => syncVersions({root, check: true}), /Native versions are out of sync/);
  assert.deepEqual(VERSION_FILES.map(([, file]) => read(file)), before);
}));

test('a missing declaration does not partially update other files', () => fixture(({root, read, write}) => {
  write('platforms/android/gradle/libs.versions.toml', '[versions]\nrenamed = "1.0.0"\n');
  const before = VERSION_FILES.map(([, file]) => read(file));
  assert.throws(() => syncVersions({root}), /version declaration not found/);
  assert.deepEqual(VERSION_FILES.map(([, file]) => read(file)), before);
}));
