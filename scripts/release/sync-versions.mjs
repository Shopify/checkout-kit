#!/usr/bin/env node
// Changesets only writes package.json. Copy native manifest versions into the
// existing SDK declarations (and the Swift user-agent test fixture).
// --check verifies them without writing. Docs and CocoaPods locks stay manual.
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const VERSION_FILES = [
  ['swift', 'ShopifyCheckoutKit.podspec', /(^\s*s\.version\s*=\s*")[^"]+(?=")/gm],
  ['swift', 'platforms/swift/Sources/ShopifyCheckout/ShopifyCheckoutKit.swift', /(^public let version = ")[^"]+(?=")/gm],
  ['swift', 'platforms/swift/Sources/ShopifyCheckout/MetaData.swift', /(^\s*package static let version = ")[^"]+(?=")/gm],
  ['swift', 'platforms/swift/Tests/ShopifyCheckoutTests/UserAgentTests.swift', /("ShopifyCheckoutKit\/)[^ "\n]+(?= \()/g],
  ['android', 'platforms/android/gradle/libs.versions.toml', /(^checkoutKitAndroid = ")[^"]+(?=")/gm],
];

export function syncVersions({root = REPO_ROOT, check = false} = {}) {
  const versions = {};
  for (const platform of ['swift', 'android']) {
    versions[platform] = JSON.parse(readFileSync(join(root, `platforms/${platform}/package.json`), 'utf8')).version;
  }

  // Validate every target before writing, so a renamed declaration cannot
  // leave partially updated native copies. Never replace unrelated versions.
  const updates = [];
  for (const [platform, file, pattern] of VERSION_FILES) {
    const source = readFileSync(join(root, file), 'utf8');
    let matches = 0;
    const updated = source.replace(pattern, (_, prefix) => {
      matches += 1;
      return prefix + versions[platform];
    });
    if (matches === 0) throw new Error(`${file}: version declaration not found; update the native version adapter.`);
    if (updated !== source) updates.push({file, updated});
  }
  if (check && updates.length > 0) {
    throw new Error(`Native versions are out of sync: ${updates.map(({file}) => file).join(', ')}. Run node scripts/release/sync-versions.mjs.`);
  }
  for (const {file, updated} of updates) writeFileSync(join(root, file), updated);
  return updates.map(({file}) => file);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const updated = syncVersions({check: process.argv.includes('--check')});
    console.log(updated.length ? `Updated ${updated.join(', ')}` : 'Native version declarations match their manifests.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
