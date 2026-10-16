#!/usr/bin/env node
// Runs the Changesets CLI inside one platform, which keeps its own .changeset/
// directory, version, and prerelease mode:
//
//   pnpm changeset <platform> [command] [options]
//
// After `version`, copies the new Swift or Android version into its native
// declarations.
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {REPO_ROOT, syncVersions} from './sync-versions.mjs';

const PLATFORMS = ['swift', 'android', 'react-native', 'web'];
const [platform, ...args] = process.argv.slice(2);
if (!PLATFORMS.includes(platform)) {
  console.error(`Usage: pnpm changeset <${PLATFORMS.join('|')}> [command] [options]`);
  process.exit(2);
}

const cli = join(REPO_ROOT, 'node_modules/.bin/changeset');
const result = spawnSync(cli, args, {cwd: join(REPO_ROOT, 'platforms', platform), stdio: 'inherit'});
if (result.error) {
  console.error(`Cannot run Changesets (${result.error.code}). Run pnpm install first.`);
  process.exit(1);
}
if (result.status === 0 && args[0] === 'version') {
  const updated = syncVersions();
  if (updated.length > 0) console.log(`Updated ${updated.join(', ')}`);
}
process.exit(result.status ?? 1);
