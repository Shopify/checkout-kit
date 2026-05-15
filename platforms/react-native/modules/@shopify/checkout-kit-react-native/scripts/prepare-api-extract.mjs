#!/usr/bin/env node
// Prepares the bob-emitted `lib/typescript/` tree so that @microsoft/api-extractor
// can analyze it.
//
// The module source uses hand-written ambient declaration files (for example,
// `src/index.d.ts` and `src/errors.d.ts`) that runtime sources import via paths
// like `'./index.d'`. tsc preserves those literals when emitting `.d.ts` for the runtime
// modules, but the declaration sources themselves are NOT copied into the output
// tree. The result is that `lib/typescript/src/index.d.ts` imports from
// `'./index.d'`, which TypeScript module resolution resolves back to the same file
// — a self-import that sends api-extractor into infinite recursion.
//
// This script copies each hand-written `.d.ts` source into the output tree under
// a non-colliding name (e.g. `src/_types/index.d.ts`) and rewrites the imports in
// the compiled outputs to point at the relocated files.

import {readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const MODULE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = join(MODULE_ROOT, 'src');
const LIB_SRC_DIR = join(MODULE_ROOT, 'lib', 'typescript', 'src');
const RELOCATED_DIR = join(LIB_SRC_DIR, '_types');

const DECLARATION_BASENAMES = readdirSync(SRC_DIR)
    .filter(entry => entry.endsWith('.d.ts'))
    .map(entry => entry.slice(0, -'.d.ts'.length));

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...walk(full));
        } else if (full.endsWith('.d.ts')) {
            out.push(full);
        }
    }
    return out;
}

function relocateDeclarations() {
    mkdirSync(RELOCATED_DIR, {recursive: true});
    for (const name of DECLARATION_BASENAMES) {
        const source = join(SRC_DIR, `${name}.d.ts`);
        const target = join(RELOCATED_DIR, `${name}.d.ts`);
        copyFileSync(source, target);
    }
}

function rewriteImports() {
    const allDts = walk(LIB_SRC_DIR);
    for (const filePath of allDts) {
        let contents = readFileSync(filePath, 'utf8');
        let changed = false;
        for (const name of DECLARATION_BASENAMES) {
            const fromDir = dirname(filePath);
            const newTargetWithoutExt = relative(fromDir, join(RELOCATED_DIR, name)).replace(/\\/g, '/');
            const normalized = newTargetWithoutExt.startsWith('.') ? newTargetWithoutExt : `./${newTargetWithoutExt}`;
            const importPattern = new RegExp(`(['"])\\./${name}\\.d\\1`, 'g');
            const replaced = contents.replace(importPattern, `$1${normalized}$1`);
            if (replaced !== contents) {
                contents = replaced;
                changed = true;
            }
        }
        if (changed) {
            writeFileSync(filePath, contents);
        }
    }
}

relocateDeclarations();
rewriteImports();
console.log(`Relocated ${DECLARATION_BASENAMES.length} declaration files to ${relative(MODULE_ROOT, RELOCATED_DIR)} and rewrote imports under ${relative(MODULE_ROOT, LIB_SRC_DIR)}`);
