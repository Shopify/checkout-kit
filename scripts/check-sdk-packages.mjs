#!/usr/bin/env node
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const runtimeDependencyFields = ['dependencies', 'optionalDependencies', 'peerDependencies'];
const publicPlatforms = ['web', 'react-native'];
// Third-party runtime dependencies each platform may declare, and the fields
// that may declare them. Anything else needs an approved proposal; see
// .github/ARCHITECTURE.md#runtime-dependencies.
const allowedThirdPartyRuntimeDependencies = {
  web: {},
  'react-native': {
    react: ['peerDependencies'],
    'react-native': ['peerDependencies'],
  },
};
const runtimeDependencyPolicy = '.github/ARCHITECTURE.md#runtime-dependencies';

function manifests(root, errors, platforms) {
  const packages = [];
  const add = (path, platform, isPublic = false) => {
    const file = join(root, path, 'package.json');
    if (!existsSync(file)) { errors.push(`${path}: missing package manifest`); return; }
    packages.push({path, file, platform, isPublic, data: JSON.parse(readFileSync(file, 'utf8'))});
  };
  for (const platform of platforms) {
    add(`platforms/${platform}`, platform, true);
    for (const area of ['components', 'internal']) {
      const base = `platforms/${platform}/${area}`;
      if (!existsSync(join(root, base))) continue;
      for (const child of readdirSync(join(root, base), {withFileTypes: true})) {
        if (child.isDirectory()) add(`${base}/${child.name}`, platform);
      }
    }
  }
  // The current shared TypeScript core is consumed by Web. Its manifest is
  // internal and participates in Web dependency checks, never released on its own.
  const shared = 'platforms/shared/typescript';
  if (platforms.includes('web') && existsSync(join(root, shared))) {
    for (const child of readdirSync(join(root, shared), {withFileTypes: true})) {
      if (child.isDirectory()) add(`${shared}/${child.name}`, 'web');
    }
  }
  return packages;
}

// Pass platforms to check one platform's manifests, e.g. from its own build.
export function inspectSdkPackages(root, allowed = allowedThirdPartyRuntimeDependencies, platforms = publicPlatforms) {
  const errors = [];
  const unknown = platforms.filter(platform => !publicPlatforms.includes(platform));
  if (unknown.length) throw new Error(`Unknown SDK platform: ${unknown.join(', ')}`);
  const packages = manifests(root, errors, platforms);
  const byName = new Map();
  const peerRanges = new Map();
  for (const pkg of packages) {
    if (byName.has(pkg.data.name)) errors.push(`${pkg.path}: duplicate package name ${pkg.data.name}`);
    byName.set(pkg.data.name, pkg);
  }
  for (const pkg of packages) {
    const fail = message => errors.push(`${pkg.path}: ${message}`);
    if (pkg.isPublic) {
      if (pkg.data.private === true) fail('the SDK umbrella must be publishable');
    } else {
      if (pkg.data.private !== true) fail('component and internal packages must be private');
      if (!pkg.data.exports || Object.keys(pkg.data.exports).length === 0) fail('declare exports for the package boundary');
    }
    for (const field of runtimeDependencyFields) {
      for (const [name, version] of Object.entries(pkg.data[field] ?? {})) {
        const dependency = byName.get(name);
        if (!dependency && !version.startsWith('workspace:')) {
          const allowedFields = allowed[pkg.platform]?.[name];
          if (!allowedFields) {
            fail(`${field}.${name} is a third-party runtime dependency, which ${pkg.platform} does not allow; see ${runtimeDependencyPolicy}. Test and build tooling belongs in devDependencies`);
          } else if (!allowedFields.includes(field)) {
            fail(`${field}.${name} must be declared in ${allowedFields.join(' or ')}; see ${runtimeDependencyPolicy}`);
          } else if (field === 'peerDependencies') {
            // The host supplies peers, so each platform must ask for one range.
            const key = `${pkg.platform}\0${name}`;
            const ranges = peerRanges.get(key) ?? new Map();
            ranges.set(version, [...(ranges.get(version) ?? []), pkg.path]);
            peerRanges.set(key, ranges);
          } else if (!version.startsWith('catalog:')) {
            fail(`${field}.${name} must use "catalog:" so the platform's pnpm-workspace.yaml defines its version once; see ${runtimeDependencyPolicy}`);
          }
          continue;
        }
        if (!dependency) {
          // Workspace packages outside the SDK directories may also be private.
          // Do not expose them to consumers without checking their boundary.
          if (pkg.isPublic && version.startsWith('workspace:')) {
            fail(`${field} references unrecognized workspace package ${name}; add its manifest to the boundary checks before exposing it to consumers`);
          }
          continue;
        }
        if (pkg.isPublic && !dependency.isPublic) fail(`${field} must not make consumers install private package ${name}; bundle it at build time`);
        if (!pkg.isPublic && dependency.isPublic) fail(`private packages must not depend on the umbrella ${name}`);
        if (pkg.path.includes('/internal/') && dependency.path.includes('/components/')) fail(`internal packages must not depend on component ${name}`);
        if (pkg.platform !== dependency.platform) fail(`native and Web packages must not depend on each other's implementations: ${name}`);
      }
    }
  }
  for (const [key, ranges] of peerRanges) {
    if (ranges.size < 2) continue;
    const [platform, name] = key.split('\0');
    const declared = [...ranges].map(([range, paths]) => `${range} (${paths.join(', ')})`).join('; ');
    errors.push(`${platform}: peerDependencies.${name} must use the same range in every package: ${declared}`);
  }
  return {errors, checked: packages.length};
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const platforms = process.argv.slice(2);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = inspectSdkPackages(root, undefined, platforms.length ? platforms : publicPlatforms);
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Checked ${result.checked} SDK package manifests: package boundaries and runtime dependencies are valid.`);
}
