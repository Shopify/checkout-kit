import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = new URL('..', import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL('package.json', root), 'utf8'),
);
const privatePackages = Object.entries(manifest.devDependencies)
  .filter(
    ([name, version]) =>
      version === 'workspace:*' && !manifest.bundledDependencies.includes(name),
  )
  .map(([name]) => name);
let files = 0;
async function verify(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await verify(file);
      continue;
    }
    if (!/\.(cjs|js|ts|tsx)$/.test(file)) continue;
    files++;
    const contents = await readFile(file, 'utf8');
    const parsed = ts.createSourceFile(
      file,
      contents,
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (
        ts.isStringLiteral(node) &&
        privatePackages.some(
          name => node.text === name || node.text.startsWith(`${name}/`),
        )
      ) {
        throw new Error(
          `Published file references an unpublished package: ${file}: ${node.text}`,
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
  }
}
for (const entry of [
  manifest.main,
  manifest.module,
  manifest.types,
  manifest['react-native'],
]) {
  await readFile(new URL(entry, root));
}
await verify(new URL(manifest.codegenConfig.jsSrcsDir, root).pathname);
await verify(new URL('lib', root).pathname);
console.log(
  `Verified ${files} published source, JavaScript and declaration files`,
);
