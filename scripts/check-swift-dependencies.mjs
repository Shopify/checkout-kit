#!/usr/bin/env node
// Swift SDK consumers must not inherit third-party runtime dependencies.
// See .github/ARCHITECTURE.md#runtime-dependencies.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// External Swift packages that shipped targets may use. Packages used only by
// test targets are test tooling and need no entry.
const allowedRuntimePackages = new Set();
const policy = 'see .github/ARCHITECTURE.md#runtime-dependencies';

export function inspectSwiftPackage(manifest) {
  const errors = [];
  if (!Array.isArray(manifest.targets) || !Array.isArray(manifest.dependencies) || !Array.isArray(manifest.products)) {
    throw new Error('Unexpected swift package dump-package output: missing targets, products, or dependencies');
  }
  const targetsByName = new Map(manifest.targets.map(target => [target.name, target]));
  const localTargets = new Set(targetsByName.keys());
  for (const target of manifest.targets) {
    if (target.type === 'test') continue;
    if (!Array.isArray(target.dependencies)) {
      throw new Error(`Unexpected swift package dump-package output: missing dependencies for ${target.name}`);
    }
    for (const dependency of target.dependencies) {
      if (Array.isArray(dependency.product) && typeof dependency.product[1] === 'string') {
        const packageName = dependency.product[1];
        if (!allowedRuntimePackages.has(packageName.toLowerCase())) {
          errors.push(`Package.swift: target ${target.name} depends on external package ${packageName}, which is not an approved runtime dependency; ${policy}. Test tooling may only be used by test targets`);
        }
      } else if (Array.isArray(dependency.byName) && typeof dependency.byName[0] === 'string') {
        const name = dependency.byName[0];
        if (!localTargets.has(name)) {
          errors.push(`Package.swift: target ${target.name} depends on ${name}, which is not a target in this package; declare external products with .product(name:package:)`);
        }
      } else if (Array.isArray(dependency.target) && typeof dependency.target[0] === 'string') {
        if (!localTargets.has(dependency.target[0])) {
          errors.push(`Package.swift: target ${target.name} depends on unknown local target ${dependency.target[0]}`);
        }
      } else {
        throw new Error(`Unexpected swift package dump-package dependency in target ${target.name}: ${JSON.stringify(dependency)}`);
      }
    }
  }
  // Only binary targets reachable from a published product ship to consumers;
  // a binary used exclusively by tests is test tooling, not a runtime dependency.
  const pending = manifest.products.flatMap(product => product.targets);
  const visited = new Set();
  while (pending.length) {
    const name = pending.pop();
    if (visited.has(name)) continue;
    visited.add(name);
    const target = targetsByName.get(name);
    if (!target) throw new Error(`Package.swift: product depends on unknown target ${name}`);
    if (target.type === 'binary' && target.url) {
      errors.push(`Package.swift: product depends on remote binary target ${name}, which is not an approved runtime dependency; ${policy}`);
    }
    for (const dependency of target.dependencies) {
      const localName = dependency.target?.[0] ?? dependency.byName?.[0];
      if (localTargets.has(localName)) pending.push(localName);
    }
  }
  for (const allowed of allowedRuntimePackages) {
    const declared = manifest.dependencies.some(dependency =>
      dependency.sourceControl?.[0]?.identity === allowed || dependency.fileSystem?.[0]?.identity === allowed);
    if (!declared) errors.push(`Package.swift: approved runtime package ${allowed} is not declared; remove it from the allowed list`);
  }
  return errors;
}

export function inspectPodspec(podspec) {
  const errors = [];
  const uncommented = podspec.replace(/#.*/g, '');
  for (const [, name] of uncommented.matchAll(/\.dependency\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!name.startsWith('ShopifyCheckoutKit/')) {
      errors.push(`ShopifyCheckoutKit.podspec: dependency ${name} is not an approved runtime dependency; ${policy}. Subspecs may depend only on ShopifyCheckoutKit subspecs`);
    }
  }
  return errors;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(execFileSync('swift', ['package', 'dump-package'], {cwd: root, encoding: 'utf8'}));
  const errors = [
    ...inspectSwiftPackage(manifest),
    ...inspectPodspec(readFileSync(join(root, 'ShopifyCheckoutKit.podspec'), 'utf8')),
  ];
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Swift SDK runtime dependencies are valid: shipped targets use no external packages.');
}
