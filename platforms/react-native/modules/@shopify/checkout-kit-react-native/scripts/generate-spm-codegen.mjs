import {spawnSync} from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reactNativeRoot = resolve(moduleRoot, '../../../node_modules/react-native');
const generator = join(
  reactNativeRoot,
  'scripts/generate-codegen-artifacts.js',
);
const committedOutput = join(moduleRoot, 'ios/generated/ReactCodegen');
const temporaryOutput = mkdtempSync(join(tmpdir(), 'checkout-kit-codegen-'));
const check = process.argv.includes('--check');

function listFiles(root, relative = '') {
  const directory = join(root, relative);

  return readdirSync(directory).flatMap(name => {
    const child = join(relative, name);
    return statSync(join(root, child)).isDirectory()
      ? listFiles(root, child)
      : [child];
  });
}

function outputsMatch(actual, expected) {
  const actualFiles = listFiles(actual);
  const expectedFiles = listFiles(expected);

  return (
    actualFiles.length === expectedFiles.length &&
    actualFiles.every(
      (file, index) =>
        file === expectedFiles[index] &&
        readFileSync(join(actual, file)).equals(
          readFileSync(join(expected, file)),
        ),
    )
  );
}

function normalizeGeneratedOutput(root) {
  for (const file of listFiles(root)) {
    const path = join(root, file);
    const contents = readFileSync(path, 'utf8');
    writeFileSync(path, contents.replace(/[ \t]+$/gm, ''));
  }
}

try {
  const result = spawnSync(
    process.execPath,
    [
      generator,
      '--path',
      moduleRoot,
      '--targetPlatform',
      'ios',
      '--outputPath',
      temporaryOutput,
      '--source',
      'library',
    ],
    {stdio: 'inherit'},
  );

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    const generatedOutput = join(temporaryOutput, 'ReactCodegen');
    normalizeGeneratedOutput(generatedOutput);

    if (check) {
      if (!outputsMatch(generatedOutput, committedOutput)) {
        console.error(
          'Committed iOS Codegen output is stale. Run `pnpm codegen:ios`.',
        );
        process.exitCode = 1;
      }
    } else {
      rmSync(committedOutput, {recursive: true, force: true});
      cpSync(generatedOutput, committedOutput, {recursive: true});
    }
  }
} finally {
  rmSync(temporaryOutput, {recursive: true, force: true});
}
